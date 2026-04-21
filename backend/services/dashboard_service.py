import calendar
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import date, timedelta
from domain.models import Sale, Product
from typing import Optional

WEEKDAY_PT = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']


def _revenue_by_product(db, company_id, date_from, date_to, product_ids=None):
    q = db.query(
        Product.id, Product.name,
        func.sum(Sale.total_value).label("revenue"),
        func.sum(Sale.quantity).label("quantity"),
        func.count(Sale.id).label("sale_count"),
        func.count(distinct(Sale.date)).label("days_with_sales"),
    ).join(Sale, Sale.product_id == Product.id).filter(
        Sale.company_id == company_id, Sale.is_deleted == False,
        Product.is_active == True, Sale.date >= date_from, Sale.date <= date_to,
    )
    if product_ids:
        q = q.filter(Product.id.in_(product_ids))
    rows = q.group_by(Product.id, Product.name).all()
    return {
        r.id: {
            "name": r.name, "revenue": float(r.revenue or 0),
            "quantity": int(r.quantity or 0), "sale_count": int(r.sale_count or 0),
            "days_with_sales": int(r.days_with_sales or 0),
        }
        for r in rows
    }


def _compute_score(period_variation, regularity, concentration) -> dict:
    """
    Sprint 5 — Score de Saude 0-100
    Crescimento  (40pts): variation -30..+30 -> 0..40
    Regularidade (30pts): regularity 0..100  -> 0..30
    Concentracao (30pts): lower is better, 30..90% -> 30..0
    """
    v = float(period_variation or 0)
    if v >= 30:
        s_growth = 40
    elif v <= -30:
        s_growth = 0
    else:
        s_growth = round(20 + (v / 30) * 20)

    s_regularity    = round(min(float(regularity or 0), 100) / 100 * 30)

    c = float(concentration or 0)
    if c <= 30:
        s_concentration = 30
    elif c >= 90:
        s_concentration = 0
    else:
        s_concentration = round((90 - c) / 60 * 30)

    total = s_growth + s_regularity + s_concentration

    if total >= 80:
        level, color = "Otimo",   "green"
    elif total >= 60:
        level, color = "Bom",     "blue"
    elif total >= 40:
        level, color = "Regular", "yellow"
    else:
        level, color = "Critico", "red"

    return {
        "score":     total,
        "level":     level,
        "color":     color,
        "breakdown": {
            "growth":        s_growth,
            "regularity":    s_regularity,
            "concentration": s_concentration,
        },
    }


def _build_narrative(total_revenue, prev_revenue, period_variation, top_name, projection) -> str:
    """Sprint 4 — Resumo narrativo em linguagem natural, sem IA."""

    def fmt(v):
        return "R$ {:,.2f}".format(v).replace(",", "X").replace(".", ",").replace("X", ".")

    parts = []

    # Faturamento principal
    base = f"Voce faturou {fmt(total_revenue)} neste periodo"
    if period_variation is not None:
        sign      = "+" if period_variation >= 0 else ""
        direction = "acima" if period_variation >= 0 else "abaixo"
        base     += f", {sign}{period_variation:.1f}% {direction} do periodo anterior."
    else:
        base += "."
    parts.append(base)

    # Produto de destaque
    if top_name:
        parts.append(f"O produto com maior impacto foi {top_name}.")

    # Projecao
    if projection is not None:
        parts.append(f"Se continuar nesse ritmo, fechara o mes em {fmt(projection)}.")

    return " ".join(parts)


class DashboardService:

    # ──────────────────────────────────────────────────────────────────────────
    # ABA 1: RESUMO
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def get_overview(db, company_id, date_from, date_to, product_ids=None):
        period_days = (date_to - date_from).days + 1
        prev_from   = date_from - timedelta(days=period_days)
        prev_to     = date_from - timedelta(days=1)

        def scalar(q):
            return q.scalar() or 0

        def base_filter(q):
            q = q.join(Product, Sale.product_id == Product.id).filter(
                Sale.company_id == company_id, Sale.is_deleted == False,
                Product.is_active == True, Sale.date >= date_from, Sale.date <= date_to,
            )
            if product_ids:
                q = q.filter(Product.id.in_(product_ids))
            return q

        def prev_filter(q):
            q = q.join(Product, Sale.product_id == Product.id).filter(
                Sale.company_id == company_id, Sale.is_deleted == False,
                Product.is_active == True, Sale.date >= prev_from, Sale.date <= prev_to,
            )
            if product_ids:
                q = q.filter(Product.id.in_(product_ids))
            return q

        total_revenue = scalar(base_filter(db.query(func.sum(Sale.total_value))))
        total_qty     = scalar(base_filter(db.query(func.sum(Sale.quantity))))
        sale_count    = scalar(base_filter(db.query(func.count(Sale.id))))
        days_active   = scalar(base_filter(db.query(func.count(distinct(Sale.date)))))
        prev_revenue  = scalar(prev_filter(db.query(func.sum(Sale.total_value))))

        avg_ticket       = total_revenue / sale_count  if sale_count > 0  else 0
        revenue_per_unit = total_revenue / total_qty   if total_qty > 0   else 0
        avg_per_day      = total_revenue / days_active if days_active > 0  else 0
        regularity       = round(days_active / period_days * 100, 1)
        period_var       = round((total_revenue - prev_revenue) / prev_revenue * 100, 1) if prev_revenue > 0 else None

        # Top 5
        top_q = db.query(Product.name,
                         func.sum(Sale.total_value).label("rev"),
                         func.sum(Sale.quantity).label("qty"))\
            .join(Sale, Sale.product_id == Product.id)\
            .filter(Sale.company_id == company_id, Sale.is_deleted == False,
                    Product.is_active == True, Sale.date >= date_from, Sale.date <= date_to)
        if product_ids:
            top_q = top_q.filter(Product.id.in_(product_ids))
        top      = top_q.group_by(Product.id, Product.name)\
                        .order_by(func.sum(Sale.total_value).desc()).limit(5).all()
        top_name = top[0].name if top else None

        # Por dia
        dq = db.query(Sale.date, func.sum(Sale.total_value).label("rev"))\
            .join(Product, Sale.product_id == Product.id)\
            .filter(Sale.company_id == company_id, Sale.is_deleted == False,
                    Product.is_active == True, Sale.date >= date_from, Sale.date <= date_to)
        if product_ids:
            dq = dq.filter(Product.id.in_(product_ids))
        daily = dq.group_by(Sale.date).order_by(Sale.date).all()

        mid         = date_from + timedelta(days=period_days // 2)
        first_half  = sum(float(r.rev or 0) for r in daily if r.date <  mid)
        second_half = sum(float(r.rev or 0) for r in daily if r.date >= mid)
        trend       = round((second_half - first_half) / first_half * 100, 1) if first_half > 0 else None

        wd_totals = [0.0] * 7
        wd_counts = [0]   * 7
        for r in daily:
            wd           = r.date.weekday()
            wd_totals[wd] += float(r.rev or 0)
            wd_counts[wd] += 1
        wd_avg  = [wd_totals[i] / wd_counts[i] if wd_counts[i] > 0 else 0 for i in range(7)]
        best_wd = WEEKDAY_PT[wd_avg.index(max(wd_avg))] if any(wd_avg) else None

        active_products = db.query(Product).filter(
            Product.company_id == company_id, Product.is_active == True
        ).count()

        # ── Sprint 2: Projecao ─────────────────────────────────────────────
        projection = None
        today = date.today()
        if date_from <= today <= date_to and today.day > 1:
            yesterday = today - timedelta(days=1)
            rev_q = db.query(func.sum(Sale.total_value))\
                .join(Product, Sale.product_id == Product.id)\
                .filter(Sale.company_id == company_id, Sale.is_deleted == False,
                        Product.is_active == True,
                        Sale.date >= date_from, Sale.date <= yesterday)
            if product_ids:
                rev_q = rev_q.filter(Product.id.in_(product_ids))
            rev_to_yesterday = float(rev_q.scalar() or 0)
            dias_passados    = today.day - 1
            if dias_passados > 0:
                media_diaria   = rev_to_yesterday / dias_passados
                last_day_month = calendar.monthrange(date_to.year, date_to.month)[1]
                dias_restantes = last_day_month - today.day
                projection     = round(rev_to_yesterday + media_diaria * dias_restantes, 2)

        # ── Sprint 5: Score ────────────────────────────────────────────────
        top3_rev             = sum(float(r.rev or 0) for r in top[:3])
        concentration_score  = round(top3_rev / float(total_revenue) * 100, 1) if total_revenue > 0 else 0
        score                = _compute_score(period_var, regularity, concentration_score)

        # ── Sprint 4: Narrativa ────────────────────────────────────────────
        narrative = _build_narrative(float(total_revenue), float(prev_revenue),
                                     period_var, top_name, projection)

        return {
            "total_revenue":    round(float(total_revenue), 2),
            "total_qty":        int(total_qty),
            "sale_count":       int(sale_count),
            "active_products":  active_products,
            "avg_ticket":       round(avg_ticket, 2),
            "revenue_per_unit": round(revenue_per_unit, 2),
            "avg_per_day":      round(avg_per_day, 2),
            "days_active":      int(days_active),
            "period_days":      period_days,
            "regularity":       regularity,
            "best_weekday":     best_wd,
            "trend":            trend,
            "period_variation": period_var,
            "prev_revenue":     round(float(prev_revenue), 2),
            "projection":       projection,
            "score":            score,      # Sprint 5
            "narrative":        narrative,  # Sprint 4
            "top_products":     [{"name": r.name, "revenue": float(r.rev or 0), "quantity": int(r.qty or 0)} for r in top],
            "weekday_chart":    [{"day": WEEKDAY_PT[i][:3], "media": round(wd_avg[i], 2)} for i in range(7)],
        }

    # ──────────────────────────────────────────────────────────────────────────
    # ABA 2: PRODUTOS
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def get_products_tab(db, company_id, date_from, date_to, product_ids=None):
        period_days = (date_to - date_from).days + 1
        prev_from   = date_from - timedelta(days=period_days)
        prev_to     = date_from - timedelta(days=1)

        rows = db.query(
            Product.id, Product.name,
            func.coalesce(func.sum(Sale.total_value), 0).label("revenue"),
            func.coalesce(func.sum(Sale.quantity),    0).label("quantity"),
            func.coalesce(func.count(Sale.id),        0).label("sale_count"),
            func.coalesce(func.count(distinct(Sale.date)), 0).label("days_with_sales"),
        ).outerjoin(Sale,
            (Sale.product_id == Product.id) & (Sale.is_deleted == False) &
            (Sale.date >= date_from) & (Sale.date <= date_to)
        ).filter(Product.company_id == company_id, Product.is_active == True)
        if product_ids:
            rows = rows.filter(Product.id.in_(product_ids))
        rows = rows.group_by(Product.id, Product.name).all()

        products = [{
            "name":           r.name,
            "revenue":        float(r.revenue),
            "quantity":       int(r.quantity),
            "sale_count":     int(r.sale_count),
            "days_with_sales":int(r.days_with_sales),
            "avg_ticket":     round(float(r.revenue) / int(r.sale_count), 2) if r.sale_count > 0 else 0,
        } for r in rows]

        curr = _revenue_by_product(db, company_id, date_from, date_to, product_ids)
        prev = _revenue_by_product(db, company_id, prev_from, prev_to, product_ids)

        for p in products:
            match      = next((v for v in curr.values() if v["name"] == p["name"]), None)
            prev_match = next((v for v in prev.values() if v["name"] == p["name"]), None)
            if match and prev_match and prev_match["revenue"] > 0:
                p["variation"] = round((match["revenue"] - prev_match["revenue"]) / prev_match["revenue"] * 100, 1)
            else:
                p["variation"] = None

        by_revenue  = sorted(products, key=lambda x: x["revenue"],  reverse=True)
        by_quantity = sorted(products, key=lambda x: x["quantity"], reverse=True)
        no_sales    = [p for p in products if p["revenue"] == 0]
        with_sales  = [p for p in products if p["revenue"] > 0]
        worst       = sorted(with_sales, key=lambda x: x["revenue"])[:5]

        total = sum(p["revenue"] for p in products)
        top3  = sum(p["revenue"] for p in by_revenue[:3])

        return {
            "by_revenue":    by_revenue[:10],
            "by_quantity":   by_quantity[:10],
            "worst":         worst,
            "no_sales":      no_sales,
            "concentration": round(top3 / total * 100, 1) if total > 0 else 0,
            "total_revenue": round(total, 2),
        }

    # ──────────────────────────────────────────────────────────────────────────
    # ABA 3: ALERTAS  (Sprint 1 + Sprint 6)
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def get_alerts(db, company_id, date_from, date_to, product_ids=None):
        period_days = (date_to - date_from).days + 1
        prev_from   = date_from - timedelta(days=period_days)
        prev_to     = date_from - timedelta(days=1)

        curr = _revenue_by_product(db, company_id, date_from, date_to, product_ids)
        prev = _revenue_by_product(db, company_id, prev_from, prev_to, product_ids)

        total_current_rev = sum(v["revenue"] for v in curr.values())

        # Sprint 6: dias restantes do mes corrente
        today = date.today()
        if date_from <= today <= date_to:
            last_day_month = calendar.monthrange(today.year, today.month)[1]
            days_remaining = max(0, last_day_month - today.day)
        else:
            days_remaining = 0

        def loss_proj(daily_loss: float):
            if days_remaining <= 0 or daily_loss <= 0:
                return None
            return {
                "loss_until_month_end": round(daily_loss * days_remaining, 2),
                "annualized":           round(daily_loss * 365, 2),
            }

        drops, growths, stopped, started = [], [], [], []

        for pid in set(curr) | set(prev):
            c    = curr.get(pid)
            p    = prev.get(pid)
            name = (c or p)["name"]

            if c and p and p["revenue"] > 0:
                var    = (c["revenue"] - p["revenue"]) / p["revenue"] * 100
                impact = abs(c["revenue"] - p["revenue"]) >= 50
                share  = round(c["revenue"] / total_current_rev * 100, 1) if total_current_rev > 0 else 0
                diff   = round(c["revenue"] - p["revenue"], 2)
                entry  = {
                    "name":         name,
                    "variation":    round(var, 1),
                    "current":      round(c["revenue"], 2),
                    "previous":     round(p["revenue"], 2),
                    "difference":   diff,
                    "share":        share,
                    "current_qty":  c["quantity"],
                    "previous_qty": p["quantity"],
                }
                if var <= -30 and impact:
                    daily_loss              = abs(diff) / period_days
                    entry["loss_projection"] = loss_proj(daily_loss)
                    drops.append(entry)
                elif var >= 30 and impact:
                    growths.append(entry)

            elif p and not c and p["revenue"] >= 50:
                daily_loss = p["revenue"] / period_days
                stopped.append({
                    "name":            name,
                    "previous":        round(p["revenue"], 2),
                    "current":         0.0,
                    "difference":      round(-p["revenue"], 2),
                    "share":           0.0,
                    "loss_projection": loss_proj(daily_loss),
                })
            elif c and not p and c["revenue"] >= 50:
                share = round(c["revenue"] / total_current_rev * 100, 1) if total_current_rev > 0 else 0
                started.append({
                    "name":       name,
                    "current":    round(c["revenue"], 2),
                    "previous":   0.0,
                    "difference": round(c["revenue"], 2),
                    "share":      share,
                })

        drops.sort(key=lambda x: x["variation"])
        growths.sort(key=lambda x: x["variation"], reverse=True)

        return {
            "period": {
                "current_from":  str(date_from),
                "current_to":    str(date_to),
                "previous_from": str(prev_from),
                "previous_to":   str(prev_to),
            },
            "drops":        drops,
            "growths":      growths,
            "stopped":      stopped,
            "started":      started,
            "total_alerts": len(drops) + len(growths) + len(stopped) + len(started),
        }

    # ──────────────────────────────────────────────────────────────────────────
    # ABA 4: EVOLUCAO
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def get_evolution(db, company_id, date_from, date_to, product_ids=None):
        q = db.query(Sale.date,
                     func.sum(Sale.total_value).label("rev"),
                     func.sum(Sale.quantity).label("qty"))\
            .join(Product, Sale.product_id == Product.id)\
            .filter(Sale.company_id == company_id, Sale.is_deleted == False,
                    Product.is_active == True, Sale.date >= date_from, Sale.date <= date_to)
        if product_ids:
            q = q.filter(Product.id.in_(product_ids))
        daily = q.group_by(Sale.date).order_by(Sale.date).all()

        running = 0.0
        result  = []
        for r in daily:
            running += float(r.rev or 0)
            result.append({
                "date":       str(r.date),
                "revenue":    round(float(r.rev or 0), 2),
                "quantity":   int(r.qty or 0),
                "cumulative": round(running, 2),
            })

        from collections import defaultdict
        weeks: dict = defaultdict(lambda: {"revenue": 0.0, "quantity": 0})
        for r in daily:
            wk = f"{r.date.isocalendar()[0]}-S{r.date.isocalendar()[1]:02d}"
            weeks[wk]["revenue"]  += float(r.rev or 0)
            weeks[wk]["quantity"] += int(r.qty or 0)
        weekly = [{"week": k, "revenue": round(v["revenue"], 2), "quantity": v["quantity"]}
                  for k, v in sorted(weeks.items())]

        return {"daily": result, "weekly": weekly}

    # ──────────────────────────────────────────────────────────────────────────
    # ABA 5: TABELA
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def get_table(db, company_id, date_from, date_to, product_ids=None):
        q = db.query(
            Sale.date,
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            Product.external_id.label("external_id"),
            func.sum(Sale.total_value).label("revenue"),
            func.sum(Sale.quantity).label("quantity"),
            func.count(Sale.id).label("sale_count"),
        ).join(Product, Sale.product_id == Product.id)\
         .filter(Sale.company_id == company_id, Sale.is_deleted == False,
                 Product.is_active == True, Sale.date >= date_from, Sale.date <= date_to)
        if product_ids:
            q = q.filter(Product.id.in_(product_ids))
        rows = q.group_by(Sale.date, Product.id, Product.name, Product.external_id)\
                .order_by(Sale.date.desc(), func.sum(Sale.total_value).desc()).all()

        return {
            "rows": [{
                "date":         str(r.date),
                "weekday":      WEEKDAY_PT[r.date.weekday()],
                "product_id":   r.product_id,
                "product_name": r.product_name,
                "external_id":  r.external_id,
                "revenue":      round(float(r.revenue or 0), 2),
                "quantity":     int(r.quantity or 0),
                "sale_count":   int(r.sale_count or 0),
            } for r in rows],
            "totals": {
                "revenue":  round(sum(float(r.revenue or 0) for r in rows), 2),
                "quantity": sum(int(r.quantity or 0) for r in rows),
            }
        }

    @staticmethod
    def list_products_for_filter(db, company_id):
        return db.query(Product.id, Product.name, Product.external_id)\
                 .filter(Product.company_id == company_id, Product.is_active == True)\
                 .order_by(Product.name).all()
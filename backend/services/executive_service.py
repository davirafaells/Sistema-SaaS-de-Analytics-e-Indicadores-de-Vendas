"""
executive_service.py — Relatorio Executivo Mensal
Sprint 1: Resumo | Sprint 2: Impacto | Sprint 3: Tendencia
Sprint 4: Concentracao | Sprint 5: Dinheiro na Mesa | Sprint 6: Score | Sprint 7: Decisoes
"""
import calendar
import datetime
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from domain.models import Sale, Product, DecisionLog

MONTHS_PT = [
    '', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]


def _month_range(year: int, month: int):
    last = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)

def _prev_month(year: int, month: int):
    return (year - 1, 12) if month == 1 else (year, month - 1)

def _fmt(v: float) -> str:
    return "R$ {:,.2f}".format(abs(v)).replace(",", "X").replace(".", ",").replace("X", ".")

def _total_revenue_month(db, company_id: int, year: int, month: int) -> float:
    d_from, d_to = _month_range(year, month)
    v = db.query(func.sum(Sale.total_value)).join(
        Product, Sale.product_id == Product.id
    ).filter(
        Sale.company_id == company_id, Sale.is_deleted == False,
        Product.is_active == True, Sale.date >= d_from, Sale.date <= d_to,
    ).scalar()
    return float(v or 0)

def _revenue_by_product_month(db, company_id: int, year: int, month: int) -> dict:
    d_from, d_to = _month_range(year, month)
    rows = db.query(
        Product.id, Product.name, func.sum(Sale.total_value).label("revenue"),
    ).join(Sale, Sale.product_id == Product.id).filter(
        Sale.company_id == company_id, Sale.is_deleted == False,
        Product.is_active == True, Sale.date >= d_from, Sale.date <= d_to,
    ).group_by(Product.id, Product.name).all()
    return {r.id: {"name": r.name, "revenue": float(r.revenue or 0)} for r in rows}


# ── Sprint 1 ──────────────────────────────────────────────────────────────────
def get_executive_summary(db: Session, company_id: int, year: int, month: int) -> dict:
    py, pm          = _prev_month(year, month)
    curr_total      = _total_revenue_month(db, company_id, year, month)
    prev_total      = _total_revenue_month(db, company_id, py, pm)
    curr_prods      = _revenue_by_product_month(db, company_id, year, month)
    prev_prods      = _revenue_by_product_month(db, company_id, py, pm)

    deltas = []
    for pid in set(curr_prods) | set(prev_prods):
        c    = curr_prods.get(pid, {}).get("revenue", 0)
        p    = prev_prods.get(pid, {}).get("revenue", 0)
        name = (curr_prods.get(pid) or prev_prods.get(pid))["name"]
        diff = c - p
        if abs(diff) >= 50:
            deltas.append({"id": pid, "name": name, "diff": diff, "current": c, "previous": p})

    deltas.sort(key=lambda x: x["diff"], reverse=True)
    top_pos = [d for d in deltas if d["diff"] > 0][:2]
    top_neg = [d for d in deltas if d["diff"] < 0][:2]

    diff_total = curr_total - prev_total
    diff_pct   = round(diff_total / prev_total * 100, 1) if prev_total > 0 else None

    parts = []
    if diff_total < 0:
        parts.append(f"{MONTHS_PT[month]} fechou em {_fmt(curr_total)} (-{_fmt(abs(diff_total))} vs {MONTHS_PT[pm]}).")
    else:
        parts.append(f"{MONTHS_PT[month]} fechou em {_fmt(curr_total)} (+{_fmt(diff_total)} vs {MONTHS_PT[pm]}).")
    if top_neg:
        parts.append(f"A queda esta concentrada em {' e '.join(d['name'] for d in top_neg)}.")
    if top_pos:
        parts.append(f"{top_pos[0]['name']} compensou parcialmente com +{_fmt(top_pos[0]['diff'])}.")
    if diff_pct is not None:
        if diff_pct <= -15:   parts.append("O resultado indica desaceleracao estrutural relevante.")
        elif diff_pct <= -5:  parts.append("O resultado indica leve desaceleracao.")
        elif diff_pct >= 15:  parts.append("O resultado indica crescimento estrutural forte.")
        elif diff_pct >= 5:   parts.append("O resultado indica crescimento moderado.")
        else:                 parts.append("O resultado indica estabilidade no periodo.")

    return {
        "month": month, "year": year, "month_name": MONTHS_PT[month],
        "prev_month": pm, "prev_year": py, "prev_name": MONTHS_PT[pm],
        "current_total": round(curr_total, 2), "prev_total": round(prev_total, 2),
        "diff_absolute": round(diff_total, 2), "diff_pct": diff_pct,
        "top_positive": top_pos, "top_negative": top_neg,
        "narrative": " ".join(parts),
    }


# ── Sprint 2 ──────────────────────────────────────────────────────────────────
def get_product_impact(db: Session, company_id: int, year: int, month: int) -> dict:
    py, pm     = _prev_month(year, month)
    curr_prods = _revenue_by_product_month(db, company_id, year, month)
    prev_prods = _revenue_by_product_month(db, company_id, py, pm)
    curr_total = sum(v["revenue"] for v in curr_prods.values())

    products = []
    for pid in set(curr_prods) | set(prev_prods):
        c    = curr_prods.get(pid, {}).get("revenue", 0)
        p    = prev_prods.get(pid, {}).get("revenue", 0)
        name = (curr_prods.get(pid) or prev_prods.get(pid))["name"]
        diff = round(c - p, 2)
        products.append({
            "name": name, "current": round(c, 2), "previous": round(p, 2),
            "diff": diff,
            "share":   round(c / curr_total * 100, 1) if curr_total > 0 else 0,
            "pct_var": round(diff / p * 100, 1) if p > 0 else None,
        })

    products.sort(key=lambda x: x["diff"])
    lost   = [p for p in products if p["diff"] < -50]
    gained = [p for p in products if p["diff"] > 50]
    return {
        "month_name": MONTHS_PT[month], "prev_name": MONTHS_PT[pm],
        "curr_total": round(curr_total, 2),
        "products":   products, "lost": lost, "gained": gained,
        "total_lost":   round(sum(abs(p["diff"]) for p in lost), 2),
        "total_gained": round(sum(p["diff"] for p in gained), 2),
    }


# ── Sprint 3 ──────────────────────────────────────────────────────────────────
def get_structural_trend(db: Session, company_id: int, year: int, month: int) -> dict:
    months = []
    y, m = year, month
    for _ in range(3):
        months.insert(0, (y, m))
        y, m = _prev_month(y, m)

    rev_per_month = [_revenue_by_product_month(db, company_id, yr, mo) for (yr, mo) in months]
    all_pids      = set().union(*[set(r.keys()) for r in rev_per_month])

    results = []
    for pid in all_pids:
        mrev = [rp.get(pid, {}).get("revenue", 0) for rp in rev_per_month]
        name = next((rp[pid]["name"] for rp in rev_per_month if pid in rp), None)
        if not name or max(mrev) < 50:
            continue

        directions = []
        for i in range(1, 3):
            if mrev[i] > mrev[i-1] + 50:      directions.append("up")
            elif mrev[i] < mrev[i-1] - 50:    directions.append("down")
            else:                              directions.append("flat")

        results.append({
            "name":             name,
            "trending_up":      all(d == "up"   for d in directions),
            "trending_down":    all(d == "down" for d in directions),
            "directions":       directions,
            "monthly":          [{"month_name": MONTHS_PT[mo], "year": yr, "revenue": round(mrev[i], 2),
                                  "diff": round(mrev[i]-mrev[i-1], 2) if i > 0 else None}
                                 for i, (yr, mo) in enumerate(months)],
            "cumulative_loss":  round(mrev[0] - mrev[-1], 2) if mrev[0] > mrev[-1] else 0,
            "cumulative_gain":  round(mrev[-1] - mrev[0],  2) if mrev[-1] > mrev[0]  else 0,
            "last_revenue":     round(mrev[-1], 2),
        })

    results.sort(key=lambda x: (0 if x["trending_down"] else 1 if not x["trending_up"] else 2, -x["cumulative_loss"]))
    falling = [r for r in results if r["trending_down"]]
    rising  = [r for r in results if r["trending_up"]]
    mixed   = [r for r in results if not r["trending_down"] and not r["trending_up"]]

    return {
        "months_analyzed":       [f"{MONTHS_PT[mo]}/{yr}" for (yr, mo) in months],
        "falling": falling, "rising": rising, "mixed": mixed,
        "total_structural_loss": round(sum(r["cumulative_loss"] for r in falling), 2),
    }


# ── Sprint 4 ──────────────────────────────────────────────────────────────────
def get_concentration_risk(db: Session, company_id: int, year: int, month: int) -> dict:
    curr_prods  = _revenue_by_product_month(db, company_id, year, month)
    curr_total  = sum(v["revenue"] for v in curr_prods.values())
    sorted_p    = sorted(curr_prods.values(), key=lambda x: x["revenue"], reverse=True)

    def top_share(n): return round(sum(p["revenue"] for p in sorted_p[:n]) / curr_total * 100, 1) if curr_total > 0 else 0

    top3_share   = top_share(3)
    top5_share   = top_share(5)
    top3_rev     = sum(p["revenue"] for p in sorted_p[:3])
    top5_rev     = sum(p["revenue"] for p in sorted_p[:5])

    # Quantos produtos somam 80%
    acc, n80 = 0, 0
    for p in sorted_p:
        acc += p["revenue"]; n80 += 1
        if curr_total > 0 and acc / curr_total >= 0.80:
            break

    if top3_share >= 80:  risk_level, risk_label = "critical", "Critico"
    elif top3_share >= 60: risk_level, risk_label = "high",    "Alto"
    elif top3_share >= 40: risk_level, risk_label = "medium",  "Moderado"
    else:                  risk_level, risk_label = "low",     "Baixo"

    n5 = min(5, len(sorted_p))
    narrative = (
        f"{top5_share}% do seu faturamento depende de {n5} produtos. "
        f"Se eles cairem 20%, impacto estimado: -{_fmt(round(top5_rev * 0.20, 2))}/mes."
    )

    return {
        "month_name":         MONTHS_PT[month],
        "total_revenue":      round(curr_total, 2),
        "top3_share":         top3_share,
        "top5_share":         top5_share,
        "impact_20pct_top3":  round(top3_rev * 0.20, 2),
        "impact_20pct_top5":  round(top5_rev * 0.20, 2),
        "products_for_80pct": n80,
        "risk_level":         risk_level,
        "risk_label":         risk_label,
        "narrative":          narrative,
        "top_products":       [
            {"name": p["name"], "revenue": round(p["revenue"], 2),
             "share": round(p["revenue"] / curr_total * 100, 1) if curr_total > 0 else 0}
            for p in sorted_p[:8]
        ],
    }


# ── Sprint 5 ──────────────────────────────────────────────────────────────────
def get_money_on_table(db: Session, company_id: int, year: int, month: int) -> dict:
    curr_total = _total_revenue_month(db, company_id, year, month)
    prev_3 = []
    y, m = year, month
    for _ in range(3):
        y, m = _prev_month(y, m)
        prev_3.append((y, m))

    prev_revs   = [_total_revenue_month(db, company_id, yr, mo) for (yr, mo) in prev_3]
    nonzero     = [r for r in prev_revs if r > 0]
    if not nonzero:
        return {"has_data": False, "month_name": MONTHS_PT[month]}

    avg_3m = round(sum(nonzero) / len(nonzero), 2)
    diff   = round(avg_3m - curr_total, 2)

    narrative = None
    if diff > 50:
        narrative = f"Voce deixou {_fmt(diff)} na mesa comparado a sua media recente de {_fmt(avg_3m)}/mes."
    elif diff < -50:
        narrative = f"Voce superou sua media recente em +{_fmt(abs(diff))} este mes."

    return {
        "has_data":       True,
        "month_name":     MONTHS_PT[month],
        "current_total":  round(curr_total, 2),
        "avg_3m":         avg_3m,
        "diff":           diff,
        "is_below_avg":   diff > 0,
        "narrative":      narrative,
        "monthly_detail": [
            {"month_name": MONTHS_PT[mo], "year": yr, "revenue": round(rev, 2)}
            for (yr, mo), rev in zip(prev_3, prev_revs)
        ],
    }


# ── Sprint 6 ──────────────────────────────────────────────────────────────────
def get_monthly_score(db: Session, company_id: int, year: int, month: int) -> dict:
    py, pm     = _prev_month(year, month)
    curr_total = _total_revenue_month(db, company_id, year, month)
    prev_total = _total_revenue_month(db, company_id, py, pm)

    # Crescimento vs mes anterior (0-35)
    if prev_total > 0:
        g = (curr_total - prev_total) / prev_total * 100
        s_growth   = 35 if g >= 15 else 28 if g >= 5 else 20 if g >= -5 else 10 if g >= -15 else 0
        growth_pct = round(g, 1)
    else:
        s_growth, growth_pct = 20, None

    # Tendencia 3 meses (0-30)
    mths = []
    y, m = year, month
    for _ in range(3):
        mths.insert(0, (y, m))
        y, m = _prev_month(y, m)
    revs = [_total_revenue_month(db, company_id, yr, mo) for (yr, mo) in mths]
    if revs[0] > 0 and revs[2] > 0:
        t = (revs[2] - revs[0]) / revs[0] * 100
        s_trend   = 30 if t >= 10 else 22 if t >= 0 else 12 if t >= -10 else 0
        trend_pct = round(t, 1)
    else:
        s_trend, trend_pct = 15, None

    # Concentracao (0-20)
    curr_prods  = _revenue_by_product_month(db, company_id, year, month)
    sorted_p    = sorted(curr_prods.values(), key=lambda x: x["revenue"], reverse=True)
    top3_rev    = sum(p["revenue"] for p in sorted_p[:3])
    top3_share  = (top3_rev / curr_total * 100) if curr_total > 0 else 0
    s_conc      = 20 if top3_share <= 30 else 15 if top3_share <= 50 else 8 if top3_share <= 70 else 0

    # Queda estrutural (0-15)
    trend_data  = get_structural_trend(db, company_id, year, month)
    n_falling   = len(trend_data["falling"])
    s_stability = 15 if n_falling == 0 else 10 if n_falling <= 1 else 5 if n_falling <= 3 else 0

    total = s_growth + s_trend + s_conc + s_stability
    if total >= 80:   cl, color = "Saudavel", "green"
    elif total >= 60: cl, color = "Atencao",  "blue"
    elif total >= 40: cl, color = "Alerta",   "yellow"
    else:             cl, color = "Risco",    "red"

    return {
        "score": total, "classification": cl, "color": color,
        "month_name": MONTHS_PT[month],
        "breakdown": {
            "growth":        {"score": s_growth,     "max": 35, "label": "Crescimento vs mes anterior"},
            "trend":         {"score": s_trend,      "max": 30, "label": "Tendencia 3 meses"},
            "concentration": {"score": s_conc,       "max": 20, "label": "Diversificacao de produtos"},
            "stability":     {"score": s_stability,  "max": 15, "label": "Produtos sem queda estrutural"},
        },
        "growth_pct": growth_pct, "trend_pct": trend_pct,
        "top3_share": round(top3_share, 1), "n_falling": n_falling,
    }


# ── Sprint 7 ──────────────────────────────────────────────────────────────────
def get_decisions_monthly_eval(db: Session, company_id: int, year: int, month: int) -> dict:
    d_from, d_to = _month_range(year, month)
    logs = db.query(DecisionLog).filter(
        DecisionLog.company_id    == company_id,
        DecisionLog.decision_date >= d_from,
        DecisionLog.decision_date <= d_to,
    ).order_by(DecisionLog.decision_date.desc()).all()

    today    = date.today()
    evaluated = []

    for log in logs:
        product_name = None
        if log.product_id:
            p = db.query(Product).filter(Product.id == log.product_id).first()
            if p: product_name = p.name

        impact = None
        days_since = (today - log.decision_date).days
        if days_since >= 7:
            b_start = log.decision_date - datetime.timedelta(days=7)
            b_end   = log.decision_date
            a_start = log.decision_date + datetime.timedelta(days=1)
            a_end   = log.decision_date + datetime.timedelta(days=7)

            def daily_avg(df, dt):
                q = db.query(func.sum(Sale.total_value)).join(
                    Product, Sale.product_id == Product.id
                ).filter(
                    Sale.company_id == company_id, Sale.is_deleted == False,
                    Sale.date >= df, Sale.date <= dt,
                )
                if log.product_id:
                    q = q.filter(Sale.product_id == log.product_id)
                return round(float((q.scalar() or 0)) / 7, 2)

            avg_before = daily_avg(b_start, b_end)
            avg_after  = daily_avg(a_start, a_end)
            diff       = round(avg_after - avg_before, 2)

            impact = {
                "avg_before":   avg_before,
                "avg_after":    avg_after,
                "daily_diff":   diff,
                "total_impact": round(diff * 7, 2),
                "pct_change":   round(diff / avg_before * 100, 1) if avg_before > 0 else None,
                "is_positive":  diff >= 0,
                "days_since":   days_since,
            }

        evaluated.append({
            "id": log.id, "description": log.description,
            "action_type": log.action_type, "product_name": product_name,
            "decision_date": str(log.decision_date), "impact": impact,
        })

    return {
        "month_name":            MONTHS_PT[month],
        "decisions":             evaluated,
        "total_decisions":       len(evaluated),
        "evaluated_count":       sum(1 for e in evaluated if e["impact"]),
        "total_positive_impact": round(sum(e["impact"]["total_impact"] for e in evaluated if e["impact"] and e["impact"]["total_impact"] > 0), 2),
        "total_negative_impact": round(sum(e["impact"]["total_impact"] for e in evaluated if e["impact"] and e["impact"]["total_impact"] < 0), 2),
    }
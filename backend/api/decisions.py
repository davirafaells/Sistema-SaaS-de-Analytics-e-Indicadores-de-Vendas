from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import List, Optional, Literal
from pydantic import BaseModel
from core.database import get_db
from core.dependencies import get_current_company_id
from domain.models import DecisionLog, Product, Sale

router = APIRouter(prefix="/decisions", tags=["Diario de Decisoes"])

ACTION_TYPES = Literal["promotion", "restock", "price_change", "campaign", "other"]
ACTION_LABELS = {
    "promotion":    "Promocao",
    "restock":      "Reposicao de Estoque",
    "price_change": "Mudanca de Preco",
    "campaign":     "Campanha",
    "other":        "Outro",
}


class DecisionCreate(BaseModel):
    product_id:    Optional[int] = None
    action_type:   ACTION_TYPES = "other"
    description:   str
    decision_date: date


class DecisionResponse(BaseModel):
    id:            int
    product_id:    Optional[int]
    product_name:  Optional[str]
    action_type:   str
    action_label:  str
    description:   str
    decision_date: date
    impact:        Optional[dict] = None  # preenchido se >= 7 dias

    class Config:
        from_attributes = True


# ── Calcula impacto: media 7 dias antes vs 7 dias depois ──────────────────────
def _compute_impact(db: Session, company_id: int,
                    product_id: Optional[int], decision_date: date) -> Optional[dict]:
    today = date.today()
    if (today - decision_date).days < 7:
        return None  # ainda nao tem 7 dias completos apos a decisao

    window_before_end   = decision_date - timedelta(days=1)
    window_before_start = decision_date - timedelta(days=7)
    window_after_start  = decision_date + timedelta(days=1)
    window_after_end    = decision_date + timedelta(days=7)

    def avg_daily(d_from: date, d_to: date) -> float:
        q = db.query(func.sum(Sale.total_value))\
            .join(Product, Sale.product_id == Product.id)\
            .filter(
                Sale.company_id == company_id,
                Sale.is_deleted == False,
                Sale.date >= d_from,
                Sale.date <= d_to,
            )
        if product_id:
            q = q.filter(Sale.product_id == product_id)
        total = float(q.scalar() or 0)
        return round(total / 7, 2)

    before = avg_daily(window_before_start, window_before_end)
    after  = avg_daily(window_after_start,  window_after_end)

    diff         = round(after - before, 2)
    diff_total   = round(diff * 7, 2)
    pct_change   = round((after - before) / before * 100, 1) if before > 0 else None

    return {
        "avg_before":   before,
        "avg_after":    after,
        "daily_diff":   diff,
        "total_impact": diff_total,   # impacto nos 7 dias
        "pct_change":   pct_change,
        "is_positive":  diff >= 0,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[DecisionResponse])
def list_decisions(
    db:         Session = Depends(get_db),
    company_id: int     = Depends(get_current_company_id),
):
    rows = db.query(DecisionLog)\
             .filter(DecisionLog.company_id == company_id)\
             .order_by(DecisionLog.decision_date.desc())\
             .all()

    result = []
    for row in rows:
        product_name = None
        if row.product_id:
            p = db.query(Product).filter(Product.id == row.product_id).first()
            if p:
                product_name = p.name

        impact = _compute_impact(db, company_id, row.product_id, row.decision_date)

        result.append(DecisionResponse(
            id            = row.id,
            product_id    = row.product_id,
            product_name  = product_name,
            action_type   = row.action_type,
            action_label  = ACTION_LABELS.get(row.action_type, row.action_type),
            description   = row.description,
            decision_date = row.decision_date,
            impact        = impact,
        ))

    return result


@router.post("/", response_model=DecisionResponse, status_code=201)
def create_decision(
    data:       DecisionCreate,
    db:         Session = Depends(get_db),
    company_id: int     = Depends(get_current_company_id),
):
    # Valida produto se informado
    if data.product_id:
        product = db.query(Product).filter(
            Product.id == data.product_id,
            Product.company_id == company_id,
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produto nao encontrado.")
        product_name = product.name
    else:
        product_name = None

    log = DecisionLog(
        company_id    = company_id,
        product_id    = data.product_id,
        action_type   = data.action_type,
        description   = data.description,
        decision_date = data.decision_date,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    impact = _compute_impact(db, company_id, log.product_id, log.decision_date)

    return DecisionResponse(
        id            = log.id,
        product_id    = log.product_id,
        product_name  = product_name,
        action_type   = log.action_type,
        action_label  = ACTION_LABELS.get(log.action_type, log.action_type),
        description   = log.description,
        decision_date = log.decision_date,
        impact        = impact,
    )


@router.delete("/{decision_id}", status_code=204)
def delete_decision(
    decision_id: int,
    db:          Session = Depends(get_db),
    company_id:  int     = Depends(get_current_company_id),
):
    log = db.query(DecisionLog).filter(
        DecisionLog.id         == decision_id,
        DecisionLog.company_id == company_id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Decisao nao encontrada.")
    db.delete(log)
    db.commit()
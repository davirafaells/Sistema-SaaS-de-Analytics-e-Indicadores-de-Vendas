"""api/executive.py — Router do Relatorio Executivo Mensal (Sprints 1-7)"""
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_company_id
from services.executive_service import (
    get_executive_summary,
    get_product_impact,
    get_structural_trend,
    get_concentration_risk,
    get_money_on_table,
    get_monthly_score,
    get_decisions_monthly_eval,
)

router = APIRouter(prefix="/executive", tags=["Relatorio Executivo"])


def _resolve(year, month):
    today = date.today()
    if year is None or month is None:
        return (today.year - 1, 12) if today.month == 1 else (today.year, today.month - 1)
    return year, month


@router.get("/summary")
def executive_summary(
    year: int | None = Query(None), month: int | None = Query(None),
    db: Session = Depends(get_db), company_id: int = Depends(get_current_company_id),
):
    y, m = _resolve(year, month)
    return get_executive_summary(db, company_id, y, m)


@router.get("/product-impact")
def product_impact(
    year: int | None = Query(None), month: int | None = Query(None),
    db: Session = Depends(get_db), company_id: int = Depends(get_current_company_id),
):
    y, m = _resolve(year, month)
    return get_product_impact(db, company_id, y, m)


@router.get("/structural-trend")
def structural_trend(
    year: int | None = Query(None), month: int | None = Query(None),
    db: Session = Depends(get_db), company_id: int = Depends(get_current_company_id),
):
    y, m = _resolve(year, month)
    return get_structural_trend(db, company_id, y, m)


@router.get("/concentration-risk")
def concentration_risk(
    year: int | None = Query(None), month: int | None = Query(None),
    db: Session = Depends(get_db), company_id: int = Depends(get_current_company_id),
):
    y, m = _resolve(year, month)
    return get_concentration_risk(db, company_id, y, m)


@router.get("/money-on-table")
def money_on_table(
    year: int | None = Query(None), month: int | None = Query(None),
    db: Session = Depends(get_db), company_id: int = Depends(get_current_company_id),
):
    y, m = _resolve(year, month)
    return get_money_on_table(db, company_id, y, m)


@router.get("/score")
def monthly_score(
    year: int | None = Query(None), month: int | None = Query(None),
    db: Session = Depends(get_db), company_id: int = Depends(get_current_company_id),
):
    y, m = _resolve(year, month)
    return get_monthly_score(db, company_id, y, m)


@router.get("/decisions")
def decisions_eval(
    year: int | None = Query(None), month: int | None = Query(None),
    db: Session = Depends(get_db), company_id: int = Depends(get_current_company_id),
):
    y, m = _resolve(year, month)
    return get_decisions_monthly_eval(db, company_id, y, m)
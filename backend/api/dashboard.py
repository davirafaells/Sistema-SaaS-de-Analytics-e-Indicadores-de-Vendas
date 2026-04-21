from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional
from core.database import get_db
from core.dependencies import get_current_company_id
from services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def default_period():
    today = date.today()
    end   = today.replace(day=1) - timedelta(days=1)
    start = end.replace(day=1)
    return start, end


def resolve(df, dt):
    return default_period() if not df or not dt else (df, dt)


def parse_ids(s: Optional[str]):
    if not s: return None
    try: return [int(x.strip()) for x in s.split(",") if x.strip()]
    except: return None


@router.get("/filter-products")
def filter_products(db=Depends(get_db), company_id=Depends(get_current_company_id)):
    rows = DashboardService.list_products_for_filter(db, company_id)
    return [{"id": r.id, "name": r.name, "external_id": r.external_id} for r in rows]


@router.get("/overview")
def overview(db=Depends(get_db), company_id=Depends(get_current_company_id),
             date_from: date = Query(None), date_to: date = Query(None),
             product_ids: Optional[str] = Query(None)):
    df, dt = resolve(date_from, date_to)
    return DashboardService.get_overview(db, company_id, df, dt, parse_ids(product_ids))


@router.get("/produtos")
def produtos(db=Depends(get_db), company_id=Depends(get_current_company_id),
             date_from: date = Query(None), date_to: date = Query(None),
             product_ids: Optional[str] = Query(None)):
    df, dt = resolve(date_from, date_to)
    return DashboardService.get_products_tab(db, company_id, df, dt, parse_ids(product_ids))


@router.get("/alertas")
def alertas(db=Depends(get_db), company_id=Depends(get_current_company_id),
            date_from: date = Query(None), date_to: date = Query(None),
            product_ids: Optional[str] = Query(None)):
    df, dt = resolve(date_from, date_to)
    return DashboardService.get_alerts(db, company_id, df, dt, parse_ids(product_ids))


@router.get("/evolucao")
def evolucao(db=Depends(get_db), company_id=Depends(get_current_company_id),
             date_from: date = Query(None), date_to: date = Query(None),
             product_ids: Optional[str] = Query(None)):
    df, dt = resolve(date_from, date_to)
    return DashboardService.get_evolution(db, company_id, df, dt, parse_ids(product_ids))


@router.get("/tabela")
def tabela(db=Depends(get_db), company_id=Depends(get_current_company_id),
           date_from: date = Query(None), date_to: date = Query(None),
           product_ids: Optional[str] = Query(None)):
    df, dt = resolve(date_from, date_to)
    return DashboardService.get_table(db, company_id, df, dt, parse_ids(product_ids))


@router.get("/resumo")
def resumo(db=Depends(get_db), company_id=Depends(get_current_company_id),
           date_from: date = Query(None), date_to: date = Query(None)):
    df, dt = resolve(date_from, date_to)
    return DashboardService.get_overview(db, company_id, df, dt)
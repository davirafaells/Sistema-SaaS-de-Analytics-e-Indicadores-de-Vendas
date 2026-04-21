from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from core.database import get_db
from core.dependencies import get_current_company_id
from domain.models import Sale, Product
from schemas.sale import SaleManualCreate, SaleUpdate
from services.sale_service import SaleService

router = APIRouter(prefix="/sales", tags=["Vendas"])


@router.post("/manual")
async def create_manual_sale(
    data: SaleManualCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    return SaleService.create_manual_sale(db, company_id, data)


@router.get("/")
def list_sales(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    product_name: Optional[str] = Query(None),
    limit: int = Query(500),
):
    q = db.query(
        Sale.id,
        Sale.date,
        Sale.value.label("unit_price"),   # ✅ renomeia value → unit_price para o frontend
        Sale.quantity,
        Sale.total_value,
        Product.name.label("product_name"),
    ).join(Product, Sale.product_id == Product.id)\
     .filter(Sale.company_id == company_id, Sale.is_deleted == False)

    if date_from:
        q = q.filter(Sale.date >= date_from)
    if date_to:
        q = q.filter(Sale.date <= date_to)
    if product_name:
        q = q.filter(Product.name.ilike(f"%{product_name}%"))

    rows = q.order_by(Sale.date.desc()).limit(limit).all()

    return [
        {
            "id":           r.id,
            "date":         str(r.date),
            "product_name": r.product_name,
            "quantity":     r.quantity,
            "unit_price":   float(r.unit_price or 0),
            "total_value":  float(r.total_value or 0),
        }
        for r in rows
    ]


@router.put("/{sale_id}")
def update_sale(
    sale_id: int,
    data: SaleUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.company_id == company_id,
        Sale.is_deleted == False
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada.")
    sale.date        = data.date
    sale.value       = data.unit_price   # frontend manda unit_price
    sale.quantity    = data.quantity
    sale.total_value = data.total_value
    db.commit()
    return {"message": "Venda atualizada."}


@router.delete("/{sale_id}")
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.company_id == company_id,
        Sale.is_deleted == False
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada.")
    sale.is_deleted = True
    db.commit()
    return {"message": "Venda excluída."}
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.dependencies import get_current_company_id
from domain.models import Product, Sale
from schemas.report import ProductResponse, SaleResponse

router = APIRouter(prefix="/reports", tags=["Relatórios e Tabelas"])

@router.get("/products", response_model=List[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    products = db.query(Product).filter(Product.company_id == company_id).all()
    return products

@router.get("/sales", response_model=List[SaleResponse])
def list_sales(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id),
    limit: int = 100
):
    sales = db.query(
        Sale.id,
        Sale.date,
        Sale.value,
        Sale.quantity,
        Sale.total_value,              # ✅ BUGFIX: total_value incluído na query
        Product.name.label("product_name")
    ).join(Product, Sale.product_id == Product.id)\
     .filter(Sale.company_id == company_id, Sale.is_deleted == False)\
     .order_by(Sale.date.desc())\
     .limit(limit).all()

    return sales
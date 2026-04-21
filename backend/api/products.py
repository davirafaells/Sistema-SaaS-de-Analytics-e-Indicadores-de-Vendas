from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.dependencies import get_current_company_id
from domain.models import Product
from schemas.product import ProductResponse, ProductUpdate

router = APIRouter(prefix="/products", tags=["Catálogo de Produtos"])


@router.get("/", response_model=List[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    return db.query(Product).filter(
        Product.company_id == company_id
    ).order_by(Product.name).all()


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == company_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    product.name = data.name
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}/toggle", response_model=ProductResponse)
def toggle_product(
    product_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == company_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)
    return product
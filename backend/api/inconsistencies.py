from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from core.database import get_db
from core.dependencies import get_current_company_id
from domain.models import ProductInconsistency, Product
from schemas.inconsistency import InconsistencyResponse, InconsistencyResolve

router = APIRouter(prefix="/inconsistencies", tags=["Inconsistências de Produtos"])


@router.get("/", response_model=List[InconsistencyResponse])
def list_inconsistencies(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    return db.query(ProductInconsistency).filter(
        ProductInconsistency.company_id == company_id,
        ProductInconsistency.resolved == False
    ).order_by(ProductInconsistency.created_at.desc()).all()


@router.post("/{inconsistency_id}/resolve")
def resolve_inconsistency(
    inconsistency_id: int,
    data: InconsistencyResolve,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    inconsistency = db.query(ProductInconsistency).filter(
        ProductInconsistency.id == inconsistency_id,
        ProductInconsistency.company_id == company_id,
        ProductInconsistency.resolved == False
    ).first()

    if not inconsistency:
        raise HTTPException(status_code=404, detail="Inconsistência não encontrada.")

    if data.action == "update":
        # Atualiza o nome do produto existente para o novo nome do CSV
        product = db.query(Product).filter(
            Product.id == inconsistency.product_id,
            Product.company_id == company_id
        ).first()
        if product:
            product.name = inconsistency.new_name

    elif data.action == "remap":
        # Usuário quer que o nome novo pertença a um produto com código diferente
        if not data.new_external_id:
            raise HTTPException(status_code=400, detail="new_external_id é obrigatório para a ação 'remap'.")

        new_external_id = data.new_external_id.strip()

        # Verifica se já existe um produto com esse código para esta empresa
        existing = db.query(Product).filter(
            Product.external_id == new_external_id,
            Product.company_id == company_id
        ).first()

        if existing:
            # Produto com esse código já existe → apenas informa (não duplica)
            # As próximas importações com o novo código já vão para esse produto
            pass
        else:
            # Cria um novo produto com o novo código e o novo nome
            new_product = Product(
                company_id=company_id,
                external_id=new_external_id,
                name=inconsistency.new_name
            )
            db.add(new_product)

    # "keep" e "ignore" → não alteram nada, apenas marcam como resolvido
    inconsistency.resolved = True
    inconsistency.resolution = data.action
    db.commit()

    messages = {
        "keep":   "Nome atual mantido no catálogo.",
        "update": "Nome do produto atualizado.",
        "ignore": "Inconsistência ignorada.",
        "remap":  f"Novo produto criado/associado com código '{data.new_external_id}'.",
    }
    return {"message": messages[data.action]}
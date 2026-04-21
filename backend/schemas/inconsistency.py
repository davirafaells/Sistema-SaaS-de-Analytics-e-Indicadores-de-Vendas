from pydantic import BaseModel
from datetime import datetime
from typing import Literal, Optional


class InconsistencyResponse(BaseModel):
    id: int
    product_id: int
    external_id: str
    current_name: str
    new_name: str
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class InconsistencyResolve(BaseModel):
    action: Literal["keep", "update", "ignore", "remap"]
    # Obrigatório apenas quando action == "remap"
    # Se new_external_id já existe no catálogo → associa as vendas futuras a ele
    # Se não existe → cria novo produto com esse código
    new_external_id: Optional[str] = None
from pydantic import BaseModel
from datetime import date
from decimal import Decimal

class ProductResponse(BaseModel):
    id: int
    external_id: str
    name: str
    is_active: bool

    class Config:
        from_attributes = True

# ✅ BUGFIX: total_value adicionado — SalesList.tsx usava esse campo mas o schema não tinha
class SaleResponse(BaseModel):
    id: int
    date: date
    value: Decimal
    quantity: int
    total_value: Decimal     # ✅ BUGFIX: campo adicionado
    product_name: str

    class Config:
        from_attributes = True
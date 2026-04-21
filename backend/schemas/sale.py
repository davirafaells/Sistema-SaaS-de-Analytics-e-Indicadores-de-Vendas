from pydantic import BaseModel
from datetime import date
from decimal import Decimal


class SaleManualCreate(BaseModel):
    id_produto: str
    nome_produto: str
    data: date
    valor_unitario: Decimal
    quantidade: int
    valor_total: Decimal


# ✅ NOVO: schema para edição de venda
class SaleUpdate(BaseModel):
    date: date
    value: Decimal
    quantity: int
    total_value: Decimal
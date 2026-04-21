from pydantic import BaseModel
from typing import List
from datetime import date
from decimal import Decimal

# Representa um ponto no gráfico de linha (ex: "No dia 24, vendeu R$ 399,80")
class DailySale(BaseModel):
    date: date
    total_value: Decimal

# Representa a visão geral dos números principais (os "Cards" no topo da tela)
class DashboardSummary(BaseModel):
    total_revenue: Decimal      # Faturamento total
    total_sales_count: int      # Quantidade de itens vendidos
    active_products: int        # Produtos ativos no catálogo
    sales_by_date: List[DailySale] # Os dados para o gráfico
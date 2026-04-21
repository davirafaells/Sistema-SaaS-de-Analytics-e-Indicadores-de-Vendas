from pydantic import BaseModel

# Esse schema representa as colunas obrigatórias mapeadas pelo usuário
class MappedColumns(BaseModel):
    id_produto: str
    produto: str
    data: str
    valor: str
    quantidade: str
    valor_total: str # <-- NOSSA NOVA COLUNA AQUI
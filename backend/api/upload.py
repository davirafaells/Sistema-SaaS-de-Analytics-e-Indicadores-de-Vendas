from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_company_id
from schemas.upload import MappedColumns
from services.upload_service import UploadService

router = APIRouter(prefix="/upload", tags=["Upload de Dados"])

@router.post("/")
async def upload_file(
    # Recebe o arquivo em si
    file: UploadFile = File(...),
    
    # Recebe os nomes das colunas mapeadas via formulário
    id_produto: str = Form(...),
    produto: str = Form(...),
    data: str = Form(...),
    valor: str = Form(...),
    quantidade: str = Form(...),
    valor_total: str = Form(...), # <-- NOVO CAMPO ADICIONADO AQUI
    
    # Injeta o banco de dados e pega o ID da empresa do usuário logado
    db: Session = Depends(get_db),
    company_id: int = Depends(get_current_company_id)
):
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Formato inválido. Envie um arquivo .csv ou .xlsx")
    
    columns = MappedColumns(
        id_produto=id_produto,
        produto=produto,
        data=data,
        valor=valor,
        quantidade=quantidade,
        valor_total=valor_total # <-- REPASSANDO O CAMPO PARA O SCHEMA
    )
    
    # Lê os bytes do arquivo de forma assíncrona
    file_bytes = await file.read()
    
    # Manda para o Serviço processar e salvar no banco
    return UploadService.process_file(db, file_bytes, file.filename, columns, company_id)
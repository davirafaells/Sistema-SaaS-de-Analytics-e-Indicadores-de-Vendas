from sqlalchemy.orm import Session
from domain.models import Sale, Product, Upload
from schemas.sale import SaleManualCreate
import hashlib

class SaleService:
    @staticmethod
    def create_manual_sale(db: Session, company_id: int, data: SaleManualCreate):
        # 1. Garante que existe um "contentor" de upload para vendas manuais
        manual_upload = db.query(Upload).filter(
            Upload.company_id == company_id,
            Upload.filename == "Lançamento Manual"
        ).first()

        if not manual_upload:
            manual_upload = Upload(
                company_id=company_id,
                filename="Lançamento Manual",
                file_hash=hashlib.md5(f"manual-{company_id}".encode()).hexdigest()
            )
            db.add(manual_upload)
            db.flush()

        # 2. Busca ou cria o produto no catálogo
        produto = db.query(Product).filter(
            Product.company_id == company_id,
            Product.external_id == data.id_produto
        ).first()

        if not produto:
            produto = Product(
                company_id=company_id,
                external_id=data.id_produto,
                name=data.nome_produto
            )
            db.add(produto)
            db.flush()

        # 3. Regista a venda
        nova_venda = Sale(
            company_id=company_id,
            upload_id=manual_upload.id,
            product_id=produto.id,
            date=data.data,
            value=data.valor_unitario,
            quantity=data.quantidade,
            total_value=data.valor_total
        )
        db.add(nova_venda)
        db.commit()
        return {"message": "Venda registada com sucesso!"}
from sqlalchemy.orm import Session
from domain.models import Upload, Product, Sale

class UploadRepository:
    @staticmethod
    def get_upload_by_hash(db: Session, file_hash: str, company_id: int):
        return db.query(Upload).filter(
            Upload.file_hash == file_hash, 
            Upload.company_id == company_id
        ).first()

    @staticmethod
    def create_upload(db: Session, filename: str, file_hash: str, company_id: int):
        db_upload = Upload(filename=filename, file_hash=file_hash, company_id=company_id)
        db.add(db_upload)
        db.flush()
        return db_upload

    @staticmethod
    def get_or_create_product(db: Session, external_id: str, name: str, company_id: int):
        product = db.query(Product).filter(
            Product.external_id == external_id, 
            Product.company_id == company_id
        ).first()
        
        if not product:
            product = Product(external_id=external_id, name=name, company_id=company_id)
            db.add(product)
            db.flush()
        return product

    @staticmethod
    def create_sale(db: Session, company_id: int, upload_id: int, product_id: int, date, value, quantity, total_value): # ✅ BUGFIX: total_value adicionado
        sale = Sale(
            company_id=company_id,
            upload_id=upload_id,
            product_id=product_id,
            date=date,
            value=value,
            quantity=quantity,
            total_value=total_value  # ✅ BUGFIX: campo passado ao modelo
        )
        db.add(sale)
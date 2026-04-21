import pandas as pd
import io
import hashlib
from fastapi import HTTPException
from sqlalchemy.orm import Session
from domain.models import Upload, Product, Sale, ProductInconsistency
from schemas.upload import MappedColumns


class UploadService:
    @staticmethod
    def process_file(db: Session, file_bytes: bytes, filename: str, columns: MappedColumns, company_id: int):
        # Regra: mesmo arquivo não pode ser importado 2x
        file_hash = hashlib.md5(file_bytes).hexdigest()
        if db.query(Upload).filter(Upload.company_id == company_id, Upload.file_hash == file_hash).first():
            raise HTTPException(status_code=400, detail="Este arquivo já foi importado anteriormente.")

        novo_upload = Upload(company_id=company_id, filename=filename, file_hash=file_hash)
        db.add(novo_upload)
        db.flush()

        # Suporte a CSV e Excel
        if filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            df = pd.read_csv(io.BytesIO(file_bytes))

        linhas_importadas = 0
        inconsistencias_geradas = 0

        for _, row in df.iterrows():
            ext_id = str(row[columns.id_produto]).strip()
            nome_csv = str(row[columns.produto]).strip()

            produto = db.query(Product).filter(
                Product.company_id == company_id,
                Product.external_id == ext_id
            ).first()

            if not produto:
                # Produto novo — cria no catálogo
                produto = Product(company_id=company_id, external_id=ext_id, name=nome_csv)
                db.add(produto)
                db.flush()
            else:
                # ✅ Produto já existe — verifica se o nome bate
                if produto.name.strip().lower() != nome_csv.lower():
                    # Verifica se já existe uma inconsistência pendente igual para não duplicar
                    ja_existe = db.query(ProductInconsistency).filter(
                        ProductInconsistency.company_id == company_id,
                        ProductInconsistency.product_id == produto.id,
                        ProductInconsistency.new_name == nome_csv,
                        ProductInconsistency.resolved == False
                    ).first()

                    if not ja_existe:
                        inconsistencia = ProductInconsistency(
                            company_id=company_id,
                            product_id=produto.id,
                            external_id=ext_id,
                            current_name=produto.name,
                            new_name=nome_csv
                        )
                        db.add(inconsistencia)
                        inconsistencias_geradas += 1

                    # Produto inconsistente NÃO entra nas vendas (regra da spec)
                    continue

            nova_venda = Sale(
                company_id=company_id,
                upload_id=novo_upload.id,
                product_id=produto.id,
                date=pd.to_datetime(row[columns.data]).date(),
                value=float(row[columns.valor]),
                quantity=int(row[columns.quantidade]),
                total_value=float(row[columns.valor_total])
            )
            db.add(nova_venda)
            linhas_importadas += 1

        db.commit()
        return {
            "linhas_importadas": linhas_importadas,
            "inconsistencias_geradas": inconsistencias_geradas,
            "message": "Arquivo processado com sucesso."
        }
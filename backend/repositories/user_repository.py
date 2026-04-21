from sqlalchemy.orm import Session
from domain.models import User, Company

class UserRepository:
    @staticmethod
    def get_user_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def create_user_with_company(db: Session, user_data: dict, company_name: str):
        # 1. Cria a Empresa primeiro
        new_company = Company(name=company_name)
        db.add(new_company)
        db.flush() # Salva temporariamente para gerar o ID da empresa

        # 2. Cria o Usuário vinculado àquela empresa
        new_user = User(
            name=user_data["name"],
            email=user_data["email"],
            hashed_password=user_data["hashed_password"],
            company_id=new_company.id
        )
        db.add(new_user)
        db.commit() # Agora sim salva tudo de forma definitiva
        db.refresh(new_user)
        
        return new_user
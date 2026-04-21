from sqlalchemy.orm import Session
from fastapi import HTTPException
from core.security import get_password_hash, verify_password
from repositories.user_repository import UserRepository

class AuthService:
    @staticmethod
    def register_company_and_user(db: Session, user_in):
        # Regra: Verificar se o email já existe
        existing_user = UserRepository.get_user_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email já cadastrado no sistema")
        
        # Criptografa a senha antes de salvar
        user_dict = {
            "name": user_in.name,
            "email": user_in.email,
            "hashed_password": get_password_hash(user_in.password)
        }
        
        return UserRepository.create_user_with_company(db, user_dict, user_in.company_name)

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str):
        user = UserRepository.get_user_by_email(db, email)
        # Regra: Se o usuário não existir ou a senha estiver errada, nega o acesso
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user
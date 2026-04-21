from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import create_access_token
from schemas.auth import UserCreate, Token
from services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # 1. Manda o Service cadastrar a empresa e o usuário
    user = AuthService.register_company_and_user(db, user_in)
    
    # 2. Gera o Token JWT contendo o e-mail e o company_id (Regra Crítica Multitenancy)
    access_token = create_access_token(
        data={"sub": user.email, "company_id": user.company_id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Verifica se e-mail e senha batem
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Se logou com sucesso, gera e devolve o Token JWT
    access_token = create_access_token(
        data={"sub": user.email, "company_id": user.company_id}
    )
    return {"access_token": access_token, "token_type": "bearer"}
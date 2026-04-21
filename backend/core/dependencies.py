from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from core.config import settings

# Diz ao FastAPI onde é a rota de login para ele testar o token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_company_id(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais de acesso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Abre o token JWT usando a nossa chave secreta
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        company_id: int = payload.get("company_id")
        
        if company_id is None:
            raise credentials_exception
            
        return company_id
    except JWTError:
        raise credentials_exception
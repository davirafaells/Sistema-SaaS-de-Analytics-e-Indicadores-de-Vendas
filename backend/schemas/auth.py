from pydantic import BaseModel, EmailStr

# O que esperamos receber quando alguém cria uma conta
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    company_name: str  # Cria o usuário e a empresa de uma vez só

# O que vamos devolver para o Frontend após o login (O Token JWT)
class Token(BaseModel):
    access_token: str
    token_type: str
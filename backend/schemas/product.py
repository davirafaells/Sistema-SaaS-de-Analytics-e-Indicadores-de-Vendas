from pydantic import BaseModel
from datetime import datetime


class ProductUpdate(BaseModel):
    name: str


class ProductResponse(BaseModel):
    id: int
    external_id: str
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
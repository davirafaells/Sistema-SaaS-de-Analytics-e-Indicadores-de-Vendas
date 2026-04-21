from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class Company(Base):
    __tablename__ = "company"
    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String, nullable=False)
    trial_start_date = Column(DateTime, default=func.now())
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=func.now())
    users     = relationship("User",          back_populates="company")
    jobs      = relationship("ProcessingJob", back_populates="company")
    products  = relationship("Product",       back_populates="company")
    uploads   = relationship("Upload",        back_populates="company")
    sales     = relationship("Sale",          back_populates="company")


class User(Base):
    __tablename__ = "user"
    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(Integer, ForeignKey("company.id"), nullable=True)
    name            = Column(String, nullable=False)
    email           = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_saas_admin   = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=func.now())
    company = relationship("Company", back_populates="users")


class ProcessingJob(Base):
    __tablename__ = "processing_job"
    id         = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)
    status     = Column(String, default="pendente")
    file_hash  = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    company = relationship("Company", back_populates="jobs")


class Upload(Base):
    __tablename__ = "upload"
    id         = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)
    filename   = Column(String, nullable=False)
    file_hash  = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    company = relationship("Company", back_populates="uploads")
    sales   = relationship("Sale",    back_populates="upload")


class Product(Base):
    __tablename__ = "product"
    id          = Column(Integer, primary_key=True, index=True)
    company_id  = Column(Integer, ForeignKey("company.id"), nullable=False)
    external_id = Column(String, nullable=False, index=True)
    name        = Column(String, nullable=False)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=func.now())
    company          = relationship("Company",              back_populates="products")
    sales            = relationship("Sale",                 back_populates="product")
    inconsistencies  = relationship("ProductInconsistency", back_populates="product")


class ProductInconsistency(Base):
    __tablename__ = "product_inconsistency"
    id           = Column(Integer, primary_key=True, index=True)
    company_id   = Column(Integer, ForeignKey("company.id"), nullable=False)
    product_id   = Column(Integer, ForeignKey("product.id"), nullable=False)
    external_id  = Column(String, nullable=False)
    current_name = Column(String, nullable=False)
    new_name     = Column(String, nullable=False)
    resolved     = Column(Boolean, default=False)
    resolution   = Column(String,  nullable=True)
    created_at   = Column(DateTime, default=func.now())
    product = relationship("Product", back_populates="inconsistencies")


class Sale(Base):
    __tablename__ = "sale"
    id          = Column(Integer, primary_key=True, index=True)
    company_id  = Column(Integer, ForeignKey("company.id"), nullable=False)
    upload_id   = Column(Integer, ForeignKey("upload.id"),  nullable=False)
    product_id  = Column(Integer, ForeignKey("product.id"), nullable=False)
    date        = Column(Date,    nullable=False)
    value       = Column(Numeric(10, 2), nullable=False)
    quantity    = Column(Integer, nullable=False)
    total_value = Column(Numeric(10, 2), nullable=False)
    is_deleted  = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=func.now())
    company = relationship("Company", back_populates="sales")
    upload  = relationship("Upload",  back_populates="sales")
    product = relationship("Product", back_populates="sales")


# ── Sprint 3: Meta mensal ──────────────────────────────────────────────────────
class CompanyGoal(Base):
    __tablename__ = "company_goal"
    id         = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("company.id"), nullable=False)
    month      = Column(Integer, nullable=False)
    year       = Column(Integer, nullable=False)
    goal_value = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("company_id", "month", "year", name="uq_company_goal_month"),
    )


# ── Sprint 7: Diario de Decisoes ──────────────────────────────────────────────
class DecisionLog(Base):
    __tablename__ = "decision_log"

    id            = Column(Integer, primary_key=True, index=True)
    company_id    = Column(Integer, ForeignKey("company.id"), nullable=False)

    # Produto relacionado (nullable — pode ser uma decisao geral)
    product_id    = Column(Integer, ForeignKey("product.id"), nullable=True)

    # Tipo de acao: promotion, restock, price_change, campaign, other
    action_type   = Column(String, nullable=False, default="other")

    description   = Column(String, nullable=False)
    decision_date = Column(Date,   nullable=False)

    created_at    = Column(DateTime, default=func.now())
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine, Base
import domain.models
from api.auth            import router as auth_router
from api.upload          import router as upload_router
from api.dashboard       import router as dashboard_router
from api.report          import router as report_router
from api.sales           import router as sales_router
from api.products        import router as products_router
from api.inconsistencies import router as inconsistencies_router
from api.goals           import router as goals_router
from api.decisions       import router as decisions_router
from api.executive       import router as executive_router   # Relatorio Executivo

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SaaS Analytics de Vendas",
    description="Relatorio executivo mensal + analise operacional"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(dashboard_router)
app.include_router(report_router)
app.include_router(sales_router)
app.include_router(products_router)
app.include_router(inconsistencies_router)
app.include_router(goals_router)
app.include_router(decisions_router)
app.include_router(executive_router)

@app.get("/")
def root():
    return {"mensagem": "API rodando — Relatorio Executivo disponivel em /executive"}
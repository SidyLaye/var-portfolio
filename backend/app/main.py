from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.routers import stocks, var, portfolios, debug


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="VAR Portfolio Calculator",
    description="Historical Value at Risk calculator for stock portfolios — CAC 40 / S&P 500 / EuroStoxx 50 / SBF 120",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(var.router)
app.include_router(portfolios.router)
app.include_router(debug.router)


@app.get("/", tags=["Root"])
async def root():
    return {"message": "VAR Portfolio Calculator API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health", tags=["Root"])
async def health():
    return {"status": "ok"}

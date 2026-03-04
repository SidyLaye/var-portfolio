from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Portfolio, PortfolioStock
from app.schemas import PortfolioCreate, PortfolioResponse, VarCachePatch
from app.services.data_fetcher import fetch_prices
from app.services.var_calculator import calculate_var

router = APIRouter(prefix="/portfolios", tags=["Portfolios"])

_WITH_STOCKS = selectinload(Portfolio.stocks)


@router.post("/", response_model=PortfolioResponse)
async def create_portfolio(portfolio: PortfolioCreate, db: AsyncSession = Depends(get_db)):
    db_portfolio = Portfolio(
        name=portfolio.name,
        amount=portfolio.amount,
        quantile=portfolio.quantile,
        start_date=portfolio.start_date,
        end_date=portfolio.end_date,
    )
    db.add(db_portfolio)
    await db.flush()

    for stock in portfolio.stocks:
        db.add(PortfolioStock(
            portfolio_id=db_portfolio.id,
            ticker=stock.ticker,
            name=stock.name,
            weight=stock.weight,
            index_name=stock.index_name,
        ))

    await db.commit()
    result = await db.execute(
        select(Portfolio).options(_WITH_STOCKS).where(Portfolio.id == db_portfolio.id)
    )
    return result.scalar_one()


@router.get("/", response_model=list[PortfolioResponse])
async def list_portfolios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Portfolio).options(_WITH_STOCKS).order_by(Portfolio.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Portfolio).options(_WITH_STOCKS).where(Portfolio.id == portfolio_id)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.delete("/{portfolio_id}")
async def delete_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    await db.delete(portfolio)
    await db.commit()
    return {"message": "Portfolio deleted successfully"}


@router.patch("/{portfolio_id}/cache")
async def patch_portfolio_cache(portfolio_id: int, cache: VarCachePatch, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio.last_var_amount = cache.var_amount
    portfolio.last_var_pct = cache.var_pct
    portfolio.last_volatility = cache.portfolio_volatility
    await db.commit()
    return {"ok": True}


@router.post("/{portfolio_id}/calculate")
async def recalculate_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Portfolio).options(_WITH_STOCKS).where(Portfolio.id == portfolio_id)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    tickers = [s.ticker for s in portfolio.stocks]
    prices, _ = await fetch_prices(tickers, "1970-01-01", portfolio.end_date)

    if prices.empty:
        raise HTTPException(status_code=400, detail="No price data available")

    stocks = [{"ticker": s.ticker, "weight": s.weight, "name": s.name} for s in portfolio.stocks]
    var_result = calculate_var(prices, stocks, portfolio.amount, portfolio.quantile, portfolio.start_date)

    # Update cached results
    portfolio.last_var_amount = var_result.var_amount
    portfolio.last_var_pct = var_result.var_pct
    portfolio.last_volatility = var_result.portfolio_volatility
    await db.commit()

    return var_result

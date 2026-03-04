import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.schemas import VarRequest, VarResult
from app.services.data_fetcher import fetch_prices
from app.services.var_calculator import calculate_var

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/var", tags=["VaR"])


@router.post("/calculate", response_model=VarResult)
async def calculate_portfolio_var(request: VarRequest):
    tickers = [s.ticker for s in request.stocks]

    try:
        # Always fetch full history for VaR; start_date is only for the performance chart
        prices, fetch_errors = await fetch_prices(tickers, "1970-01-01", request.end_date)
    except Exception as e:
        logger.warning("EXCEPTION in fetch_prices: [%s] %s", type(e).__name__, e, exc_info=True)
        raise HTTPException(status_code=400, detail=f"[{type(e).__name__}] {e}")

    logger.warning("FETCH RESULT — tickers OK: %d, rows: %d, errors: %s",
                   len(prices.columns) if not prices.empty else 0, len(prices), fetch_errors)

    if prices.empty:
        error_detail = "; ".join(f"{t}: {e}" for t, e in fetch_errors.items()) if fetch_errors else "aucun détail disponible"
        logger.warning("ALL FETCHES FAILED: %s", fetch_errors)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Aucune donnée récupérée pour les {len(tickers)} tickers. "
                f"Détails : {error_detail}"
            ),
        )

    valid = [t for t in tickers if t in prices.columns]
    missing = [t for t in tickers if t not in prices.columns]

    if len(valid) < 2:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Seulement {len(valid)} ticker(s) ont des données. "
                f"Sans données : {missing}. "
                "Vérifiez les symboles dans l'onglet /docs (ex: 'MC.PA', 'AAPL')."
            ),
        )

    if missing:
        total_valid_weight = sum(s.weight for s in request.stocks if s.ticker in valid)
        request.stocks = [s for s in request.stocks if s.ticker in valid]
        for s in request.stocks:
            s.weight = round(s.weight / total_valid_weight, 8)

    # Minimum observations needed for meaningful VaR
    if len(prices) < 30:
        raise HTTPException(
            status_code=400,
            detail="Not enough historical data. Need at least 30 trading days.",
        )

    stocks = [
        {"ticker": s.ticker, "weight": s.weight, "name": s.name or s.ticker}
        for s in request.stocks
    ]

    # VaR window = end_date − 20 years (course methodology)
    end_dt = datetime.strptime(request.end_date, "%Y-%m-%d")
    var_start_date = end_dt.replace(year=end_dt.year - 20).strftime("%Y-%m-%d")

    try:
        result = calculate_var(
            prices, stocks, request.amount, request.quantile,
            perf_start_date=request.start_date,
            var_start_date=var_start_date,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"VaR calculation error: {str(e)}")

    return result

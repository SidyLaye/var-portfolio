"""
Stocks router.
Default display (no query): local curated tickers.py list, filtered by index.
Search (with query): live Yahoo Finance search API, filtered strictly by index.
"""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter
from app.tickers import INDICES, ALL_TICKERS
from app.services.data_fetcher import _SESSION, fetch_prices

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stocks", tags=["Stocks"])

_executor = ThreadPoolExecutor(max_workers=2)

_YF_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search"

# Exchange code → index label (for Yahoo Finance search results)
_EXCHANGE_TO_INDEX = {
    "PAR": "CAC 40",
    "EPA": "CAC 40",
    "AMS": "EuroStoxx 50",
    "FRA": "EuroStoxx 50",
    "ETR": "EuroStoxx 50",
    "EBR": "EuroStoxx 50",
    "MCE": "EuroStoxx 50",
    "MIL": "EuroStoxx 50",
    "HEL": "EuroStoxx 50",
    "NMS": "S&P 500",
    "NYQ": "S&P 500",
    "NGM": "S&P 500",
    "PCX": "S&P 500",
}

# Index label → which exchange codes belong to it (for filtering search results)
_INDEX_EXCHANGES = {
    "CAC 40":      {"PAR", "EPA"},
    "SBF 120":     {"PAR", "EPA"},
    "EuroStoxx 50": {"AMS", "FRA", "ETR", "EBR", "MCE", "MIL", "HEL"},
    "S&P 500":     {"NMS", "NYQ", "NGM", "PCX"},
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _local_stocks(index_name: str) -> list[dict]:
    """Return the curated local list for the given index (or ALL)."""
    seeds = ALL_TICKERS if index_name == "ALL" else INDICES.get(index_name, [])
    return [
        {
            "ticker": s["ticker"],
            "name": s["name"],
            "sector": s.get("sector"),
            "index_name": s["index_name"],
            "exchange": "",
        }
        for s in seeds
    ]


def _yahoo_search(query: str, count: int = 25) -> list[dict]:
    """Live Yahoo Finance full-text search."""
    try:
        resp = _SESSION.get(
            _YF_SEARCH,
            params={"q": query, "quotesCount": count, "newsCount": 0},
            timeout=10,
        )
        quotes = resp.json().get("quotes", [])
    except Exception as e:
        logger.warning("Yahoo search error: %s", e)
        return []

    results = []
    for q in quotes:
        if q.get("quoteType") not in ("EQUITY", "ETF"):
            continue
        ticker = q.get("symbol", "")
        exchange = q.get("exchange", "")
        results.append({
            "ticker": ticker,
            "name": q.get("longname") or q.get("shortname") or ticker,
            "sector": q.get("sector") or None,
            "exchange": exchange,
            "index_name": _EXCHANGE_TO_INDEX.get(exchange, ""),
        })
    return results


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/prices")
async def get_stock_prices(tickers: str):
    """
    Retourne le dernier cours connu pour une liste de tickers séparés par des virgules.
    Utilisé par le mode 'nb d'actions' du calculateur.
    """
    from datetime import date, timedelta
    ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"prices": {}}
    end   = date.today().isoformat()
    start = (date.today() - timedelta(days=10)).isoformat()
    df, errors = await fetch_prices(ticker_list, start, end)
    if df.empty:
        return {"prices": {}, "errors": errors}
    last_prices = {t: round(float(df[t].iloc[-1]), 4) for t in df.columns if t in ticker_list}
    return {"prices": last_prices, "errors": errors}


@router.get("/indices")
async def get_indices():
    return {"indices": list(INDICES.keys())}


@router.get("/search")
async def search_stocks(q: str = "", index: str = "ALL"):
    """
    Search stocks.
    - q empty  → local curated list for the selected index.
    - q filled → live Yahoo Finance search, filtered strictly by index.
    """
    q = q.strip()

    if not q:
        # Default browse: local curated list, instant response
        stocks = _local_stocks(index)
        return {"stocks": stocks, "source": "local"}

    # Live Yahoo Finance search
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(_executor, _yahoo_search, q, 30)

    # Strict index filter: keep only results whose exchange belongs to the index
    if index != "ALL":
        allowed_exchanges = _INDEX_EXCHANGES.get(index, set())
        results = [r for r in results if r["exchange"] in allowed_exchanges]

    return {"stocks": results, "source": "yahoo"}

"""
Diagnostic endpoint — accessible at GET /debug/yfinance?ticker=AAPL
Use this to check if yfinance can reach Yahoo Finance from this machine.
"""
from fastapi import APIRouter
from app.services.data_fetcher import test_single_ticker

router = APIRouter(prefix="/debug", tags=["Debug"])


@router.get("/yfinance")
def debug_yfinance(ticker: str = "AAPL"):
    """
    Tests yfinance on a single ticker and returns the raw structure.
    Open http://localhost:8000/debug/yfinance?ticker=AAPL to diagnose issues.
    """
    return test_single_ticker(ticker)

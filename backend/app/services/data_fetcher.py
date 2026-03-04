"""
Data fetcher — calls Yahoo Finance v8 API directly with curl_cffi.
Bypasses yfinance entirely to avoid its internal session/cookie issues.
"""
import pandas as pd
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, date, timedelta, timezone

logger = logging.getLogger(__name__)

_outer_executor = ThreadPoolExecutor(max_workers=2)

# ── Session setup ──────────────────────────────────────────────────────────────

def _make_curl_session():
    """curl_cffi session — impersonates Chrome, bypasses Yahoo bot detection."""
    from curl_cffi import requests as cfreq
    return cfreq.Session(impersonate="chrome")


def _make_requests_session():
    """
    Plain requests session with Yahoo Finance crumb.
    Fallback when curl_cffi is unavailable.
    """
    import requests
    s = requests.Session()
    s.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/121.0.0.0 Safari/537.36"
        ),
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://finance.yahoo.com/",
    })
    try:
        s.get("https://fc.yahoo.com", timeout=5)
        crumb = s.get(
            "https://query2.finance.yahoo.com/v1/test/getcrumb", timeout=5
        ).text.strip()
        if crumb and len(crumb) < 50:
            s.params = {"crumb": crumb}  # type: ignore[assignment]
            logger.info("Yahoo Finance crumb: %s", crumb)
    except Exception as e:
        logger.warning("Crumb fetch failed: %s", e)
    return s


def _get_session():
    try:
        sess = _make_curl_session()
        logger.info("curl_cffi session ready")
        return sess, "curl_cffi"
    except ImportError:
        sess = _make_requests_session()
        logger.warning("curl_cffi unavailable — using requests fallback")
        return sess, "requests"


_SESSION, _SESSION_TYPE = _get_session()

# ── Core fetch ─────────────────────────────────────────────────────────────────

_YF_V8 = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
_YF_V8_BACKUP = "https://query2.finance.yahoo.com/v8/finance/chart/{ticker}"


def _fetch_one(ticker: str, start_date: str, end_date: str) -> tuple[str, "pd.Series | None", str]:
    """
    Download adjusted closing prices for one ticker directly from Yahoo Finance v8 API.
    Returns (ticker, series_or_None, error_message).
    """
    # Reliable data floor: pre-2000 data for most European stocks is corrupted
    # (predecessor companies, pre-IPO synthetic data, unadjusted splits).
    # 2000-01-03 still covers dot-com crash, 2008, COVID = 25 years of clean history.
    _FLOOR = datetime(2000, 1, 3, tzinfo=timezone.utc)
    start_dt = max(
        datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc),
        _FLOOR,
    )
    end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    start_ts = int(start_dt.timestamp())
    end_ts   = int(end_dt.timestamp())

    params = {
        "period1": start_ts,
        "period2": end_ts,
        "interval": "1d",
        "events": "history",
        "includeAdjustedClose": "true",
    }

    for base_url in (_YF_V8, _YF_V8_BACKUP):
        url = base_url.format(ticker=ticker)
        try:
            resp = _SESSION.get(url, params=params, timeout=15)
            if resp.status_code != 200:
                continue

            data = resp.json()
            chart = data.get("chart", {})

            if chart.get("error"):
                return ticker, None, str(chart["error"])

            results = chart.get("result")
            if not results:
                return ticker, None, "empty chart result"

            r = results[0]
            timestamps = r.get("timestamp")
            if not timestamps:
                return ticker, None, "no timestamps"

            # Prefer adjclose, fall back to close
            try:
                closes = r["indicators"]["adjclose"][0]["adjclose"]
            except (KeyError, IndexError, TypeError):
                closes = r["indicators"]["quote"][0].get("close", [])

            if not closes:
                return ticker, None, "no close prices"

            dates = pd.to_datetime(
                [datetime.utcfromtimestamp(ts) for ts in timestamps]
            ).normalize()

            series = pd.Series(closes, index=dates, name=ticker, dtype=float)
            series = series.dropna()

            if series.empty:
                return ticker, None, "all values NaN"

            return ticker, series, ""

        except Exception as e:
            logger.debug("%s fetch error on %s: %s", ticker, base_url, e)
            continue

    return ticker, None, "all endpoints failed"


# ── Public interface ───────────────────────────────────────────────────────────

def _fetch_prices_sync(tickers: list[str], start_date: str, end_date: str) -> tuple[pd.DataFrame, dict]:
    """
    Download prices for all tickers sequentially.
    Returns (DataFrame of close prices, dict of errors per ticker).
    """
    # Cap end_date at yesterday to avoid incomplete intraday data
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    if end_date > yesterday:
        end_date = yesterday

    results: dict[str, pd.Series] = {}
    errors:  dict[str, str]       = {}

    for ticker in tickers:
        _, series, err = _fetch_one(ticker, start_date, end_date)
        if series is not None and not series.empty:
            results[ticker] = series
            logger.info("OK  %s  (%d rows)", ticker, len(series))
        else:
            errors[ticker] = err
            logger.warning("FAIL %s: %s", ticker, err)

    if not results:
        return pd.DataFrame(), errors

    df = pd.DataFrame(results)
    df = df.dropna(axis=1, how="all")
    df = df.ffill().bfill()
    return df, errors


async def fetch_prices(tickers: list[str], start_date: str, end_date: str) -> tuple[pd.DataFrame, dict]:
    """Async entry point."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _outer_executor, _fetch_prices_sync, tickers, start_date, end_date
    )


# ── Debug helper ───────────────────────────────────────────────────────────────

def test_single_ticker(ticker: str) -> dict:
    """Used by GET /debug/yfinance?ticker=XXX"""
    end   = date.today().isoformat()
    start = (date.today() - timedelta(days=10)).isoformat()
    ticker_out, series, err = _fetch_one(ticker, start, end)
    return {
        "ticker":       ticker_out,
        "session_type": _SESSION_TYPE,
        "error":        err or None,
        "rows":         len(series) if series is not None else 0,
        "sample":       series.tail(3).to_dict() if series is not None else {},
    }

import pandas as pd
import numpy as np
from app.schemas import VarResult, IndividualStockStats


def calculate_var(
    prices: pd.DataFrame,
    stocks: list[dict],
    amount: float,
    quantile: float,
    perf_start_date: str | None = None,
    var_start_date: str | None = None,
) -> VarResult:
    """
    Two separate windows:
    - VaR window  : var_start_date → end_date  (exactly 20 years) → risk metrics
    - Perf window : perf_start_date → end_date (user's choice)    → return metrics
    """
    # ── Tickers & weights ─────────────────────────────────────────────────────
    all_requested = [s["ticker"] for s in stocks]
    tickers = [s["ticker"] for s in stocks if s["ticker"] in prices.columns]
    excluded_tickers = [t for t in all_requested if t not in prices.columns]
    weights = {s["ticker"]: s["weight"] for s in stocks}
    names   = {s["ticker"]: s.get("name", s["ticker"]) for s in stocks}

    valid_weight_sum = sum(weights[t] for t in tickers)
    if valid_weight_sum > 0 and excluded_tickers:
        weights = {t: weights[t] / valid_weight_sum for t in tickers}

    if not tickers:
        raise ValueError("No valid tickers found in price data")

    weights_arr = np.array([weights[t] for t in tickers])

    # ── Clean returns (outlier filter: splits / pre-IPO data errors) ──────────
    returns_all = prices[tickers].pct_change().dropna()
    returns_all = returns_all[(returns_all.abs() <= 0.40).all(axis=1)]

    # ── VaR window (last 20 years from end_date) ──────────────────────────────
    if var_start_date:
        var_cutoff = pd.Timestamp(var_start_date)
        returns_var = returns_all[returns_all.index >= var_cutoff]
    else:
        returns_var = returns_all

    if returns_var.empty:
        returns_var = returns_all

    port_returns_var = returns_var.dot(weights_arr)

    # ── Perf window (user's start_date → end_date) ────────────────────────────
    if perf_start_date:
        perf_cutoff = pd.Timestamp(perf_start_date)
        returns_perf = returns_all[returns_all.index >= perf_cutoff]
    else:
        returns_perf = returns_all

    if returns_perf.empty:
        returns_perf = returns_var

    port_returns_perf = returns_perf.dot(weights_arr)

    # ── Actual window dates ───────────────────────────────────────────────────
    var_window_start  = returns_var.index[0].strftime("%Y-%m-%d")  if not returns_var.empty  else ""
    var_window_end    = returns_var.index[-1].strftime("%Y-%m-%d") if not returns_var.empty  else ""
    perf_window_start = returns_perf.index[0].strftime("%Y-%m-%d") if not returns_perf.empty else ""
    perf_window_end   = returns_perf.index[-1].strftime("%Y-%m-%d") if not returns_perf.empty else ""

    # ── Historical VaR (VaR window) — méthode SMALL du cours ────────────────
    # k = floor(n × q) → VaR = k-ième pire valeur (1-indexé)
    sorted_var = np.sort(port_returns_var.values)
    n_var      = len(sorted_var)
    k          = max(1, int(np.floor(n_var * quantile)))

    var_pct    = float(sorted_var[k - 1])
    var_amount = abs(var_pct) * amount

    # ── Portfolio stats (perf window) ─────────────────────────────────────────
    portfolio_volatility  = float(port_returns_perf.std() * np.sqrt(252))
    portfolio_mean_return = float(port_returns_perf.mean() * 252)

    cumulative_perf  = (1 + port_returns_perf).cumprod()
    portfolio_values = cumulative_perf * amount
    total_return     = float(cumulative_perf.iloc[-1] - 1)

    rolling_max  = cumulative_perf.cummax()
    max_drawdown = float(((cumulative_perf - rolling_max) / rolling_max).min())

    # ── Histogram (VaR window) ────────────────────────────────────────────────
    hist_counts, hist_bins = np.histogram(port_returns_var, bins=50)
    histogram_data = [
        {
            "x":     round(float((hist_bins[i] + hist_bins[i + 1]) / 2) * 100, 4),
            "count": int(hist_counts[i]),
            "isVar": bool(hist_bins[i + 1] <= var_pct),
        }
        for i in range(len(hist_counts))
    ]

    # ── Performance chart (perf window, starts at amount) ─────────────────────
    performance_data = [
        {
            "date":      date.strftime("%Y-%m-%d"),
            "value":     round(float(val), 2),
            "cumReturn": round((float(val) / amount - 1) * 100, 4),
        }
        for date, val in portfolio_values.items()
    ]

    # ── Individual stock stats ────────────────────────────────────────────────
    individual_stats = []
    for ticker in tickers:
        sr_perf = returns_perf[ticker]
        sr_var  = returns_var[ticker]

        ann_vol  = float(sr_perf.std()  * np.sqrt(252))
        ann_mean = float(sr_perf.mean() * 252)
        total_ret    = float((1 + sr_perf).cumprod().iloc[-1] - 1)

        # VaR contribution uses VaR window — méthode SMALL identique au portefeuille
        sorted_stock = np.sort(sr_var.values)
        k_s          = max(1, int(np.floor(len(sorted_stock) * quantile)))
        stock_var_pct    = float(sorted_stock[k_s - 1])
        var_contribution = float(weights[ticker] * stock_var_pct)

        individual_stats.append(IndividualStockStats(
            ticker=ticker,
            name=names[ticker],
            weight=weights[ticker],
            mean_return_annual=round(ann_mean * 100, 4),
            volatility_annual=round(ann_vol * 100, 4),
            var_contribution_pct=round(var_contribution * 100, 4),
            total_return=round(total_ret * 100, 4),
        ))

    # ── Correlation matrix (perf window) ─────────────────────────────────────
    corr = returns_perf[tickers].corr()
    correlation_matrix = [
        {"x": names[t1], "y": names[t2], "value": round(float(corr.loc[t1, t2]), 4)}
        for t1 in tickers for t2 in tickers
    ]

    return VarResult(
        var_amount=round(var_amount, 2),
        var_pct=round(var_pct * 100, 4),
        confidence_level=round((1 - quantile) * 100, 1),
        portfolio_volatility=round(portfolio_volatility * 100, 4),
        portfolio_mean_return=round(portfolio_mean_return * 100, 4),
        max_drawdown=round(float(max_drawdown) * 100, 4),
        total_return=round(total_return * 100, 4),
        nb_observations=n_var,
        var_window_start=var_window_start,
        var_window_end=var_window_end,
        perf_window_start=perf_window_start,
        perf_window_end=perf_window_end,
        returns_histogram=histogram_data,
        portfolio_performance=performance_data,
        individual_stats=individual_stats,
        correlation_matrix=correlation_matrix,
        excluded_tickers=excluded_tickers,
    )

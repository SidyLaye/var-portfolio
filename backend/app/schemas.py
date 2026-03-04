from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class StockWeight(BaseModel):
    ticker: str
    weight: float
    name: Optional[str] = None
    index_name: Optional[str] = None


class VarRequest(BaseModel):
    stocks: list[StockWeight]
    amount: float
    quantile: float
    start_date: str
    end_date: str

    @field_validator("quantile")
    @classmethod
    def validate_quantile(cls, v):
        if not 0 < v < 1:
            raise ValueError("Quantile must be between 0 and 1")
        return v

    @field_validator("stocks")
    @classmethod
    def validate_stocks(cls, v):
        total = sum(s.weight for s in v)
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1, got {total:.4f}")
        if len(v) < 2:
            raise ValueError("At least 2 stocks required")
        return v


class IndividualStockStats(BaseModel):
    ticker: str
    name: str
    weight: float
    mean_return_annual: float
    volatility_annual: float
    var_contribution_pct: float
    total_return: float


class VarResult(BaseModel):
    var_amount: float
    var_pct: float
    confidence_level: float
    portfolio_volatility: float
    portfolio_mean_return: float
    max_drawdown: float
    total_return: float
    excluded_tickers: list[str] = []
    nb_observations: int
    # Actual date windows used (ISO strings)
    var_window_start: str = ""
    var_window_end: str = ""
    perf_window_start: str = ""
    perf_window_end: str = ""
    returns_histogram: list[dict]
    portfolio_performance: list[dict]
    individual_stats: list[IndividualStockStats]
    correlation_matrix: list[dict]


class VarCachePatch(BaseModel):
    var_amount: float
    var_pct: float
    portfolio_volatility: float


class PortfolioStockCreate(BaseModel):
    ticker: str
    name: Optional[str] = None
    weight: float
    index_name: Optional[str] = None


class PortfolioCreate(BaseModel):
    name: str
    amount: float
    quantile: float
    start_date: str
    end_date: str
    stocks: list[PortfolioStockCreate]


class PortfolioStockResponse(BaseModel):
    id: int
    ticker: str
    name: Optional[str]
    weight: float
    index_name: Optional[str]

    model_config = {"from_attributes": True}


class PortfolioResponse(BaseModel):
    id: int
    name: str
    amount: float
    quantile: float
    start_date: str
    end_date: str
    created_at: datetime
    last_var_amount: Optional[float]
    last_var_pct: Optional[float]
    last_volatility: Optional[float]
    stocks: list[PortfolioStockResponse]

    model_config = {"from_attributes": True}

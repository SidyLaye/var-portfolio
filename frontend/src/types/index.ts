export interface StockInfo {
  ticker: string;
  name: string;
  index_name: string;
  sector?: string;
}

export interface StockWeight {
  ticker: string;
  weight: number;
  name?: string;
  index_name?: string;
}

export interface VarRequest {
  stocks: StockWeight[];
  amount: number;
  quantile: number;
  start_date: string;
  end_date: string;
}

export interface IndividualStockStats {
  ticker: string;
  name: string;
  weight: number;
  mean_return_annual: number;
  volatility_annual: number;
  var_contribution_pct: number;
  total_return: number;
}

export interface VarResult {
  var_amount: number;
  var_pct: number;
  confidence_level: number;
  portfolio_volatility: number;
  portfolio_mean_return: number;
  max_drawdown: number;
  total_return: number;
  nb_observations: number;
  returns_histogram: { x: number; count: number; isVar: boolean }[];
  portfolio_performance: { date: string; value: number; cumReturn: number }[];
  individual_stats: IndividualStockStats[];
  correlation_matrix: { x: string; y: string; value: number }[];
  excluded_tickers: string[];
  var_window_start: string;
  var_window_end: string;
  perf_window_start: string;
  perf_window_end: string;
}

export interface PortfolioStock {
  id: number;
  ticker: string;
  name?: string;
  weight: number;
  index_name?: string;
}

export interface Portfolio {
  id: number;
  name: string;
  amount: number;
  quantile: number;
  start_date: string;
  end_date: string;
  created_at: string;
  last_var_amount?: number;
  last_var_pct?: number;
  last_volatility?: number;
  stocks: PortfolioStock[];
}

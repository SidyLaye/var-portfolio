import axios from "axios";
import type { StockInfo, VarRequest, VarResult, Portfolio } from "@/types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 60000, // yfinance can be slow
  headers: { "Content-Type": "application/json" },
});

// ─── Stocks ───────────────────────────────────────────────────────────────────

export const getIndices = async (): Promise<string[]> => {
  const { data } = await api.get("/stocks/indices");
  return data.indices;
};

export const getAllStocks = async (): Promise<StockInfo[]> => {
  const { data } = await api.get("/stocks/all");
  return data.stocks;
};

export const getStocksByIndex = async (index: string): Promise<StockInfo[]> => {
  const { data } = await api.get(`/stocks/by-index/${encodeURIComponent(index)}`);
  return data.stocks;
};

export const searchStocks = async (q: string, index = "ALL"): Promise<StockInfo[]> => {
  const { data } = await api.get("/stocks/search", { params: { q, index } });
  return data.stocks;
};

export const getStockPrices = async (tickers: string[]): Promise<Record<string, number>> => {
  const { data } = await api.get("/stocks/prices", { params: { tickers: tickers.join(",") } });
  return data.prices as Record<string, number>;
};

// ─── VaR ─────────────────────────────────────────────────────────────────────

export const calculateVar = async (request: VarRequest): Promise<VarResult> => {
  const { data } = await api.post("/var/calculate", request);
  return data;
};

// ─── Portfolios ───────────────────────────────────────────────────────────────

export const getPortfolios = async (): Promise<Portfolio[]> => {
  const { data } = await api.get("/portfolios/");
  return data;
};

export const getPortfolio = async (id: number): Promise<Portfolio> => {
  const { data } = await api.get(`/portfolios/${id}`);
  return data;
};

export const createPortfolio = async (portfolio: {
  name: string;
  amount: number;
  quantile: number;
  start_date: string;
  end_date: string;
  stocks: { ticker: string; name?: string; weight: number; index_name?: string }[];
}): Promise<Portfolio> => {
  const { data } = await api.post("/portfolios/", portfolio);
  return data;
};

export const deletePortfolio = async (id: number): Promise<void> => {
  await api.delete(`/portfolios/${id}`);
};

export const recalculatePortfolio = async (id: number): Promise<VarResult> => {
  const { data } = await api.post(`/portfolios/${id}/calculate`);
  return data;
};

export const patchPortfolioCache = async (id: number, result: VarResult): Promise<void> => {
  await api.patch(`/portfolios/${id}/cache`, {
    var_amount: result.var_amount,
    var_pct: result.var_pct,
    portfolio_volatility: result.portfolio_volatility,
  });
};

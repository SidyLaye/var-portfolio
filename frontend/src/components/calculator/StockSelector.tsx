import { useState, useEffect, useCallback } from "react";
import { Search, Plus, X, Globe, Database, RefreshCw, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { getStockPrices, searchStocks } from "@/lib/api";
import { getSectorBg, formatCurrency } from "@/lib/utils";
import type { StockInfo, StockWeight } from "@/types";

interface Props {
  selected: StockWeight[];
  onAdd: (stock: StockInfo) => void;
  onRemove: (ticker: string) => void;
  onValorise: (updatedStocks: StockWeight[], totalAmount: number) => void;
}

const INDICES = ["ALL", "CAC 40", "S&P 500", "EuroStoxx 50", "SBF 120"];

export default function StockSelector({ selected, onAdd, onRemove, onValorise }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState("CAC 40");
  const [results, setResults] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"local" | "yahoo">("local");

  // Quantity mode state
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [valued, setValued] = useState(false);

  const selectedTickers = new Set(selected.map((s) => s.ticker));

  // Sync quantities when selected list changes
  useEffect(() => {
    setQuantities((prev) => {
      const next: Record<string, string> = {};
      selected.forEach((s) => {
        next[s.ticker] = prev[s.ticker] ?? "1";
      });
      return next;
    });
    setValued(false);
  }, [selected.map((s) => s.ticker).join(",")]);

  // ── Search ─────────────────────────────────────────────────────────────────

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const stocks = await searchStocks(query, activeIndex);
      setResults(stocks);
      setSource(query.length > 2 && stocks.length > 0 ? "yahoo" : "local");
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, activeIndex]);

  useEffect(() => {
    const timer = setTimeout(doSearch, query ? 400 : 0);
    return () => clearTimeout(timer);
  }, [doSearch]);

  // ── Valorisation ───────────────────────────────────────────────────────────

  const handleValorise = async () => {
    if (selected.length === 0) return;
    setLoadingPrices(true);
    setPriceError("");
    try {
      const tickers = selected.map((s) => s.ticker);
      const fetched = await getStockPrices(tickers);
      setPrices(fetched);

      const missing = tickers.filter((t) => !(t in fetched));
      if (missing.length === tickers.length) {
        setPriceError("Impossible de récupérer les cours.");
        return;
      }
      if (missing.length > 0) {
        setPriceError(`Cours introuvables : ${missing.join(", ")} — exclus du calcul.`);
      }

      const available = tickers.filter((t) => t in fetched);
      const totalValue = available.reduce((sum, t) => {
        return sum + (parseFloat(quantities[t] || "0") || 0) * fetched[t];
      }, 0);

      if (totalValue <= 0) {
        setPriceError("Valeur totale nulle — vérifiez les quantités.");
        return;
      }

      const updatedStocks = selected.map((s) => {
        if (!(s.ticker in fetched)) return { ...s, weight: 0 };
        const qty = parseFloat(quantities[s.ticker] || "0") || 0;
        return { ...s, weight: (qty * fetched[s.ticker]) / totalValue };
      });

      onValorise(updatedStocks, Math.round(totalValue * 100) / 100);
      setValued(true);
    } catch {
      setPriceError("Erreur lors de la récupération des cours.");
    } finally {
      setLoadingPrices(false);
    }
  };

  const totalValue = selected.reduce((sum, s) => {
    const p = prices[s.ticker];
    if (!p) return sum;
    return sum + (parseFloat(quantities[s.ticker] || "0") || 0) * p;
  }, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-4 h-full">
      {/* Left: search + results */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Index filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {INDICES.map((idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeIndex === idx
                  ? "bg-accent-blue text-white"
                  : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
              }`}
            >
              {idx}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher n'importe quelle action mondiale (LVMH, Apple, Siemens…)"
            className="input pl-9"
          />
        </div>

        {/* Source badge */}
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          {source === "yahoo" ? (
            <>
              <Globe className="w-3 h-3 text-accent-blue" />
              <span className="text-accent-blue">Recherche en direct — Yahoo Finance</span>
            </>
          ) : (
            <>
              <Database className="w-3 h-3" />
              <span>Liste curatée — tapez pour rechercher sur Yahoo Finance</span>
            </>
          )}
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto space-y-1 max-h-64">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              {query ? "Aucune action trouvée dans cette section" : "Aucune action disponible"}
            </div>
          ) : (
            results.map((stock) => {
              const isSelected = selectedTickers.has(stock.ticker);
              return (
                <button
                  key={stock.ticker}
                  onClick={() => !isSelected && onAdd(stock)}
                  disabled={isSelected}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "bg-accent-blue/5 border-accent-blue/30 opacity-50 cursor-not-allowed"
                      : "bg-bg-elevated border-border hover:border-accent-blue/50 hover:bg-bg-elevated/80"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-accent-blue font-medium shrink-0">
                        {stock.ticker}
                      </span>
                      {stock.index_name && (
                        <span className="text-xs text-text-muted shrink-0">{stock.index_name}</span>
                      )}
                    </div>
                    <p className="text-sm text-text-primary leading-tight mt-0.5 truncate">{stock.name}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {stock.sector && (
                      <span className={`text-xs px-2 py-0.5 rounded border hidden sm:inline ${getSectorBg(stock.sector)}`}>
                        {stock.sector}
                      </span>
                    )}
                    {isSelected ? (
                      <span className="text-xs text-accent-blue font-medium">✓</span>
                    ) : (
                      <Plus className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: selected stocks + quantities */}
      <div className="w-64 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-primary">Portefeuille</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            selected.length >= 2
              ? "bg-green-900/30 text-accent-green"
              : "bg-bg-elevated text-text-secondary"
          }`}>
            {selected.length} action{selected.length > 1 ? "s" : ""}
          </span>
        </div>

        {selected.length < 2 && (
          <p className="text-xs text-accent-yellow flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Minimum 2 actions
          </p>
        )}

        {/* Stock rows with quantity inputs */}
        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-64">
          {selected.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-xs border border-dashed border-border rounded-lg">
              Ajoutez des actions depuis la liste
            </div>
          ) : (
            selected.map((s) => {
              const price = prices[s.ticker];
              const qty = parseFloat(quantities[s.ticker] || "0") || 0;
              const value = price ? qty * price : null;
              return (
                <div
                  key={s.ticker}
                  className="bg-bg-elevated border border-border rounded-lg px-2.5 py-2"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-accent-blue font-medium">{s.ticker}</p>
                      <p className="text-xs text-text-muted truncate max-w-[100px]">{s.name || s.ticker}</p>
                    </div>
                    <button
                      onClick={() => onRemove(s.ticker)}
                      className="text-text-muted hover:text-accent-red transition-colors ml-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={quantities[s.ticker] ?? "1"}
                      onChange={(e) => {
                        setQuantities((prev) => ({ ...prev, [s.ticker]: e.target.value }));
                        setValued(false);
                      }}
                      min={0}
                      step={1}
                      className="w-20 bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary text-right focus:outline-none focus:border-accent-green"
                    />
                    <span className="text-xs text-text-muted">actions</span>
                    {value !== null && (
                      <span className="text-xs font-mono text-text-muted ml-auto">
                        {formatCurrency(value)}
                      </span>
                    )}
                  </div>
                  {valued && price && (
                    <p className="text-xs text-text-muted/70 mt-1">
                      Cours : {formatCurrency(price)} · Poids : {(s.weight * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Error */}
        {priceError && (
          <p className="text-xs text-accent-yellow flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            {priceError}
          </p>
        )}

        {/* Valoriser button + total */}
        {selected.length >= 2 && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            {valued && totalValue > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-accent-green">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valorisé
                </span>
                <span className="font-mono font-bold text-accent-green">{formatCurrency(totalValue)}</span>
              </div>
            )}
            <button
              onClick={handleValorise}
              disabled={loadingPrices}
              className="w-full btn-primary flex items-center justify-center gap-2 text-xs py-2"
            >
              {loadingPrices
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Récupération des cours...</>
                : <><RefreshCw className="w-3.5 h-3.5" />Valoriser au cours actuel</>
              }
            </button>
            {!valued && (
              <p className="text-xs text-text-muted text-center">
                Cliquez pour calculer les pondérations
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

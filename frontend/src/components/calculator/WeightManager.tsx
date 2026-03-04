import { useState } from "react";
import { Shuffle, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Percent, Hash } from "lucide-react";
import { getStockPrices } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { StockWeight } from "@/types";

interface Props {
  stocks: StockWeight[];
  onChange: (stocks: StockWeight[]) => void;
  onAmountChange?: (amount: number) => void;
}

type Mode = "percent" | "quantity";

const COLORS = [
  "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#06b6d4",
  "#f97316", "#ec4899", "#14b8a6", "#8b5cf6", "#ef4444",
  "#84cc16", "#f59e0b", "#6366f1", "#10b981", "#64748b",
  "#0ea5e9", "#d946ef", "#fb923c", "#4ade80", "#e879f9",
];

export default function WeightManager({ stocks, onChange, onAmountChange }: Props) {
  const [mode, setMode] = useState<Mode>("percent");
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(stocks.map((s) => [s.ticker, "1"]))
  );
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [valued, setValued] = useState(false);

  const total = stocks.reduce((s, x) => s + x.weight, 0);
  const isValid = Math.abs(total - 1) < 0.001;

  // ── Percent mode helpers ───────────────────────────────────────────────────

  const equalWeights = () => {
    if (!stocks.length) return;
    const w = 1 / stocks.length;
    onChange(stocks.map((s) => ({ ...s, weight: Math.round(w * 10000) / 10000 })));
  };

  const handlePercentChange = (ticker: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const clamped = Math.min(1, Math.max(0, num / 100));
    onChange(stocks.map((s) => (s.ticker === ticker ? { ...s, weight: clamped } : s)));
  };

  const handleSlider = (ticker: string, value: number) => {
    onChange(stocks.map((s) => (s.ticker === ticker ? { ...s, weight: value } : s)));
  };

  // ── Quantity mode helpers ──────────────────────────────────────────────────

  const handleQtyChange = (ticker: string, value: string) => {
    setQuantities((prev) => ({ ...prev, [ticker]: value }));
    setValued(false); // needs re-valorisation
  };

  const handleValorise = async () => {
    setLoadingPrices(true);
    setPriceError("");
    try {
      const tickers = stocks.map((s) => s.ticker);
      const fetched = await getStockPrices(tickers);
      setPrices(fetched);

      const missing = tickers.filter((t) => !(t in fetched));
      if (missing.length === tickers.length) {
        setPriceError("Impossible de récupérer les cours. Vérifiez votre connexion.");
        return;
      }
      if (missing.length > 0) {
        setPriceError(`Cours non trouvés : ${missing.join(", ")} — exclus du calcul.`);
      }

      // Compute portfolio value using available prices
      const availableTickers = tickers.filter((t) => t in fetched);
      const totalValue = availableTickers.reduce((sum, t) => {
        const qty = parseFloat(quantities[t] || "0") || 0;
        return sum + qty * fetched[t];
      }, 0);

      if (totalValue <= 0) {
        setPriceError("Valeur totale nulle — vérifiez les quantités.");
        return;
      }

      // Update weights
      const newStocks = stocks.map((s) => {
        if (!(s.ticker in fetched)) return { ...s, weight: 0 };
        const qty = parseFloat(quantities[s.ticker] || "0") || 0;
        const value = qty * fetched[s.ticker];
        return { ...s, weight: value / totalValue };
      });
      onChange(newStocks);
      onAmountChange?.(Math.round(totalValue * 100) / 100);
      setValued(true);
    } catch {
      setPriceError("Erreur lors de la récupération des cours.");
    } finally {
      setLoadingPrices(false);
    }
  };

  // ── Computed values for display (quantity mode) ────────────────────────────

  const totalValue = stocks.reduce((sum, s) => {
    if (!(s.ticker in prices)) return sum;
    const qty = parseFloat(quantities[s.ticker] || "0") || 0;
    return sum + qty * prices[s.ticker];
  }, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Mode toggle + actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-bg-elevated border border-border rounded-lg p-1">
          <button
            onClick={() => setMode("percent")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "percent"
                ? "bg-accent-blue text-white"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Pondérations %
          </button>
          <button
            onClick={() => setMode("quantity")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "quantity"
                ? "bg-accent-green text-white"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            Nb d'actions
          </button>
        </div>

        {mode === "percent" ? (
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 text-sm font-medium ${
                isValid ? "text-accent-green" : "text-accent-red"
              }`}
            >
              {isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              Total : {(total * 100).toFixed(2)}%
              {!isValid && <span className="text-xs text-text-muted ml-1">(doit être 100%)</span>}
            </div>
            <button onClick={equalWeights} className="btn-secondary flex items-center gap-2 text-xs py-1.5">
              <Shuffle className="w-3.5 h-3.5" />
              Équipondérer
            </button>
          </div>
        ) : (
          <button
            onClick={handleValorise}
            disabled={loadingPrices}
            className="btn-primary flex items-center gap-2 text-xs py-1.5"
          >
            {loadingPrices ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Valoriser au cours actuel
          </button>
        )}
      </div>

      {/* Weight progress bar (percent mode) */}
      {mode === "percent" && (
        <div className="h-2 bg-bg-elevated rounded-full overflow-hidden border border-border">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isValid ? "bg-accent-green" : total > 1 ? "bg-accent-red" : "bg-accent-blue"
            }`}
            style={{ width: `${Math.min(total * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Quantity mode: total value banner */}
      {mode === "quantity" && valued && totalValue > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-accent-green/10 border border-accent-green/30 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <CheckCircle2 className="w-4 h-4 text-accent-green" />
            Pondérations calculées depuis les cours réels
          </div>
          <span className="text-sm font-mono font-bold text-accent-green">
            {formatCurrency(totalValue)}
          </span>
        </div>
      )}

      {/* Error banner */}
      {priceError && (
        <div className="flex items-start gap-2 px-3 py-2 bg-yellow-900/10 border border-yellow-900/30 rounded-lg text-xs text-accent-yellow">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {priceError}
        </div>
      )}

      {/* Quantity mode: instruction if not yet valued */}
      {mode === "quantity" && !valued && (
        <div className="flex items-start gap-2 px-3 py-2 bg-blue-900/10 border border-blue-900/30 rounded-lg text-xs text-accent-blue">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          Entrez vos quantités puis cliquez sur <strong className="ml-1">Valoriser</strong> pour calculer les pondérations et le montant total.
        </div>
      )}

      {/* Stock rows */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {stocks.map((stock, i) => {
          const color = COLORS[i % COLORS.length];
          const qty = parseFloat(quantities[stock.ticker] || "0") || 0;
          const price = prices[stock.ticker];
          const value = price ? qty * price : null;

          return (
            <div key={stock.ticker} className="bg-bg-elevated border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-mono text-xs text-accent-blue font-medium">{stock.ticker}</span>
                  <span className="text-xs text-text-muted truncate max-w-[140px]">{stock.name}</span>
                </div>

                {mode === "percent" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={(stock.weight * 100).toFixed(2)}
                      onChange={(e) => handlePercentChange(stock.ticker, e.target.value)}
                      min={0}
                      max={100}
                      step={0.1}
                      className="w-20 bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary text-right focus:outline-none focus:border-accent-blue"
                    />
                    <span className="text-xs text-text-muted">%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={quantities[stock.ticker] ?? "1"}
                      onChange={(e) => handleQtyChange(stock.ticker, e.target.value)}
                      min={0}
                      step={1}
                      className="w-24 bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary text-right focus:outline-none focus:border-accent-green"
                    />
                    <span className="text-xs text-text-muted">actions</span>
                  </div>
                )}
              </div>

              {/* Quantity mode: price + value info row */}
              {mode === "quantity" && price !== undefined && (
                <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                  <span>
                    Cours : <span className="font-mono text-text-secondary">{formatCurrency(price)}</span>
                  </span>
                  {value !== null && (
                    <span>
                      Valeur : <span className="font-mono text-text-secondary">{formatCurrency(value)}</span>
                    </span>
                  )}
                  {valued && (
                    <span className="ml-auto font-mono" style={{ color }}>
                      {(stock.weight * 100).toFixed(2)}%
                    </span>
                  )}
                </div>
              )}

              {/* Slider (percent mode only) */}
              {mode === "percent" && (
                <div
                  className="relative h-1.5 bg-bg-primary rounded-full cursor-pointer mt-2"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    handleSlider(stock.ticker, Math.round(ratio * 10000) / 10000);
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stock.weight * 100}%`, backgroundColor: color }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-bg-primary shadow-md cursor-grab"
                    style={{ left: `calc(${stock.weight * 100}% - 6px)`, backgroundColor: color }}
                  />
                </div>
              )}

              {/* Quantity mode: weight bar (after valorisation) */}
              {mode === "quantity" && valued && stock.weight > 0 && (
                <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stock.weight * 100}%`, backgroundColor: color }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { ChevronRight, Loader2, Save, RotateCcw, CheckCircle2, Download } from "lucide-react";
import toast from "react-hot-toast";
import StockSelector from "@/components/calculator/StockSelector";
import WeightManager from "@/components/calculator/WeightManager";
import ParametersForm from "@/components/calculator/ParametersForm";
import ReturnHistogram from "@/components/results/ReturnHistogram";
import PerformanceChart from "@/components/results/PerformanceChart";
import { calculateVar, createPortfolio, patchPortfolioCache } from "@/lib/api";
import { downloadVarExcel } from "@/lib/export";
import type { StockInfo, StockWeight, VarResult } from "@/types";

type Step = "stocks" | "weights" | "params" | "results";

const STEPS: { id: Step; label: string; desc: string }[] = [
  { id: "stocks", label: "Actions", desc: "Sélection du portefeuille" },
  { id: "weights", label: "Pondérations", desc: "Allocation par action" },
  { id: "params", label: "Paramètres", desc: "Montant, quantile, dates" },
  { id: "results", label: "Résultats", desc: "VaR & métriques de risque" },
];

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 5);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export default function Calculator() {
  const [step, setStep] = useState<Step>("stocks");
  const [selectedStocks, setSelectedStocks] = useState<StockWeight[]>([]);
  const [params, setParams] = useState({
    amount: 100000,
    quantile: 0.05,
    ...getDefaultDates(),
  });
  const [result, setResult] = useState<VarResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  const totalWeight = selectedStocks.reduce((s, x) => s + x.weight, 0);
  const isWeightValid = Math.abs(totalWeight - 1) < 0.001;

  const addStock = (stock: StockInfo) => {
    if (selectedStocks.length >= 20) {
      toast.error("Maximum 20 actions");
      return;
    }
    if (selectedStocks.find((s) => s.ticker === stock.ticker)) return;
    const n = selectedStocks.length + 1;
    const newWeight = 1 / n;
    const normalized = selectedStocks.map((s) => ({ ...s, weight: newWeight }));
    setSelectedStocks([...normalized, { ticker: stock.ticker, weight: newWeight, name: stock.name, index_name: stock.index_name }]);
  };

  const removeStock = (ticker: string) => {
    const remaining = selectedStocks.filter((s) => s.ticker !== ticker);
    if (!remaining.length) { setSelectedStocks([]); return; }
    const w = 1 / remaining.length;
    setSelectedStocks(remaining.map((s) => ({ ...s, weight: w })));
  };

  const handleCalculate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await calculateVar({
        stocks: selectedStocks,
        amount: params.amount,
        quantile: params.quantile,
        start_date: params.startDate,
        end_date: params.endDate,
      });
      setResult(res);
      setStep("results");
      toast.success("VaR calculée avec succès");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Erreur lors du calcul";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!saveName.trim() || !result) return;
    setSaving(true);
    try {
      const portfolio = await createPortfolio({
        name: saveName,
        amount: params.amount,
        quantile: params.quantile,
        start_date: params.startDate,
        end_date: params.endDate,
        stocks: selectedStocks.map((s) => ({
          ticker: s.ticker,
          name: s.name,
          weight: s.weight,
          index_name: s.index_name,
        })),
      });
      await patchPortfolioCache(portfolio.id, result);
      toast.success("Portefeuille sauvegardé !");
      setSaveName("");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep("stocks");
    setSelectedStocks([]);
    setResult(null);
    setParams({ amount: 100000, quantile: 0.05, ...getDefaultDates() });
  };

  const canGoNext = () => {
    if (step === "stocks") return selectedStocks.length >= 2;
    if (step === "weights") return isWeightValid;
    if (step === "params") return params.amount > 0 && params.startDate && params.endDate;
    return false;
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Calculateur VaR</h1>
          <p className="text-text-secondary text-sm mt-1">
            Value at Risk historique 1 jour — CAC 40 / S&P 500 / EuroStoxx 50 / SBF 120
          </p>
        </div>
        {result && (
          <button onClick={reset} className="btn-secondary flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4" />
            Nouveau calcul
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const isActive = s.id === step;
          const isDone = STEPS.findIndex((x) => x.id === step) > i;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <button
                onClick={() => {
                  if (isDone || isActive) setStep(s.id);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm flex-1 ${
                  isActive
                    ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/30"
                    : isDone
                    ? "text-accent-green hover:bg-bg-elevated cursor-pointer"
                    : "text-text-muted cursor-not-allowed"
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isDone ? "bg-accent-green text-white" : isActive ? "bg-accent-blue text-white" : "bg-bg-elevated text-text-muted"
                }`}>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-medium leading-tight">{s.label}</p>
                  <p className="text-xs opacity-70 leading-tight">{s.desc}</p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-text-muted mx-1 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="card animate-slide-up">
        {step === "stocks" && (
          <div className="space-y-4">
            <h2 className="section-title mb-0">Sélection des actions</h2>
            <StockSelector
              selected={selectedStocks}
              onAdd={addStock}
              onRemove={removeStock}
              onValorise={(stocks, amount) => {
                setSelectedStocks(stocks);
                setParams((p) => ({ ...p, amount }));
              }}
            />
          </div>
        )}

        {step === "weights" && (
          <div className="space-y-4">
            <h2 className="section-title">Pondérations du portefeuille</h2>
            <WeightManager
                stocks={selectedStocks}
                onChange={setSelectedStocks}
                onAmountChange={(amount) => setParams((p) => ({ ...p, amount }))}
              />
          </div>
        )}

        {step === "params" && (
          <div className="space-y-4">
            <h2 className="section-title">Paramètres du calcul</h2>
            <ParametersForm params={params} onChange={setParams} />
          </div>
        )}

        {step === "results" && result && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="section-title mb-0">Résultats — VaR Historique</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => downloadVarExcel(result, selectedStocks, params.amount, saveName || "var-portfolio")}
                className="btn-secondary flex items-center gap-2 text-sm py-2"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Nom du portefeuille..."
                className="input w-48 text-sm"
              />
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || saving}
                className="btn-primary flex items-center gap-2 text-sm py-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Résultats : métriques clés + graphiques */}
      {step === "results" && result && (
        <div className="space-y-4 animate-slide-up">
          {/* Métriques clés */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card py-3 px-4 border-red-900/30 bg-red-900/10">
              <p className="text-xs text-text-muted mb-1">VaR {result.confidence_level.toFixed(0)}% — 1 jour</p>
              <p className="text-2xl font-bold font-mono text-accent-red">
                {result.var_amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{result.var_pct.toFixed(3)}% du portefeuille</p>
            </div>
            <div className="card py-3 px-4">
              <p className="text-xs text-text-muted mb-1">Rendement total</p>
              <p className={`text-2xl font-bold font-mono ${result.total_return >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                {result.total_return >= 0 ? "+" : ""}{result.total_return.toFixed(2)}%
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {((result.total_return / 100) * params.amount).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} sur la période
              </p>
            </div>
          </div>

          {/* Composition du portefeuille */}
          <div className="card py-3 px-4">
            <p className="text-xs text-text-muted mb-2">Composition du portefeuille</p>
            <div className="flex flex-wrap gap-2">
              {result.individual_stats.map((s) => (
                <div key={s.ticker} className="flex items-center gap-2 bg-bg-elevated border border-border rounded-lg px-3 py-1.5">
                  <span className="font-mono text-xs text-accent-blue font-medium">{s.ticker}</span>
                  <span className="text-xs text-text-muted">{s.name}</span>
                  <span className="text-xs font-mono text-text-secondary">{(s.weight * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReturnHistogram result={result} />
            <PerformanceChart result={result} amount={params.amount} />
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {step !== "results" && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setStep(STEPS[stepIndex - 1]?.id || "stocks")}
            disabled={stepIndex === 0}
            className="btn-secondary disabled:opacity-30"
          >
            ← Précédent
          </button>

          {step === "params" ? (
            <button
              onClick={handleCalculate}
              disabled={loading || !canGoNext()}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Téléchargement des données...
                </>
              ) : (
                <>
                  Calculer la VaR
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setStep(STEPS[stepIndex + 1].id)}
              disabled={!canGoNext()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

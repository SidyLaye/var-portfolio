import { useState, useEffect } from "react";
import { Trash2, RefreshCw, BarChart3, Loader2, ChevronDown, ChevronUp, ExternalLink, Download } from "lucide-react";
import toast from "react-hot-toast";
import { getPortfolios, deletePortfolio, recalculatePortfolio } from "@/lib/api";
import { downloadVarExcel } from "@/lib/export";
import { formatCurrency, formatPercent } from "@/lib/utils";
import VarCard from "@/components/results/VarCard";
import ReturnHistogram from "@/components/results/ReturnHistogram";
import PerformanceChart from "@/components/results/PerformanceChart";
import StatsTable from "@/components/results/StatsTable";
import type { Portfolio, VarResult } from "@/types";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function History() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [recalcResult, setRecalcResult] = useState<Record<number, VarResult>>({});
  const [recalcLoading, setRecalcLoading] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});

  const fetchPortfolios = async () => {
    try {
      const data = await getPortfolios();
      setPortfolios(data);
    } catch {
      toast.error("Impossible de charger les portefeuilles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPortfolios(); }, []);

  const handleDelete = async (id: number) => {
    setDeleting((d) => ({ ...d, [id]: true }));
    try {
      await deletePortfolio(id);
      setPortfolios((ps) => ps.filter((p) => p.id !== id));
      if (expanded === id) setExpanded(null);
      toast.success("Portefeuille supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting((d) => ({ ...d, [id]: false }));
    }
  };

  const handleRecalculate = async (id: number, amount: number) => {
    setRecalcLoading((r) => ({ ...r, [id]: true }));
    try {
      const result = await recalculatePortfolio(id);
      setRecalcResult((r) => ({ ...r, [id]: result }));
      setExpanded(id);
      toast.success("VaR recalculée !");
      await fetchPortfolios(); // refresh last_var_amount etc.
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erreur lors du calcul");
    } finally {
      setRecalcLoading((r) => ({ ...r, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement des portefeuilles...</span>
        </div>
      </div>
    );
  }

  if (!portfolios.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Historique</h1>
        <div className="card text-center py-16">
          <BarChart3 className="w-12 h-12 mx-auto text-text-muted opacity-30 mb-4" />
          <p className="text-text-secondary font-medium">Aucun portefeuille sauvegardé</p>
          <p className="text-text-muted text-sm mt-1">
            Calculez une VaR et sauvegardez votre portefeuille depuis le calculateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Historique</h1>
          <p className="text-text-secondary text-sm mt-1">
            {portfolios.length} portefeuille{portfolios.length > 1 ? "s" : ""} sauvegardé{portfolios.length > 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={fetchPortfolios} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <div className="space-y-3">
        {portfolios.map((p) => {
          const isExpanded = expanded === p.id;
          const isRecalcLoading = recalcLoading[p.id];
          const recalc = recalcResult[p.id];

          return (
            <div
              key={p.id}
              className="card !p-0 overflow-hidden transition-all"
            >
              {/* Portfolio header */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent-blue/10 border border-accent-blue/20 rounded-xl flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5 text-accent-blue" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{p.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-text-muted mt-1.5">
                        <span>{p.stocks.length} actions</span>
                        <span>•</span>
                        <span>{formatCurrency(p.amount)}</span>
                        <span>•</span>
                        <span>VaR {((1 - p.quantile) * 100).toFixed(0)}%</span>
                        <span>•</span>
                        <span>{p.start_date} → {p.end_date}</span>
                        <span>•</span>
                        <span>Créé le {format(parseISO(p.created_at), "d MMM yyyy", { locale: fr })}</span>
                      </div>

                      {/* Stocks chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.stocks.map((s) => (
                          <span
                            key={s.id}
                            className="font-mono text-xs px-2 py-0.5 bg-bg-elevated border border-border rounded text-accent-blue"
                          >
                            {s.ticker} {(s.weight * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Last VaR */}
                    {p.last_var_amount && (
                      <div className="text-right mr-4">
                        <p className="font-mono text-lg font-bold text-accent-red">
                          {formatCurrency(p.last_var_amount)}
                        </p>
                        <p className="text-xs text-text-muted">VaR calculée</p>
                      </div>
                    )}

                    <button
                      onClick={() => handleRecalculate(p.id, p.amount)}
                      disabled={isRecalcLoading}
                      className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
                    >
                      {isRecalcLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      {p.last_var_amount ? "Recalculer" : "Calculer VaR"}
                    </button>

                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting[p.id]}
                      className="btn-danger flex items-center gap-1.5 text-xs py-2 px-3"
                    >
                      {deleting[p.id] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {recalc && (
                      <button
                        onClick={() => downloadVarExcel(recalc, p.stocks.map(s => ({ ticker: s.ticker, weight: s.weight, name: s.name })), p.amount, p.name)}
                        className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
                        title="Télécharger Excel"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {recalc && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : p.id)}
                        className="btn-secondary p-2"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded results */}
              {isExpanded && recalc && (
                <div className="border-t border-border p-5 bg-bg-secondary space-y-4 animate-slide-up">
                  <VarCard result={recalc} amount={p.amount} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ReturnHistogram result={recalc} />
                    <PerformanceChart result={recalc} amount={p.amount} />
                  </div>
                  <StatsTable
                    stats={recalc.individual_stats}
                    excludedTickers={recalc.excluded_tickers}
                    varWindowStart={recalc.var_window_start}
                    varWindowEnd={recalc.var_window_end}
                    perfWindowStart={recalc.perf_window_start}
                    perfWindowEnd={recalc.perf_window_end}
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

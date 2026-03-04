import { TrendingDown, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { VarResult } from "@/types";

interface Props {
  result: VarResult;
  amount: number;
}

export default function VarCard({ result, amount }: Props) {
  const metrics = [
    {
      label: `VaR ${result.confidence_level.toFixed(0)}% (1J)`,
      value: formatCurrency(result.var_amount),
      sub: `${result.var_pct.toFixed(3)}% du portefeuille`,
      icon: TrendingDown,
      color: "text-accent-red",
      bg: "bg-red-900/10 border-red-900/30",
      iconBg: "bg-red-900/20",
    },
    {
      label: "Volatilité annualisée",
      value: `${result.portfolio_volatility.toFixed(2)}%`,
      sub: "Écart-type des rendements × √252",
      icon: Activity,
      color: "text-accent-blue",
      bg: "bg-blue-900/10 border-blue-900/30",
      iconBg: "bg-blue-900/20",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Hero VaR metric */}
      <div className="card bg-gradient-to-br from-red-950/30 to-bg-card border-red-900/30">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-text-secondary text-sm mb-1">
              Value at Risk — {result.confidence_level.toFixed(0)}% de confiance — Historique 1J
            </p>
            <p className="text-4xl font-bold text-accent-red font-mono">
              {formatCurrency(result.var_amount)}
            </p>
            <p className="text-text-secondary mt-2 text-sm">
              Sur un portefeuille de{" "}
              <span className="text-text-primary font-medium">{formatCurrency(amount)}</span>,
              avec {result.confidence_level.toFixed(0)}% de probabilité, la perte journalière
              ne dépassera pas{" "}
              <span className="text-accent-red font-medium">
                {formatCurrency(result.var_amount)}
              </span>{" "}
              ({Math.abs(result.var_pct).toFixed(3)}%).
            </p>
          </div>
          <div className="bg-red-900/20 rounded-xl p-4 border border-red-900/30">
            <TrendingDown className="w-8 h-8 text-accent-red" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
          <span>{result.nb_observations} jours de données</span>
          <span>•</span>
          <span>Rendement moyen annuel : {result.portfolio_mean_return.toFixed(2)}%</span>
          <span>•</span>
          <span>Observations en breach : {Math.round(result.nb_observations * (1 - result.confidence_level / 100))}</span>
        </div>
        {(result.var_window_start || result.perf_window_start) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {result.var_window_start && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/20 border border-red-900/30 text-xs text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-red shrink-0" />
                <span className="text-text-secondary font-medium">Fenêtre VaR</span>
                {result.var_window_start} → {result.var_window_end}
              </span>
            )}
            {result.perf_window_start && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-900/20 border border-blue-900/30 text-xs text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0" />
                <span className="text-text-secondary font-medium">Fenêtre perf</span>
                {result.perf_window_start} → {result.perf_window_end}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(({ label, value, sub, icon: Icon, color, bg, iconBg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${iconBg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-text-muted mt-0.5 leading-tight">{label}</p>
            <p className="text-xs text-text-muted/70 mt-1 leading-tight">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

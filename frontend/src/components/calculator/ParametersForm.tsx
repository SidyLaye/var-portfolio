import { Calendar, DollarSign, Percent, Info, TrendingUp } from "lucide-react";

interface Params {
  amount: number;
  quantile: number;
  startDate: string;
  endDate: string;
}

interface Props {
  params: Params;
  onChange: (params: Params) => void;
}

const CONFIDENCE_PRESETS = [
  { label: "90%", value: 0.10 },
  { label: "95%", value: 0.05 },
  { label: "99%", value: 0.01 },
  { label: "99.9%", value: 0.001 },
];

const PERF_PRESETS = [
  { label: "1 an", years: 1 },
  { label: "2 ans", years: 2 },
  { label: "5 ans", years: 5 },
  { label: "10 ans", years: 10 },
];

function perfStart(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().split("T")[0];
}

export default function ParametersForm({ params, onChange }: Props) {
  const confidencePct = ((1 - params.quantile) * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Montant investi */}
      <div>
        <label className="label">Montant investi (€)</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="number"
            value={params.amount}
            onChange={(e) =>
              onChange({ ...params, amount: parseFloat(e.target.value) || 0 })
            }
            min={1000}
            step={1000}
            className="input pl-9"
            placeholder="100000"
          />
        </div>
        <p className="text-xs text-text-muted mt-1">
          Montant total du portefeuille en euros
        </p>
      </div>

      {/* Quantile / Niveau de confiance */}
      <div>
        <label className="label">
          Niveau de confiance — {confidencePct}%
        </label>
        <div className="flex gap-2 mb-2">
          {CONFIDENCE_PRESETS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => onChange({ ...params, quantile: value })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                Math.abs(params.quantile - value) < 0.0001
                  ? "bg-accent-blue text-white border-accent-blue"
                  : "bg-bg-elevated text-text-secondary border-border hover:border-accent-blue/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="number"
            value={(params.quantile * 100).toFixed(2)}
            onChange={(e) =>
              onChange({
                ...params,
                quantile: Math.min(0.5, Math.max(0.001, parseFloat(e.target.value) / 100 || 0.05)),
              })
            }
            min={0.1}
            max={50}
            step={0.1}
            className="input"
            placeholder="5"
          />
          <span className="text-xs text-text-muted whitespace-nowrap">% (quantile)</span>
        </div>
        <div className="flex items-start gap-1.5 mt-2">
          <Info className="w-3.5 h-3.5 text-accent-blue shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted">
            Quantile de {(params.quantile * 100).toFixed(1)}% = les{" "}
            {(params.quantile * 100).toFixed(1)}% pires jours de l'historique
          </p>
        </div>
      </div>

      {/* Date de fin */}
      <div>
        <label className="label">Date de référence (fin)</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="date"
            value={params.endDate}
            onChange={(e) => onChange({ ...params, endDate: e.target.value })}
            className="input pl-9"
          />
        </div>
        <div className="flex items-start gap-1.5 mt-2">
          <Info className="w-3.5 h-3.5 text-accent-blue shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted">
            La VaR utilise toutes les données disponibles depuis la première cotation jusqu'à cette date
          </p>
        </div>
      </div>

      {/* Période du graphique de performance */}
      <div>
        <label className="label flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-accent-green" />
          Graphique de performance
        </label>
        <div className="flex gap-2 mb-2">
          {PERF_PRESETS.map(({ label, years }) => (
            <button
              key={label}
              onClick={() => onChange({ ...params, startDate: perfStart(years) })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                params.startDate === perfStart(years)
                  ? "bg-accent-green/20 text-accent-green border-accent-green/40"
                  : "bg-bg-elevated text-text-secondary border-border hover:border-accent-green/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="date"
            value={params.startDate}
            onChange={(e) => onChange({ ...params, startDate: e.target.value })}
            className="input pl-9"
          />
        </div>
        <p className="text-xs text-text-muted mt-1">
          Début d'affichage du graphique de rendement
        </p>
      </div>
    </div>
  );
}

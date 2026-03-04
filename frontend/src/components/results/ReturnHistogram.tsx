import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { VarResult } from "@/types";

interface Props {
  result: VarResult;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-text-secondary mb-1">Rendement journalier</p>
      <p className="font-mono text-text-primary font-medium">{d.x.toFixed(3)}%</p>
      <p className="text-text-muted mt-1">{d.count} jours</p>
      {d.isVar && (
        <p className="text-accent-red mt-1 font-medium">⚠ Zone de perte VaR</p>
      )}
    </div>
  );
};

export default function ReturnHistogram({ result }: Props) {
  const varLine = result.var_pct;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="section-title mb-1">Distribution des rendements</h3>
          <p className="text-xs text-text-muted">
            Histogramme empirique — {result.nb_observations} observations journalières
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-accent-red rounded-sm opacity-80" />
            <span className="text-text-secondary">Zone VaR ({result.confidence_level.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-accent-blue rounded-sm opacity-80" />
            <span className="text-text-secondary">Rendements normaux</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={result.returns_histogram} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="x"
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <ReferenceLine
            x={varLine}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: `VaR ${varLine.toFixed(2)}%`,
              fill: "#ef4444",
              fontSize: 10,
              fontFamily: "JetBrains Mono",
              position: "top",
            }}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {result.returns_histogram.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isVar ? "#ef444499" : "#3b82f699"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-text-muted">Rendement moyen (annuel)</p>
          <p className={`font-mono text-sm font-medium mt-1 ${result.portfolio_mean_return > 0 ? "text-accent-green" : "text-accent-red"}`}>
            {result.portfolio_mean_return > 0 ? "+" : ""}{result.portfolio_mean_return.toFixed(2)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">VaR journalière</p>
          <p className="font-mono text-sm font-medium mt-1 text-accent-red">
            {result.var_pct.toFixed(3)}%
          </p>
        </div>
      </div>
    </div>
  );
}

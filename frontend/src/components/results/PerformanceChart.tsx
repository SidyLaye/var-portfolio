import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import type { VarResult } from "@/types";

interface Props {
  result: VarResult;
  amount: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-text-secondary mb-2">
        {format(parseISO(d.date), "d MMM yyyy", { locale: fr })}
      </p>
      <p className="font-mono text-text-primary font-medium">
        {formatCurrency(d.value)}
      </p>
      <p className={`mt-1 font-mono ${d.cumReturn >= 0 ? "text-accent-green" : "text-accent-red"}`}>
        {d.cumReturn >= 0 ? "+" : ""}{d.cumReturn.toFixed(2)}%
      </p>
    </div>
  );
};

export default function PerformanceChart({ result, amount }: Props) {
  const isPositive = result.total_return > 0;

  // Sample data to avoid too many points (max 500 for performance)
  const data = result.portfolio_performance.length > 500
    ? result.portfolio_performance.filter((_, i) => i % Math.ceil(result.portfolio_performance.length / 500) === 0)
    : result.portfolio_performance;

  // Format x-axis labels
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM yy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="section-title mb-1">Performance du portefeuille</h3>
          <p className="text-xs text-text-muted">Valeur reconstituée sur la période d'historique</p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-lg font-bold ${isPositive ? "text-accent-green" : "text-accent-red"}`}>
            {isPositive ? "+" : ""}{result.total_return.toFixed(2)}%
          </p>
          <p className="text-xs text-text-muted">Rendement total</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.15} />
              <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={amount}
            stroke="#475569"
            strokeDasharray="4 4"
            label={{
              value: "Initial",
              fill: "#475569",
              fontSize: 10,
              position: "right",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? "#22c55e" : "#ef4444"}
            strokeWidth={2}
            fill="url(#colorValue)"
            dot={false}
            activeDot={{ r: 4, fill: isPositive ? "#22c55e" : "#ef4444", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

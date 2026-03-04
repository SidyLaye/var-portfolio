import { ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { getSectorBg } from "@/lib/utils";
import type { IndividualStockStats } from "@/types";

interface Props {
  stats: IndividualStockStats[];
  excludedTickers?: string[];
  varWindowStart?: string;
  varWindowEnd?: string;
  perfWindowStart?: string;
  perfWindowEnd?: string;
}

const COL_HEADERS = [
  { key: "ticker", label: "Action" },
  { key: "weight", label: "Poids" },
  { key: "mean_return_annual", label: "Rdt annuel" },
  { key: "volatility_annual", label: "Volatilité" },
  { key: "total_return", label: "Rdt total" },
];

export default function StatsTable({
  stats,
  excludedTickers = [],
  varWindowStart,
  varWindowEnd,
  perfWindowStart,
  perfWindowEnd,
}: Props) {
  const sorted = [...stats].sort((a, b) => b.weight - a.weight);

  return (
    <div className="card">
      <h3 className="section-title">Contribution individuelle au risque</h3>

      {excludedTickers.length > 0 && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-yellow-900/10 border border-yellow-900/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-accent-yellow shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-accent-yellow font-medium mb-1">
              {excludedTickers.length} action{excludedTickers.length > 1 ? "s" : ""} exclue{excludedTickers.length > 1 ? "s" : ""} — aucune donnée Yahoo Finance
            </p>
            <p className="text-text-muted">
              {excludedTickers.join(", ")} — Les pondérations ont été rééquilibrées automatiquement.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            {/* Group header row */}
            <tr>
              <th colSpan={2} className="pb-1 pr-4" />
              <th colSpan={3} className="pb-1 text-left">
                <span className="inline-flex items-center gap-1 text-accent-blue/70 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue/70 shrink-0" />
                  Fenêtre perf{perfWindowStart ? ` · ${perfWindowStart} → ${perfWindowEnd}` : ""}
                </span>
              </th>
            </tr>
            <tr className="border-b border-border">
              {COL_HEADERS.map(({ label }) => (
                <th
                  key={label}
                  className="text-left text-text-muted font-medium pb-3 pr-4 whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.map((stock) => {
              const isPositiveReturn = stock.total_return > 0;
              const isMeanPositive = stock.mean_return_annual > 0;

              return (
                <tr key={stock.ticker} className="hover:bg-bg-elevated/50 transition-colors">
                  {/* Action */}
                  <td className="py-3 pr-4">
                    <div>
                      <span className="font-mono text-accent-blue font-medium">
                        {stock.ticker}
                      </span>
                      <p className="text-text-muted mt-0.5 max-w-[150px] truncate">
                        {stock.name}
                      </p>
                    </div>
                  </td>

                  {/* Poids */}
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-blue rounded-full"
                          style={{ width: `${stock.weight * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-text-primary">
                        {(stock.weight * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  {/* Rendement annuel */}
                  <td className="py-3 pr-4">
                    <span className={`font-mono font-medium ${isMeanPositive ? "text-accent-green" : "text-accent-red"}`}>
                      {isMeanPositive ? "+" : ""}{stock.mean_return_annual.toFixed(2)}%
                    </span>
                  </td>

                  {/* Volatilité */}
                  <td className="py-3 pr-4">
                    <span className={`font-mono ${stock.volatility_annual > 30 ? "text-accent-red" : stock.volatility_annual > 20 ? "text-accent-yellow" : "text-accent-green"}`}>
                      {stock.volatility_annual.toFixed(2)}%
                    </span>
                  </td>

                  {/* Rendement total */}
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      {isPositiveReturn ? (
                        <ArrowUp className="w-3 h-3 text-accent-green" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-accent-red" />
                      )}
                      <span className={`font-mono ${isPositiveReturn ? "text-accent-green" : "text-accent-red"}`}>
                        {isPositiveReturn ? "+" : ""}{stock.total_return.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-xs text-text-muted">
        <div>
          <span className="text-accent-green">■</span> Volatilité &lt; 20%
        </div>
        <div>
          <span className="text-accent-yellow">■</span> Volatilité 20–30%
        </div>
        <div>
          <span className="text-accent-red">■</span> Volatilité &gt; 30%
        </div>
      </div>
    </div>
  );
}

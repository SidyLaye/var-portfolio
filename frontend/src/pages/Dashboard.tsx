import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingDown, Activity, FolderOpen, Calculator,
  ArrowRight, BarChart3, AlertTriangle, ChevronUp, ChevronDown, Minus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getPortfolios } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Portfolio } from "@/types";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type SortCol = "var_pct" | "var_amount" | "volatility" | "amount";

function varRisk(pct: number) {
  if (pct >= 3)   return { label: "Élevé",  cls: "text-accent-red    bg-red-900/20    border-red-900/30"    };
  if (pct >= 1.5) return { label: "Modéré", cls: "text-accent-yellow bg-yellow-900/20 border-yellow-900/30" };
  return              { label: "Faible", cls: "text-accent-green  bg-green-900/20  border-green-900/30"  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy]   = useState<SortCol>("var_pct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    getPortfolios().then(setPortfolios).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const withVar = portfolios.filter((p) => p.last_var_amount != null);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalCapital = portfolios.reduce((s, p) => s + p.amount, 0);
  const avgVarPct    = withVar.length
    ? withVar.reduce((s, p) => s + Math.abs(p.last_var_pct ?? 0), 0) / withVar.length
    : 0;
  const withVol      = withVar.filter((p) => p.last_volatility != null);
  const avgVol       = withVol.length
    ? withVol.reduce((s, p) => s + (p.last_volatility ?? 0), 0) / withVol.length
    : 0;
  const maxVarPct    = withVar.length
    ? Math.max(...withVar.map((p) => Math.abs(p.last_var_pct ?? 0)))
    : 0;

  // ── Sort ────────────────────────────────────────────────────────────────────
  const handleSort = (col: SortCol) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  const sorted = [...withVar].sort((a, b) => {
    const val = (p: Portfolio) =>
      sortBy === "var_pct"    ? Math.abs(p.last_var_pct  ?? 0) :
      sortBy === "var_amount" ? (p.last_var_amount ?? 0)        :
      sortBy === "volatility" ? (p.last_volatility ?? 0)        :
      p.amount;
    return sortDir === "desc" ? val(b) - val(a) : val(a) - val(b);
  });

  // ── Chart data (top 8 by VaR%) ───────────────────────────────────────────
  const chartData = [...withVar]
    .sort((a, b) => Math.abs(b.last_var_pct ?? 0) - Math.abs(a.last_var_pct ?? 0))
    .slice(0, 8)
    .map((p) => ({
      name:       p.name.length > 14 ? p.name.slice(0, 13) + "…" : p.name,
      var_pct:    Math.abs(p.last_var_pct ?? 0),
      var_amount: p.last_var_amount ?? 0,
    }));

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function SortIcon({ col }: { col: SortCol }) {
    if (sortBy !== col) return <Minus className="w-3 h-3 opacity-30" />;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3" />
      : <ChevronUp   className="w-3 h-3" />;
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">Analyse de risque — Portefeuilles VaR historique</p>
        </div>
        <button onClick={() => navigate("/calculator")} className="btn-primary flex items-center gap-2 text-sm">
          <Calculator className="w-4 h-4" />
          Nouveau calcul
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: FolderOpen, label: "Portefeuilles",
            value: portfolios.length.toString(),
            sub: `${withVar.length} avec VaR calculée`,
            color: "text-accent-blue", bg: "bg-blue-900/10 border-blue-900/30",
          },
          {
            icon: TrendingDown, label: "Capital total géré",
            value: totalCapital > 0 ? formatCurrency(totalCapital) : "—",
            sub: `${portfolios.length} portefeuille${portfolios.length > 1 ? "s" : ""}`,
            color: "text-accent-green", bg: "bg-green-900/10 border-green-900/30",
          },
          {
            icon: AlertTriangle, label: "VaR % moyenne (95%)",
            value: withVar.length ? `${avgVarPct.toFixed(3)}%` : "—",
            sub: `Max : ${maxVarPct.toFixed(3)}%`,
            color: "text-accent-red", bg: "bg-red-900/10 border-red-900/30",
          },
          {
            icon: Activity, label: "Volatilité moyenne",
            value: avgVol > 0 ? `${avgVol.toFixed(2)}%` : "—",
            sub: "Annualisée (σ × √252)",
            color: "text-accent-blue", bg: "bg-blue-900/10 border-blue-900/30",
          },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className={`card py-4 px-4 border ${bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-text-muted">{label}</p>
            </div>
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Analytics: chart + table */}
      {withVar.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Bar chart */}
          <div className="card lg:col-span-2">
            <h2 className="section-title">VaR % par portefeuille</h2>
            <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 36)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#888" }}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  type="category" dataKey="name"
                  tick={{ fontSize: 10, fill: "#aaa" }} width={90}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === "var_pct" ? [`${v.toFixed(4)}%`, "VaR %"] : [formatCurrency(v), "VaR €"]
                  }
                  contentStyle={{ background: "#1e1e2e", border: "1px solid #2a2a3a", fontSize: 11, borderRadius: 8 }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="var_pct" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => {
                    const risk = varRisk(entry.var_pct);
                    const fill = risk.label === "Élevé" ? "#ef4444" : risk.label === "Modéré" ? "#f97316" : "#3b82f6";
                    return <Cell key={i} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-red inline-block" />≥ 3% Élevé</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />1.5–3% Modéré</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-blue inline-block" />&lt; 1.5% Faible</span>
            </div>
          </div>

          {/* Sortable risk table */}
          <div className="card lg:col-span-3 !p-0 overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
              <h2 className="section-title mb-0">Classement par risque</h2>
              <span className="text-xs text-text-muted">{sorted.length} portefeuilles</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated/40">
                    {([
                      { key: null,         label: "Portefeuille" },
                      { key: "var_pct",    label: "VaR %" },
                      { key: "var_amount", label: "VaR €" },
                      { key: "volatility", label: "Volatilité" },
                      { key: "amount",     label: "Capital" },
                      { key: null,         label: "Niveau" },
                    ] as { key: SortCol | null; label: string }[]).map(({ key, label }) => (
                      <th
                        key={label}
                        onClick={() => key && handleSort(key)}
                        className={`text-left px-4 py-2.5 text-text-muted font-medium whitespace-nowrap select-none ${key ? "cursor-pointer hover:text-text-primary" : ""}`}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          {key && <SortIcon col={key} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sorted.map((p) => {
                    const varPct = Math.abs(p.last_var_pct ?? 0);
                    const risk   = varRisk(varPct);
                    return (
                      <tr key={p.id} className="hover:bg-bg-elevated/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary leading-tight">{p.name}</p>
                          <p className="text-text-muted mt-0.5">
                            {p.stocks.length} actions · {format(parseISO(p.created_at), "d MMM yy", { locale: fr })}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-accent-red">{varPct.toFixed(3)}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-accent-red">{formatCurrency(p.last_var_amount!)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono ${
                            (p.last_volatility ?? 0) > 30 ? "text-accent-red" :
                            (p.last_volatility ?? 0) > 20 ? "text-accent-yellow" :
                            "text-accent-green"
                          }`}>
                            {p.last_volatility != null ? `${p.last_volatility.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-text-secondary">{formatCurrency(p.amount)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${risk.cls}`}>
                            {risk.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Methodology + nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card space-y-3">
          <h2 className="section-title">Navigation</h2>
          <button
            onClick={() => navigate("/calculator")}
            className="w-full flex items-center justify-between p-4 bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/20 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-accent-blue" />
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary">Nouveau calcul VaR</p>
                <p className="text-xs text-text-muted">Analyse historique 1 jour</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={() => navigate("/history")}
            className="w-full flex items-center justify-between p-4 bg-bg-elevated hover:bg-bg-elevated/80 border border-border rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-text-secondary" />
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary">Historique</p>
                <p className="text-xs text-text-muted">Vos portefeuilles sauvegardés</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="section-title">Méthodologie VaR Historique</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { n: "1", color: "blue",  title: "Rendements historiques",  desc: "rᵢ = (Pᵢ − Pᵢ₋₁) / Pᵢ₋₁"        },
              { n: "2", color: "green", title: "Rendement du portefeuille", desc: "R = Σ(wᵢ × rᵢ) — fenêtre 20 ans" },
              { n: "3", color: "red",   title: "Quantile empirique",        desc: "k = ⌊n × q⌋  →  VaR = R_trié[k]" },
            ].map(({ n, color, title, desc }) => (
              <div key={n} className="bg-bg-elevated rounded-lg p-3 border border-border">
                <div className={`w-7 h-7 bg-accent-${color}/20 rounded-lg flex items-center justify-center mb-2`}>
                  <span className={`text-accent-${color} font-bold text-sm`}>{n}</span>
                </div>
                <p className="font-medium text-text-primary text-xs mb-1">{title}</p>
                <p className="text-[11px] text-text-muted font-mono leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg flex items-start gap-2">
            <BarChart3 className="w-4 h-4 text-accent-blue shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted leading-relaxed">
              <strong className="text-text-secondary">Fenêtre VaR :</strong> 20 ans glissants jusqu'à la date de fin —{" "}
              <strong className="text-text-secondary">Fenêtre perf :</strong> période choisie par l'utilisateur.
            </p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {portfolios.length === 0 && !loading && (
        <div className="card text-center py-12">
          <TrendingDown className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-30" />
          <p className="text-text-secondary font-medium">Aucun portefeuille sauvegardé</p>
          <p className="text-text-muted text-sm mt-1 mb-6">
            Calculez votre première VaR et sauvegardez votre portefeuille
          </p>
          <button onClick={() => navigate("/calculator")} className="btn-primary inline-flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Commencer
          </button>
        </div>
      )}
    </div>
  );
}

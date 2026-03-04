import * as XLSX from "xlsx";
import type { VarResult, StockWeight } from "@/types";

export function downloadVarExcel(result: VarResult, stocks: StockWeight[], amount: number, name = "var-portfolio") {
  const wb = XLSX.utils.book_new();

  // ── Feuille 1 : Résumé ────────────────────────────────────────────────────
  const summary = [
    ["Indicateur", "Valeur"],
    ["Niveau de confiance", `${result.confidence_level.toFixed(0)}%`],
    ["VaR 1J (montant)", result.var_amount],
    ["VaR 1J (%)", result.var_pct],
    ["Volatilité annualisée (%)", result.portfolio_volatility],
    ["Rendement moyen annuel (%)", result.portfolio_mean_return],
    ["Max Drawdown (%)", result.max_drawdown],
    ["Rendement total (%)", result.total_return],
    ["Nb observations (VaR)", result.nb_observations],
    ["Fenêtre VaR", result.var_window_start && result.var_window_end ? `${result.var_window_start} → ${result.var_window_end}` : ""],
    ["Fenêtre perf", result.perf_window_start && result.perf_window_end ? `${result.perf_window_start} → ${result.perf_window_end}` : ""],
    ["Montant investi", amount],
    ...(result.excluded_tickers.length > 0 ? [["Tickers exclus", result.excluded_tickers.join(", ")]] : []),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!cols"] = [{ wch: 35 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

  // ── Feuille 2 : Portefeuille ──────────────────────────────────────────────
  const portfolioHeader = [
    "Ticker", "Nom", "Poids (%)", "Rdt annuel (%)", "Volatilité (%)", "Rdt total (%)",
  ];
  const portfolioRows = result.individual_stats.map((s) => [
    s.ticker,
    s.name,
    parseFloat((s.weight * 100).toFixed(2)),
    s.mean_return_annual,
    s.volatility_annual,
    s.total_return,
  ]);
  const wsPortfolio = XLSX.utils.aoa_to_sheet([portfolioHeader, ...portfolioRows]);
  wsPortfolio["!cols"] = [{ wch: 10 }, { wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsPortfolio, "Portefeuille");

  // ── Feuille 3 : Performance ───────────────────────────────────────────────
  const perfHeader = ["Date", "Valeur du portefeuille", "Rendement cumulé (%)"];
  const perfRows = result.portfolio_performance.map((p) => [p.date, p.value, p.cumReturn]);
  const wsPerf = XLSX.utils.aoa_to_sheet([perfHeader, ...perfRows]);
  wsPerf["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsPerf, "Performance");

  // ── Feuille 4 : Histogramme ───────────────────────────────────────────────
  const histHeader = ["Rendement centre (%)", "Nombre de jours", "En breach VaR"];
  const histRows = result.returns_histogram.map((h) => [h.x, h.count, h.isVar ? "Oui" : "Non"]);
  const wsHist = XLSX.utils.aoa_to_sheet([histHeader, ...histRows]);
  wsHist["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsHist, "Histogramme");

  // ── Feuille 5 : Corrélations ──────────────────────────────────────────────
  const tickers = [...new Set(result.correlation_matrix.map((c) => c.x))];
  const corrHeader = ["", ...tickers];
  const corrRows = tickers.map((t1) => [
    t1,
    ...tickers.map((t2) => result.correlation_matrix.find((c) => c.x === t1 && c.y === t2)?.value ?? ""),
  ]);
  const wsCorr = XLSX.utils.aoa_to_sheet([corrHeader, ...corrRows]);
  wsCorr["!cols"] = [{ wch: 12 }, ...tickers.map(() => ({ wch: 10 }))];
  XLSX.utils.book_append_sheet(wb, wsCorr, "Corrélations");

  // ── Export ────────────────────────────────────────────────────────────────
  XLSX.writeFile(wb, `${name}.xlsx`);
}

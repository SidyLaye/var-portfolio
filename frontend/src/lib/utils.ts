import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function getSectorColor(sector?: string): string {
  const colors: Record<string, string> = {
    Technology: "text-accent-blue",
    Financials: "text-accent-green",
    Healthcare: "text-accent-purple",
    Consumer: "text-accent-yellow",
    Energy: "text-orange-400",
    Industrials: "text-cyan-400",
    Materials: "text-emerald-400",
    Communication: "text-pink-400",
    Utilities: "text-teal-400",
    "Real Estate": "text-amber-400",
  };
  return colors[sector || ""] || "text-text-secondary";
}

export function getSectorBg(sector?: string): string {
  const colors: Record<string, string> = {
    Technology: "bg-blue-900/20 text-accent-blue border-blue-900/40",
    Financials: "bg-green-900/20 text-accent-green border-green-900/40",
    Healthcare: "bg-purple-900/20 text-purple-400 border-purple-900/40",
    Consumer: "bg-yellow-900/20 text-accent-yellow border-yellow-900/40",
    Energy: "bg-orange-900/20 text-orange-400 border-orange-900/40",
    Industrials: "bg-cyan-900/20 text-cyan-400 border-cyan-900/40",
    Materials: "bg-emerald-900/20 text-emerald-400 border-emerald-900/40",
    Communication: "bg-pink-900/20 text-pink-400 border-pink-900/40",
    Utilities: "bg-teal-900/20 text-teal-400 border-teal-900/40",
    "Real Estate": "bg-amber-900/20 text-amber-400 border-amber-900/40",
  };
  return colors[sector || ""] || "bg-gray-900/20 text-text-secondary border-gray-800";
}

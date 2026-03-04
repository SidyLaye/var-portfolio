import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  History,
  TrendingDown,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/calculator", icon: Calculator, label: "Calculateur" },
  { to: "/history", icon: History, label: "Historique" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-bg-secondary border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-text-primary text-sm">VaR Portfolio</p>
            <p className="text-xs text-text-muted">Risk Calculator</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="bg-bg-elevated rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-xs font-medium text-text-primary">Méthode</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            VaR Historique 1D — Percentile empirique des rendements journaliers.
          </p>
        </div>
      </div>
    </aside>
  );
}

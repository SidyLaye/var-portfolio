# VaR Portfolio — Calculateur de Risque

Application de calcul de la **Value at Risk (VaR) historique 1 jour** pour un portefeuille d'actions.

## Stack technique

| Couche | Technologie |
|--------|------------|
| Backend | FastAPI + Python |
| Base de données | SQLite (via SQLAlchemy async) |
| Données de marché | yfinance |
| Frontend | React 18 + TypeScript |
| UI | Tailwind CSS (dark theme fintech) |
| Charts | Recharts |

## Lancer le projet

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API disponible sur http://localhost:8000
Documentation Swagger : http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Application disponible sur http://localhost:5173

## Fonctionnalités

- **Sélection d'actions** : CAC 40, S&P 500, EuroStoxx 50, SBF 120 (10 à 20 actions)
- **Gestion des pondérations** : sliders interactifs avec validation (somme = 100%)
- **Paramètres flexibles** : montant, quantile (90%/95%/99%/99.9%), période d'historique
- **VaR Historique 1J** : calcul par percentile empirique des rendements journaliers
- **CVaR / Expected Shortfall** : perte moyenne au-delà de la VaR
- **Métriques avancées** : Sharpe, volatilité annualisée, Max Drawdown, rendement total
- **Graphiques** :
  - Distribution des rendements (histogramme avec ligne VaR)
  - Performance du portefeuille (valeur reconstruite sur la période)
  - Contribution individuelle au risque (tableau détaillé)
- **Sauvegarde** : persistance SQLite des portefeuilles
- **Historique** : recalcul à la demande sur les données actuelles

## Formules

```
Rendement journalier : r_t = (P_t - P_{t-1}) / P_{t-1}
Rendement portefeuille : R_t = Σ(w_i × r_i_t)
VaR historique : VaR = |quantile(R, q)| × Montant
CVaR : E[R | R ≤ VaR_pct]
Volatilité annuelle : σ × √252
Sharpe : (μ_annuel - r_f) / σ_annuel  (r_f = 3%)
```

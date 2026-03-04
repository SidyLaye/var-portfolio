# VaR Portfolio — Calculateur de Risque Historique

Plateforme web de calcul de la **Value at Risk (VaR) historique 1 jour** pour des portefeuilles d'actions (CAC 40, S&P 500, EuroStoxx 50, SBF 120).

> Développé par **Sidy Laye Sarr**, **Moulaye Koutam** et **Abdoulaye Diop** — M2 Finance EFREI 2025/2026

---

## Stack technique

| Couche | Technologie |
|---|---|
| Backend API | FastAPI 0.115 + Python 3.11 |
| Base de données | SQLite via SQLAlchemy async (aiosqlite) |
| Données de marché | Yahoo Finance (curl_cffi) |
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS (dark theme) |
| Graphiques | Recharts |
| Reverse proxy (prod) | Nginx |

---

## Déploiement rapide avec Docker

### Prérequis
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2

### Lancer l'application

```bash
git clone https://github.com/SidyLaye/var-portfolio.git
cd var-portfolio
docker compose up --build -d
```

L'application est accessible sur **http://localhost**

Pour arrêter :
```bash
docker compose down
```

Pour supprimer aussi les données (base SQLite) :
```bash
docker compose down -v
```

### Architecture Docker

```
┌─────────────────────────────────────────────┐
│  Navigateur → http://localhost              │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  frontend (Nginx :80)                │   │
│  │  • sert les fichiers React buildés   │   │
│  │  • proxy /api/ → backend:8000        │   │
│  └───────────────┬──────────────────────┘   │
│                  │ http://backend:8000/      │
│  ┌───────────────▼──────────────────────┐   │
│  │  backend (FastAPI :8000)             │   │
│  │  • calcule la VaR                    │   │
│  │  • stocke les portefeuilles (SQLite) │   │
│  │  • volume persistant : db_data       │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Développement local (sans Docker)

### Prérequis
- Python 3.11+
- Node.js 20+

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API disponible sur http://localhost:8000
Documentation Swagger : http://localhost:8000/docs

### 2. Frontend

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev
```

Application disponible sur http://localhost:5173

> Le proxy Vite redirige automatiquement `/api/*` vers `http://localhost:8000/*` en développement.

---

## Structure du projet

```
var-portfolio/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # Point d'entrée FastAPI
│       ├── config.py            # Settings (DATABASE_URL, CORS_ORIGINS)
│       ├── models.py            # Entités SQLAlchemy
│       ├── schemas.py           # Schémas Pydantic
│       ├── routers/
│       │   ├── var.py           # POST /var/calculate
│       │   ├── portfolios.py    # CRUD /portfolios/
│       │   └── stocks.py        # GET /stocks/
│       └── services/
│           ├── var_calculator.py  # Calcul VaR (méthode SMALL)
│           └── data_fetcher.py    # Yahoo Finance
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx    # KPIs + classement des portefeuilles
        │   ├── Calculator.tsx   # Stepper 4 étapes
        │   └── History.tsx      # Historique + recalcul
        ├── components/
        │   └── results/         # VarCard, Histogramme, Performance
        └── lib/
            ├── api.ts           # Appels HTTP (axios)
            └── export.ts        # Export Excel (SheetJS)
```

---

## Fonctionnalités

- **Sélection d'actifs** — recherche dans CAC 40 / S&P 500 / EuroStoxx 50 / SBF 120 ou tout titre Yahoo Finance
- **Pondérations** — saisie manuelle ou valorisation par nombre d'actions × cours actuel
- **VaR historique 1J** — méthode SMALL conforme au cours Stat M2 EFREI (`k = ⌊n × q⌋`)
- **Double fenêtre** — VaR sur 20 ans glissants, performance sur période libre
- **Graphiques** — histogramme des rendements (zone VaR surlignée), courbe de valeur cumulée
- **Dashboard analytique** — KPIs, classement par risque (Faible / Modéré / Élevé)
- **Export Excel** — formules natives (`SMALL`, `AVERAGE`, `INDEX`, `FLOOR`)
- **Historique** — sauvegarde, recalcul et suppression des portefeuilles

---

## Formules implémentées

```
Rendement journalier   : r_t = (P_t - P_{t-1}) / P_{t-1}
Rendement portefeuille : R_t = Σ(w_i × r_{i,t})
k                      : k = ⌊n × q⌋   (FLOOR en Excel)
VaR historique         : VaR = R_trié[k]  (SMALL(R, k) en Excel)
VaR en euros           : VaR_€ = |VaR| × Montant
Volatilité annualisée  : σ_p × √252
```

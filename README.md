# Hybrid AI–NWP Multi-Model Forecast Blending System

**Organisation:** Ministry of Earth Sciences (MoES) / NCMRWF  
**Project:** Smart India Hackathon 2026 Prototype  
**Status:** Step 1 — Project Foundation ✅

---

## What This System Does

This is a professional operational-grade web application that:

- **Blends multiple weather forecast models** (NCMRWF NCUM, NCMRWF NEPS, AI Deep Learning) using dynamic trust weights
- **Continuously evaluates model health and skill** against ground observations
- **Produces probabilistic forecasts** combining NWP deterministic, ensemble, and AI outputs
- **Supports extreme-weather decision making** with probabilistic exceedance thresholds

> **IMPORTANT — Operational Data Notice:**  
> Actual operational forecast data from NCMRWF (NCUM, NEPS) requires authorized data stream access.  
> The system currently runs in `demo_replay` mode with clearly labelled placeholder data.  
> No data is presented as real live NCMRWF output in Step 1.

---

## Current Architecture (Step 1)

```
SIH 2026 FINAL/
│
├── backend/                      # FastAPI Python backend
│   ├── __init__.py
│   ├── main.py                   # FastAPI app entry point
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py             # All API endpoints
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── forecast.py           # ForecastSource schema
│   │   ├── observation.py        # Observation schema
│   │   ├── health.py             # ModelHealth schema
│   │   ├── skill.py              # ModelSkill schema
│   │   ├── weight.py             # ModelWeight schema
│   │   └── config.py             # SystemConfig schema
│   ├── adapters/
│   │   ├── __init__.py
│   │   ├── demo_adapter.py       # Demo/replay data loader
│   │   ├── ncmrwf_adapter.py     # NCMRWF live adapter placeholder
│   │   └── ai_adapter.py         # AI model adapter placeholder
│   └── utils/
│       ├── __init__.py
│       ├── config.py             # Environment config system
│       └── logger.py             # Structured logging & status taxonomy
│
├── frontend/                     # Vite + React + TypeScript frontend
│   └── src/
│       ├── App.tsx               # App root
│       ├── main.tsx              # React DOM entry point
│       ├── index.css             # Global CSS reset
│       ├── types/
│       │   └── index.ts          # All TypeScript interfaces
│       ├── services/
│       │   └── api.ts            # Typed API service layer
│       ├── styles/
│       │   └── dashboard.css     # Design system CSS variables & components
│       ├── layouts/
│       │   └── DashboardLayout.tsx  # Root layout with data fetching
│       ├── components/
│       │   ├── Header.tsx        # Top navigation bar with status
│       │   └── Sidebar.tsx       # Navigation sidebar
│       ├── pages/
│       │   ├── Overview.tsx      # Main dashboard overview
│       │   ├── Forecast.tsx      # Multi-model forecast feeds
│       │   ├── ModelHealth.tsx   # Feed health & latency monitor
│       │   ├── ModelWeights.tsx  # Dynamic weight allocation view
│       │   ├── ExtremeEvents.tsx # Extreme weather decision support shell
│       │   └── Verification.tsx  # Skill evaluation & metrics
│       └── maps/
│           └── WeatherMapShell.tsx  # Map viewport shell (GIS ready)
│
├── data/
│   └── demo/
│       └── sample_replay.json    # Step 1 clearly labelled replay dataset
│
├── tests/
│   ├── test_schemas.py           # Pydantic schema validation tests
│   └── test_api.py               # FastAPI endpoint tests
│
├── docs/                         # (empty in Step 1 — Step 2+ will populate)
│
├── .env.example                  # Environment variable template (no secrets)
├── .gitignore                    # Excludes .env, __pycache__, node_modules
├── requirements.txt              # Python backend dependencies
└── README.md                     # This file
```

---

## Technology Stack

| Layer        | Technology          | Version  |
|--------------|---------------------|----------|
| Backend      | Python + FastAPI    | 3.13 / 0.115+ |
| Schemas      | Pydantic v2         | 2.7+     |
| ASGI Server  | Uvicorn             | 0.30+    |
| Frontend     | Vite + React        | 5 / 18   |
| Frontend Language | TypeScript     | 5.x      |
| Package Manager (FE) | npm        | 11.x     |
| Icons        | Lucide React        | Latest   |
| Testing      | pytest + httpx      | 8.x      |

---

## Installation

### Backend (Python)

```bash
pip install -r requirements.txt
```

### Frontend (Node.js)

```bash
cd frontend
npm install
```

---

## How to Run

### Backend

```bash
# From project root
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: **http://localhost:8000**  
API docs (Swagger): **http://localhost:8000/docs**

### Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: **http://localhost:5173**

### Run Tests

```bash
# From project root
python -m pytest tests/ -v
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values when authorized access is available:

| Variable | Description | Required |
|---|---|---|
| `APP_ENV` | `development` or `production` | No |
| `DATA_MODE` | `demo_replay` or `live_operational` | No |
| `NCMRWF_NCUM_URL` | NCMRWF NCUM data feed endpoint | When live |
| `NCMRWF_NEPS_URL` | NCMRWF NEPS ensemble feed endpoint | When live |
| `NCMRWF_API_KEY` | NCMRWF authorized API key | When live |
| `AI_MODEL_URL` | AI Weather Model inference endpoint | When live |
| `AI_MODEL_API_KEY` | AI Model API key | When live |
| `OBS_PROVIDER_URL` | Observation station network endpoint | When live |

> **Never commit `.env` with real credentials.** `.env` is in `.gitignore`.

---

## API Endpoints (Step 1)

| Endpoint | Description |
|---|---|
| `GET /api/health` | System status, data mode, environment |
| `GET /api/config` | Full system configuration and source list |
| `GET /api/models` | Configured NWP and AI model list |
| `GET /api/forecasts` | Multi-model raw forecast feeds |
| `GET /api/observations` | Meteorological observation records |
| `GET /api/model-health` | Ingestion pipeline latency & health |
| `GET /api/model-weights` | Current blending weight allocations |
| `GET /api/verification` | Historical skill evaluation metrics |

---

## Schemas / Interfaces Defined (Step 1)

| Schema | Purpose |
|---|---|
| `ForecastSource` | Multi-model gridded forecast record |
| `Observation` | Ground observation data point |
| `ModelHealth` | Operational ingestion health status |
| `ModelSkill` | Historical verification skill metric |
| `ModelWeight` | Dynamic trust weight allocation |
| `SystemConfig` | Full system configuration payload |

---

## Implementation Status

| Module | Status |
|---|---|
| Project structure | ✅ Complete |
| Backend FastAPI server | ✅ Complete |
| Core Pydantic schemas | ✅ Complete |
| Config system (env-based) | ✅ Complete |
| Structured logging | ✅ Complete |
| Demo/replay adapter | ✅ Complete |
| NCMRWF live adapter | 🔲 Placeholder (requires authorized data) |
| AI model live adapter | 🔲 Placeholder (requires inference endpoint) |
| Probabilistic blending engine (EMOS) | 🔲 Step 2 |
| Online trust updating | 🔲 Step 3 |
| Extreme-event probability module | 🔲 Step 4 |
| Self-healing failover logic | 🔲 Step 5 |
| Frontend dashboard shell | ✅ Complete |
| Map visualization (GIS) | 🔲 Step 2 |
| Unit tests (schemas + API) | ✅ 13/13 passing |

---

## Data Notice

> Operational connection to NCMRWF forecast data (NCUM, NEPS) and AWS ground observations requires:
> - Formal institutional data-sharing authorization from NCMRWF/MoES
> - Authorized API credentials or secure FTP access
> - Appropriate IT security review for operational deployment
>
> Until such connections are established, the system operates in `demo_replay` mode using clearly labelled placeholder data. No data is fabricated and presented as real operational NCMRWF output.

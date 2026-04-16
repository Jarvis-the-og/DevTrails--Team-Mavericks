# 🛡️ ParamedicGuard — Parametric Micro-Insurance for Gig Workers

> *"Protecting Gig Workers, One Shift at a Time"*

**Built for the DevTrails Hackathon 2025 by Team Mavericks**

## 📖 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [How It Works](#-how-it-works)
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Key Features](#-key-features)
- [Installation & Setup](#-installation--setup)
- [API Endpoints](#-api-endpoints)
- [Workflow Diagram](#-workflow-diagram)
- [Team](#-team)

---

## ❗ The Problem

Gig workers — delivery partners, cab drivers, freelance couriers — operate in one of the most economically vulnerable segments of the workforce. Their income is directly tied to their ability to work, and **external disruptions beyond their control** (heavy rainfall, poor air quality, extreme weather) can wipe out an entire day's earnings with zero safety net.

Traditional insurance solutions fail them because:

- 📋 **Manual claims processes** are tedious and time-consuming
- 💸 **High premiums** are unaffordable on a gig income
- 🕐 **Slow payouts** don't match the week-to-week financial reality of gig workers
- 🎯 **Lack of personalization** — coverage isn't tailored to their specific delivery zones
- 🚨 **No fraud prevention** — platforms are vulnerable to fake or manipulated claims

---

## ✅ The Solution

**ParamedicGuard** is a full-stack, AI-driven **parametric insurance platform** that:

- Automatically monitors **real-time weather and AQI data** per delivery zone
- Triggers **instant payouts** when predefined conditions are met (e.g., rainfall > 10mm)
- Charges **micro-premiums starting at ₹29/week** — affordable for every gig worker
- Uses an intelligent **Trust Engine** to prevent fraud using device IP tracking and anomaly detection
- Eliminates the manual claim process entirely — **no forms, no waiting, no rejection**

---

## ⚙️ How It Works

```
  Step 1              Step 2              Step 3              Step 4
┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│  Select  │──────▶│  Monitor │──────▶│ Auto     │──────▶│ Receive  │
│ Coverage │       │ Triggers │       │ Claim    │       │ Payout   │
│          │       │          │       │          │       │          │
│ Choose   │       │ Real-time│       │ Weather  │       │ Trust    │
│ zone &   │       │ weather  │       │ threshold│       │ Engine   │
│ micro-   │       │ + AQI    │       │ crossed  │       │ validates│
│ premium  │       │ APIs     │       │ → filed  │       │ → paid   │
└──────────┘       └──────────┘       └──────────┘       └──────────┘
```

1. **Select Coverage** — Gig worker selects a micro-premium plan based on their typical delivery zones (standard vs sub-zones), labor platform, and risk profile.
2. **Monitor Triggers** — The platform continuously monitors real-time weather and AQI APIs for the## 🏗️ Architecture Overview

```
                        ┌─────────────────────────────────────┐
                        │        ParametricGuard Platform       │
                        └─────────────────────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
    ┌─────────▼──────────┐   ┌────────────▼──────────┐   ┌───────────▼──────────┐
    │  frontend-worker   │   │   backend-python       │   │   frontend-admin     │
    │  (React + Vite)    │   │   (FastAPI + Python)   │   │   (React + Vite)     │
    │                    │   │                        │   │                      │
    │  • Live AQI/Rain   │   │  • Premium Calculator  │   │  • Platform Metrics  │
    │  • Coverage Plans  │   │  • Admin Weather Triggers│   │  • Loss Ratio        │
    │  • Verify Liveness │   │  • Active Claims Engine│   │  • Zone Risk Maps    │
    │  • Worker Profile  │   │  • Fraud ML Evaluator  │   │  • Real-tie Fraud    │
    └────────────────────┘   └────────────────────────┘   └──────────────────────┘
```

---

## 🛠️ Tech Stack

### 🔙 Backend
| Technology | Purpose |
|------------|---------|
| 🐍 **Python 3.11+** | Core backend language |
| ⚡ **FastAPI** | High-performance unified REST API framework |
| 🦄 **Uvicorn** | ASGI server for async Python |
| 📦 **Scikit-Learn** | ML framework (Isolation Forests) for Anomaly Detections |

### 🖥️ Frontend
| Technology | Purpose |
|------------|---------|
| ⚛️ **React** | UI frameworks for Admin and Worker dashboards |
| ⚡ **Vite** | Build tools incorporating `.env` variable ingestion |
| 🎨 **Tailwind CSS** | Styling and responsive design |
| 🔒 **Firebase Auth** | True production-grade user authentication |
| 🔥 **Firestore** | Real-time `onSnapshot` streaming for live claims and actions |

### 🤖 AI / Intelligence Layer
| Component | Purpose |
|-----------|---------|
| 🧠 **Fraud Engine** | Unified 4-layer validation combining Device Integrity, Liveness, Geolocation & Behaviors |
| 🌦️ **Weather Triggers** | Simulated/Real parametric triggers reacting via backend logic |
| 📊 **Risk Scoring** | Dynamic premium calculation utilizing Isolation Forest ML probabilities |

### 🚀 DevOps / Infrastructure
| Tool | Purpose |
|------|---------|
| 🌍 **Vercel / Netlify** | Expected deployment target via `VITE_API_URL` variable binding |
| 🔀 **Git** | Version control |

---

## 📁 Project Structure

```
devtrails-v2/
│
├── 📄 README.md                    # Project documentation
├── 📄 .gitignore                   # Safe Gitignores for ENV & Firebase JSON
│
├── 🐍 backend-python/              # FastAPI Microservices Backend
│   ├── main.py                     # Unified API entry + model hydration loop
│   ├── requirements.txt            # Python dependencies
│   │
│   ├── routes/                     # API route handlers
│   │   └── api.py                  # Single-file endpoint unification
│   │
│   ├── services/                   # Business logic layer
│   │   ├── premium_service.py      # Micro-premiums logic
│   │   ├── trigger_service.py      # Parametric weather assessments
│   │   └── claims_service.py       # Payout pipeline
│   │
│   └── fraud_engine/               # Intelligence Layer
│       ├── ml/                     # IsolationForest trained models
│       └── db/                     # Internal persistence logs
│
├── 👷 frontend-worker/             # Gig Worker Dashboard (React + Vite)
│   ├── src/
│   │   ├── App.jsx                 # Routing + Firebase Authentication Listeners
│   │   ├── firebaseConfig.js       # Required Firebase credential injections
│   │   └── pages/
│   │       ├── Dashboard.jsx       # Real-time onSnapshot claims monitoring
│   │       ├── VerificationPage.jsx# Interactive camera-capture & facial liveness
│   │       └── PolicyPage.jsx      # Policy onboarding 
│   │
│   ├── package.json
│   └── vite.config.js
│
└── 🛠️ frontend-admin/              # Admin Dashboard (React + Vite)
    ├── src/
    │   ├── App.jsx
    │   ├── firebaseConfig.js       # Admin credential injections
    │   └── pages/
    │       ├── AdminLogin.jsx      # Secured login portal
    │       ├── FraudMonitor.jsx    # Real-time anomaly dashboard
    │       └── TriggerControl.jsx  # Interactive payload trigger board
    │
    ├── package.json
    └── vite.config.js
```

---

## ✨ Key Features

### 🌦️ Real-Time Weather Trigger Engine
- Monitors live rainfall (mm) and AQI data from external weather APIs
- Configurable trigger thresholds per delivery zone (e.g., rainfall > 10mm = claim trigger)
- Zone-level granularity — standard zones vs micro delivery sub-zones

### 💰 Micro-Premium System
- Premiums dynamically calculated based on:
  - Chosen delivery zones (risk profile)
  - Gig labor platform (Zomato, Swiggy, Dunzo, etc.)
  - Historical weather patterns and probability
- Starting from **₹29/week** — aligned to gig worker pay cycles

### 🤖 Trust Engine (Fraud Detection)
- Tracks device IP addresses and cross-references with claimed delivery zones
- Scores claims against historical data and behavioral baselines
- Flags anomalous claims (e.g., a worker claiming from a different city)
- Ensures payouts only reach legitimate workers in genuinely affected areas

### ⚡ Automated Payout Pipeline
- Claim filing → Trust Engine validation → Payout deposit, all without manual intervention
- Target payout within **24 hours** of trigger event

### 📊 Admin Oversight Dashboard
- Platform-wide metrics: total claims, payout volume, loss ratios
- Zone risk distribution maps
- Real-time flagged anomalies and fraud alerts
- Historical performance analytics

### 📱 Worker-Facing Mobile Dashboard
- Real-time view of AQI and rainfall in their active zones
- Coverage plan management
- Payout history and claim status
- Designed for mobile-first responsive experience

---

## 🚀 Installation & Setup

### Prerequisites

Ensure you have the following installed:

| Tool | Version |
|------|---------|
| 🟢 **Node.js** | v16.14 or later |
| 🐍 **Python** | v3.9 or later |
| 🐙 **Git** | Latest stable |

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/surf3rr/devtrails-v2
cd devtrails-v2
```

---

### 2️⃣ Run the Backend API (🐍 Python / FastAPI)

```bash
cd backend-python

# Create a virtual environment (recommended)
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the dev server
uvicorn main:app --reload --port 8000
```

✅ Backend running at: `http://127.0.0.1:8000`  
📖 Interactive API docs: `http://127.0.0.1:8000/docs`

---

### 3️⃣ Run the Worker Frontend (⚛️ React + Vite)

Open a **new terminal tab**:

```bash
cd frontend-worker

npm install

npm run dev
```

✅ Worker Dashboard at: `http://localhost:5173`

---

### 4️⃣ Run the Admin Frontend (⚛️ React + Vite)

Open another **new terminal tab**:

```bash
cd frontend-admin

npm install

# Run on a different port to avoid conflict
npm run dev -- --port 5174
```

✅ Admin Dashboard at: `http://localhost:5174`

---

## 📡 API Endpoints

The FastAPI backend exposes the following core microservices:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/docs` | 📖 Interactive Swagger UI |
| `POST` | `/premium/calculate` | 💰 Calculate micro-premium for a worker |
| `GET` | `/triggers/check/{zone_id}` | 🌦️ Check current weather trigger status for zone |
| `POST` | `/claims/file` | 📋 File an automated claim |
| `GET` | `/payouts/history/{worker_id}` | 💸 Retrieve payout history for a worker |
| `POST` | `/trust/evaluate` | 🤖 Run Trust Engine evaluation on a claim |
| `GET` | `/admin/metrics` | 📊 Platform-wide admin metrics |
| `GET` | `/admin/fraud-flags` | 🚨 List flagged anomalous claims |

---

## 🔄 Workflow Diagram

```
Gig Worker Onboards
        │
        ▼
  Select Coverage Plan ──────────────────────────────────────────────┐
  (Zone + Platform + Premium)                                         │
        │                                                             │
        ▼                                                             │
  Premium Calculated                                                  │
  (Dynamic Risk Score)                                                │
        │                                                             │
        ▼                                                             ▼
  Worker is Active                                         Weather API Polling
  on Platform                                              (Every interval)
        │                                                             │
        └───────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
                    Trigger Threshold Crossed?
                    (e.g. Rainfall > 10mm)
                          │           │
                         YES          NO
                          │           │
                          ▼           ▼
                   Auto-Claim Filed  Continue
                          │          Monitoring
                          ▼
                  Trust Engine Evaluation
                  ┌────────────────────┐
                  │ • IP Geolocation   │
                  │ • Historical Score │
                  │ • Anomaly Check    │
                  └────────────────────┘
                          │
                 ┌────────┴────────┐
                 │                 │
              PASS              FAIL / FLAG
                 │                 │
                 ▼                 ▼
         Payout Processed    Claim Flagged
         (within 24hrs)      for Admin Review
                 │
                 ▼
        Worker Notified
        Payout Deposited ✅
```

---

## 📊 Problem → Solution Mapping

| ❗ Problem | ✅ ParamedicGuard Solution |
|-----------|--------------------------|
| Manual, slow claims process | Fully automated trigger-based claim filing |
| High, unaffordable premiums | Micro-premiums from ₹29/week |
| One-size-fits-all coverage | Zone and platform-specific risk profiling |
| Slow payouts (weeks) | 24-hour automated payout pipeline |
| Vulnerable to fraudulent claims | Trust Engine with IP tracking + anomaly detection |
| No visibility for workers | Real-time dashboard with live weather conditions |
| No oversight for platforms | Admin console with full fraud, payout, and risk analytics |

---

## 🏆 Hackathon Context

**Event:** DevTrails Hackathon 2025  
**Team:** Mavericks  
**Category:** FinTech / InsurTech / Social Impact  
**Theme:** Using technology to solve real-world problems for underserved populations

---

## 🤝 Team

**Team Mavericks** — Built with 💙 for the gig economy.

---

## 📄 License

This project was built for a hackathon and is intended for demonstration and educational purposes.

---

*ParamedicGuard · DevTrails 2025 · Protecting the Gig Economy*

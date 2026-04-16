# ParametricGuard — Production-Ready Architecture Upgrade

## Codebase Audit Summary

### What Exists

| Module | Location | Status |
|--------|----------|--------|
| Worker Frontend (React+Vite+Tailwind) | `frontend-worker/` | ✅ Working — Login, Dashboard, Claims, Policy |
| Admin Frontend (React+Vite+Tailwind) | `frontend-admin/` | ✅ Working — Analytics, Claims Manager, Fraud Monitor, Zone Risk |
| FastAPI unified backend | `backend-python/` | ✅ Working — Premium, Claims, Triggers, Payments, Analytics |
| Fraud Engine (IsolationForest ML) | `backend-python/fraud_engine/` | ✅ Working — Rules + ML blend, SQLite persistence |
| Duplicate standalone fraud engine | `fraud_engine/` (root) | ⚠️ REDUNDANT — mirrors `backend-python/fraud_engine/` |
| Firebase Admin SDK | `backend-python/db/database.py` | ✅ Firestore connected (claims, policies, workers, zones) |
| `fraud_engine.db` (SQLite) | Both `backend-python/` and root `fraud_engine/` | ⚠️ Two separate DB files |
| Firebase Config (frontend) | `frontend-worker/src/firebaseConfig.js` | ❌ Placeholder only — no real Firebase SDK usage |
| Auth | Worker: `localStorage` mock. Admin: `localStorage` mock | ❌ NOT using Firebase Auth |
| Verification Screen (face/liveness) | No file exists | ❌ MISSING |
| Fraud Score API `/fraud-score` | Not exposed as a unified endpoint | ❌ MISSING from gateway |
| Risk Score API `/risk-score` | Not implemented | ❌ MISSING |
| Liveness API `/verify-liveness` | Not implemented | ❌ MISSING |
| Trigger control (Admin) | No admin trigger page exists | ❌ MISSING |
| Real-time Firestore listeners in UI | Not implemented | ❌ MISSING — all UI uses REST polling |
| `frontend-react/` | Has AdminDashboard, WorkerDashboard, AuthPage | ⚠️ Appears to be a legacy/early prototype not used |

---

### What Needs To Change

#### 🔴 Critical Gaps
1. **No Firebase Auth** — both apps use `localStorage` mock auth
2. **No Verification Screen** — face/liveness capture page missing entirely
3. **No `/fraud-score`, `/risk-score`, `/verify-liveness` endpoints** on the gateway
4. **Redundant `fraud_engine/` root directory** — exact mirror of `backend-python/fraud_engine/`, causes confusion
5. **trust_engine.py** in `services/` is rule-based — the ML model from `fraud_engine/` is NOT being called in the main claim flow
6. **Duplicate `frontend-react/`** — early prototype, not linked to anything

#### 🟡 Partial / Needs Enhancement
7. Admin has no **Trigger Control Page** (can fire parametric triggers manually)
8. Fraud Monitor uses `Math.random()` for `attempts` count — should use real data
9. `firebaseConfig.js` placeholders need real config structure (user responsible for keys)
10. No real-time Firestore `onSnapshot` listeners — UI refreshes manually

---

## User Review Required

> [!IMPORTANT]
> The Firebase config keys (`apiKey`, `projectId`, etc.) are **user-specific secrets**. The plan will create proper config files with placeholder comments indicating exactly where to paste them. You must paste your actual Firebase project credentials.

> [!WARNING]
> The standalone `fraud_engine/` directory at the project root is a **duplicate** of `backend-python/fraud_engine/`. The plan **removes it** to clean up the structure. The backend only uses `backend-python/fraud_engine/`. Confirm this is safe.

> [!WARNING]
> The `frontend-react/` directory appears to be an **early prototype** (CRA-era) that is not wired into any routing or deployment. The plan **removes it** to avoid confusion. Confirm this is safe.

---

## Proposed Changes

### 1. Backend — FastAPI (`backend-python/`)

#### [MODIFY] `routes/api.py`
- Add `POST /fraud-score` endpoint — accepts device+location+behavioral signals, returns ensemble fraud score
- Add `POST /risk-score` endpoint — accepts claim data, returns ML risk score (wraps existing Isolation Forest)
- Add `POST /verify-liveness` endpoint — accepts base64 image, returns confidence score (stub with MediaPipe-ready response format)
- Add `POST /triggers/fire` endpoint — admin can manually fire a parametric trigger

#### [MODIFY] `services/claims_service.py`
- Replace `trust_engine.evaluate_trust_score()` call with call to the ML-based `FraudDetector` from `fraud_engine/` so scoring goes through the full 4-layer pipeline (currently the ML model is only in the separate fraud engine, not the main flow)

#### [MODIFY] `main.py`
- Ensure `/fraud-score`, `/risk-score`, `/verify-liveness` are properly exposed

---

### 2. Worker Frontend (`frontend-worker/src/`)

#### [MODIFY] `firebaseConfig.js`
- Properly initialize Firebase app, Auth, Firestore, and Storage exports
- Add structured comments for where to paste keys

#### [MODIFY] `App.jsx`
- Replace `localStorage` mock auth with real `onAuthStateChanged` Firebase Auth listener
- Add `/verify` route for the new Verification Screen

#### [MODIFY] `pages/LoginPage.jsx`
- Replace mock submit with `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` from Firebase Auth
- Save user profile to Firestore `users` collection on signup

#### [NEW] `pages/VerificationPage.jsx`
- Camera-based face capture using `getUserMedia`
- Guided pose detection with head movement indicators
- Sends base64 frame to `/api/verify-liveness`
- Shows confidence score with pass/fail feedback
- Integrates into claim flow (required when fraud score is medium)

#### [MODIFY] `pages/Dashboard.jsx`
- Add real-time `onSnapshot` listener on `claims` collection for the logged-in user
- Replace `localStorage.getItem('worker_user')` with Firebase Auth `currentUser`

#### [MODIFY] `pages/ClaimsPage.jsx`
- Add real-time `onSnapshot` listener on `claims` collection
- Wire "verification required" status to navigate to `/verify`

#### [MODIFY] `components/Layout.jsx`
- Add logout button using Firebase `signOut`

---

### 3. Admin Frontend (`frontend-admin/src/`)

#### [MODIFY] `firebaseConfig.js`
- Same Firebase initialization as worker frontend

#### [MODIFY] `pages/AdminLogin.jsx`
- Replace mock auth with Firebase Auth

#### [NEW] `pages/TriggerControl.jsx`
- Fire parametric triggers manually (rain, AQI, flood, platform outage)
- Shows which triggers are active
- Calls `POST /api/triggers/fire`
- Shows live result of trigger activations

#### [MODIFY] `App.jsx`
- Add `/trigger-control` route
- Wire Firebase auth for admin

#### [MODIFY] `components/AdminLayout.jsx`
- Add "Trigger Control" nav link
- Add logout button

#### [MODIFY] `pages/FraudMonitor.jsx`
- Replace `Math.random()` for attempts with real data from claims
- Add Firestore `onSnapshot` real-time listener

#### [MODIFY] `pages/AnalyticsDashboard.jsx`
- Add Firestore real-time listener on `analytics/weekly_summary`

---

### 4. Cleanup

#### [DELETE] `fraud_engine/` (root directory)
- Exact duplicate of `backend-python/fraud_engine/`
- `fraud_engine/app/` contains mixed React+Python files (Dashboard.js, Login.js + Python files) — completely incorrect structure
- Remove entirely

#### [DELETE] `frontend-react/`
- Early CRA prototype with 3 placeholder pages
- Not wired to any deployment or routing

---

## Open Questions

> [!IMPORTANT]
> Do you confirm deletion of the root `fraud_engine/` directory and `frontend-react/` directory?

> [!IMPORTANT]
> For liveness detection (`/verify-liveness`), do you want:
> A. A stub endpoint that returns a simulated confidence score (faster to implement, works end-to-end)
> B. Actual server-side MediaPipe/face-api.js analysis
>
> **Recommendation: Option A stub** for now — the frontend will still show the full UI flow with camera capture; it simply calls the endpoint and gets a realistic response.

---

## Verification Plan

### Automated
- Run `uvicorn main:app` in `backend-python/` and verify `/docs` shows all new endpoints
- Verify `GET /api/fraud-score` returns proper schema
- Check Firestore listeners update in real-time

### Manual
- Worker login → dashboard updates live
- File a claim → fraud score computed → decision shown
- Claim with medium score → redirected to `/verify` liveness page
- Admin: Trigger Control fires a rain trigger → claims created → fraud monitor updates
- Admin: Fraud Monitor shows flagged claims with real data (no `Math.random`)

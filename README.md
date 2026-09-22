# ☁️ CloudGuard

**Intelligent Cloud Security, Monitoring & Cost Optimization Platform**

*Secure. Monitor. Optimize.*

CloudGuard is a full-stack Cloud Computing PBL project: a unified dashboard for monitoring
simulated cloud resources, tracking security risk, estimating and optimizing cost, and catching
abnormal activity with statistical anomaly detection — all wrapped in a premium, glassmorphism
SaaS interface.

It runs immediately with realistic seeded/demo data. **No AWS credentials are required** — the
backend is built around a `CloudProvider` abstraction so a real AWS integration can be dropped in
later without touching the rest of the app (see [Architecture](#-architecture)).

---

## ✨ Features

| Area | What it does |
|---|---|
| **Dashboard** | Live summary cards, resource utilization rings, a performance chart (1H/24H/7D/30D), security overview, cost chart, recent alerts, anomalies, recommendations, resource snapshot, and an activity calendar. |
| **Cloud Resources** | 24 simulated resources (compute, storage, database, network) with filtering, search, grid/list views, and a detail view with a 72-hour performance chart, findings, events, and start/stop/reboot actions. |
| **Security** | A real backend scanner (`POST /api/security/scan`) that runs 8 rule-based checks (public storage, public DB, open ports, missing backups, encryption, IAM, inactive rules, abnormal network) against every resource, with a 0–100 security score. |
| **Cost Optimization** | Current / previous / projected monthly cost, cost by service & by resource, 6-month cost history, and savings recommendations you can "Apply" to simulate the change. |
| **Analytics** | CPU / memory / network / storage trend charts across 24H–90D, cost vs. security-events chart, and plain-language insights ("Storage usage is projected to reach 80% in 18 days"). |
| **Anomaly Detection** | A simple, explainable **z-score + hard-threshold** statistical model (no black-box ML) flags spikes per resource and fleet-wide. |
| **Alerts** | Full lifecycle — filter, search, mark read, resolve, archive, delete — backed by MongoDB. |
| **Recommendations** | Security / cost / performance / reliability advice generated from live resource + metric data, each with reason, impact, and estimated savings. |
| **Settings** | Profile, notifications, cloud environment (region, "Demo Environment" banner), security preferences, appearance (accent color, background scene, blur, reduced motion). |
| **Refresh Data** | One click regenerates fresh simulated metrics and updates the whole dashboard, with a toast confirmation. |

---

## 🖼️ Screenshots

*(Add screenshots of your running app here before submitting — Dashboard, Resources, Security, Cost Optimization, Analytics.)*

```
docs/screenshots/dashboard.png
docs/screenshots/resources.png
docs/screenshots/security.png
docs/screenshots/costs.png
docs/screenshots/analytics.png
```

---

## 🏗️ Architecture

```
                     ┌─────────────────────────┐
                     │   React (Vite) Frontend  │
                     │  glassmorphism dashboard │
                     └────────────┬────────────┘
                                  │ REST / JSON (axios)
                     ┌────────────▼────────────┐
                     │      Flask REST API      │
                     │  routes → services layer │
                     └────────────┬────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                                    │
     ┌──────────▼──────────┐            ┌────────────▼────────────┐
     │   Repository layer   │            │   CloudProvider layer    │
     │ Mongo / in-memory    │            │ SimulatedCloudProvider   │
     │  (app/db.py)         │            │  → AWSCloudProvider (*)  │
     └──────────────────────┘            └──────────────────────────┘
                │                                    (*) documented
     ┌──────────▼──────────┐                          extension point,
     │  MongoDB Atlas /     │                          not implemented
     │  local MongoDB       │
     └──────────────────────┘
```

**Cloud provider abstraction** (`backend/app/services/providers/`):

```
CloudProvider (abstract)
    ├── SimulatedCloudProvider   ← used today: realistic fictional data, zero credentials
    └── AWSCloudProvider         ← documented stub for real AWS (boto3) — see aws.py
```

Every route only talks to the `Repository` (data access) and `CloudProvider` (cloud data)
interfaces, so swapping the simulated data for live AWS/CloudWatch/Cost Explorer calls later is a
matter of implementing `AWSCloudProvider` — nothing else in the app needs to change.

**Database layer** (`backend/app/db.py`) works the same way: it connects to MongoDB when
`MONGO_URI` is set and reachable, and **automatically falls back to a thread-safe in-memory store**
otherwise — so the app is always demoable, even with zero setup.

**Anomaly detection** uses a transparent statistical method — for each metric series it computes
the mean and standard deviation over a rolling window, then flags points that are ≥ 3 standard
deviations above the average (z-score) or cross a hard limit (CPU ≥ 90%, memory ≥ 92%, network ≥
90%). No opaque ML model — every flagged point can be explained in one sentence.

---

## 🧰 Technology Stack

**Frontend** — React 18, Vite, Tailwind CSS, React Router, Recharts, Lucide React icons, Axios
**Backend** — Python 3.12, Flask, Flask-CORS, PyMongo, PyJWT, Gunicorn
**Database** — MongoDB (local or MongoDB Atlas) — with an automatic in-memory fallback
**Deployment** — Vercel (frontend) · Render (backend) · MongoDB Atlas (database) · optional Docker Compose

---

## 📁 Folder Structure

```
cloudguard/
├── backend/
│   ├── app/
│   │   ├── routes/          # Flask blueprints (one file per resource area)
│   │   ├── services/        # business logic (scanner, anomalies, recommendations, costs...)
│   │   │   └── providers/   # CloudProvider abstraction (simulated + AWS stub)
│   │   ├── models/          # document "schemas" / validation rules
│   │   ├── utils/           # auth, time, errors, fleet helpers
│   │   ├── config.py
│   │   └── db.py            # Mongo / in-memory repository
│   ├── tests/                # pytest suite (22 tests, memory + mongomock)
│   ├── seed.py               # CLI seeding script
│   ├── run.py                 # entry point
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── render.yaml
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/       # ui/ layout/ cloud/ dashboard/ resources/ recommendations/ auth/
│   │   ├── pages/             # Dashboard, Resources, Security, Costs, Analytics, Alerts, ...
│   │   ├── layouts/           # AppLayout (sidebar + topbar shell)
│   │   ├── context/            # Auth, Toast, Confirm, Data (global refresh)
│   │   ├── hooks/               # useApi, useDebounce, useClickOutside
│   │   ├── services/api.js       # axios client
│   │   └── utils/                 # formatting, constants
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🚀 Installation & Running Locally

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- (Optional) MongoDB — locally installed or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- (Optional) Docker + Docker Compose, if you'd rather not install Node/Python/Mongo yourself

### 1 — Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # edit values if you want (MongoDB, secret key)
python run.py                     # → http://localhost:5000
```

The **first request** automatically seeds the demo environment if the database is empty
(`AUTO_SEED=true` by default) — you don't have to run anything else. To seed manually or reset:

```bash
python seed.py            # seed only if empty
python seed.py --reset    # wipe and re-seed
```

> If `MONGO_URI` is left empty (or MongoDB isn't reachable), CloudGuard automatically runs in
> **in-memory demo mode** — fully functional, data just resets when the server restarts. This is
> intentional so the app always works, even with zero database setup.

### 2 — MongoDB setup (optional but recommended)

**Local:**
```bash
# macOS (Homebrew)
brew install mongodb-community && brew services start mongodb-community
# Then in backend/.env:
MONGO_URI=mongodb://localhost:27017
```

**MongoDB Atlas (free tier):**
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow your IP (or `0.0.0.0/0` for demo purposes).
3. Copy the connection string into `backend/.env`:
   ```
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

### 3 — Frontend setup

```bash
cd frontend
npm install
cp .env.example .env             # VITE_API_URL=http://localhost:5000
npm run dev                       # → http://localhost:5173
```

### 4 — Sign in

Open `http://localhost:5173` and either:
- Click **"Continue with Demo Account"**, or
- Log in with **`demo@cloudguard.io`** / **`Demo@1234`**

### Option B — Docker Compose (everything at once)

```bash
docker compose up --build
# Frontend → http://localhost:5173   Backend → http://localhost:5000   Mongo → localhost:27017
```

---

## 🔑 Environment Variables

**`backend/.env`** (copy from `backend/.env.example`)

| Variable | Description | Default |
|---|---|---|
| `MONGO_URI` | MongoDB / Atlas connection string. Empty = in-memory demo mode. | *(empty)* |
| `MONGO_DB_NAME` | Database name | `cloudguard` |
| `SECRET_KEY` | Signs login tokens (JWT). **Set a real random value in production.** | dev key (insecure) |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated | `http://localhost:5173` |
| `PORT` | Port the server listens on | `5000` |
| `CLOUD_PROVIDER` | `simulated` (default) or `aws` (not implemented — see providers/aws.py) | `simulated` |
| `AUTO_SEED` | Seed demo data automatically when the DB is empty | `true` |
| `ALLOW_DEMO_LOGIN` | Enable the `POST /api/auth/demo` one-click login | `true` |

**`frontend/.env`** (copy from `frontend/.env.example`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the CloudGuard API, **no trailing slash, no `/api`** (e.g. `http://localhost:5000` or your Render URL) |

🔒 Never commit real `.env` files — only the `.env.example` templates are tracked in git.

---

## 📡 API Documentation

All endpoints are prefixed `/api` and return JSON. All routes except `/api/health`,
`/api/auth/login` and `/api/auth/demo` require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service, database mode, provider status |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| POST | `/api/auth/demo` | One-click demo login → `{ token, user }` |
| GET | `/api/profile` | Current user profile |
| PATCH | `/api/profile` | Update `{ name?, settings? }` |
| GET | `/api/dashboard` | Aggregated dashboard payload |
| GET | `/api/metrics?range=1h\|24h\|7d\|30d` | Fleet performance series |
| POST | `/api/refresh` | Regenerate fresh simulated metrics ("Refresh Data") |
| GET | `/api/resources?type=&q=&status=` | List / filter / search resources |
| GET | `/api/resources/<id>` | Resource detail (series, findings, recommendations) |
| POST | `/api/resources/<id>/action` | `{ action: start\|stop\|reboot }` (simulated) |
| GET | `/api/security/findings?severity=&status=&q=` | List security findings |
| PATCH | `/api/security/findings/<id>` | `{ status: investigating\|resolved }` |
| POST | `/api/security/scan` | Run the security scanner |
| GET | `/api/security/score` | Score + severity counts |
| GET | `/api/costs` | Cost breakdown (by service, by month, by resource) |
| GET | `/api/costs/summary` | Cost summary card data |
| GET | `/api/analytics?range=24h\|7d\|30d\|90d` | Charts + plain-language insights |
| GET | `/api/analytics/anomalies` | Detected anomalies (z-score method) |
| GET | `/api/alerts?category=&severity=&status=&q=` | List / filter alerts |
| PATCH | `/api/alerts/<id>` | `{ read?, status? }` |
| DELETE | `/api/alerts/<id>` | Delete an alert |
| POST | `/api/alerts/read-all` | Mark all open alerts as read |
| GET | `/api/recommendations?category=&status=` | List recommendations |
| PATCH | `/api/recommendations/<id>` | `{ status: applied\|dismissed }` — `applied` simulates the change |

Run the backend test suite (22 tests, covering both the in-memory and MongoDB code paths):

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

---

## 🔐 Demo Account

```
Email:    demo@cloudguard.io
Password: Demo@1234
```

Or just click **"Continue with Demo Account"** on the login screen.

---

## ☁️ Deployment

### Frontend → Vercel
1. Import the repo in Vercel, set the **root directory to `frontend`**.
2. Framework preset: Vite (auto-detected). `vercel.json` is already included (SPA rewrites).
3. Add environment variable `VITE_API_URL` = your Render backend URL (e.g. `https://cloudguard-api.onrender.com`).
4. Deploy. Vercel runs `npm run build` and serves `dist/`.

### Backend → Render
1. New → Web Service → connect the repo, **root directory `backend`**.
2. Build command: `pip install -r requirements.txt`
3. Start command: `gunicorn run:app --bind 0.0.0.0:$PORT`
4. Add environment variables: `SECRET_KEY` (generate a random value), `MONGO_URI` (your Atlas string),
   `MONGO_DB_NAME=cloudguard`, `FRONTEND_URL` = your Vercel URL, `CLOUD_PROVIDER=simulated`.
   (A ready-made `backend/render.yaml` blueprint is included.)
5. Deploy. Render provides `$PORT`; the app already listens on `0.0.0.0:$PORT`.

### Database → MongoDB Atlas
Create a free cluster, a database user, and allow network access as described in
[MongoDB setup](#2--mongodb-setup-optional-but-recommended) above, then paste the connection
string into Render's `MONGO_URI`.

### Checklist before you consider it deployed
- [ ] Frontend `VITE_API_URL` points at the live Render URL (no trailing slash)
- [ ] Backend `FRONTEND_URL` points at the live Vercel URL (CORS)
- [ ] `SECRET_KEY` is a real random value in production, not the dev default
- [ ] `MONGO_URI` is set (or you're intentionally using in-memory demo mode)

---

## 🔮 Future Enhancements

- Implement `AWSCloudProvider` (boto3: EC2, S3, RDS, CloudWatch, Cost Explorer) — the interface
  and every call site are already in place, see `backend/app/services/providers/aws.py`.
- Real user registration / multi-user roles & permissions.
- WebSocket push for live metric updates instead of polling "Refresh Data".
- Exportable PDF/CSV cost and security reports.
- Slack/email delivery for critical alerts.
- Terraform/CloudFormation templates generated from recommendations.

---

## 👤 Team / Project Information

**Project:** CloudGuard — Cloud Computing PBL
**Author:** *(add your name / roll number / batch here)*
**College:** *(add your institution here)*
**Course:** Cloud Computing

---

## ✅ Final Verification

- [x] Login page (email/password + one-click demo account)
- [x] Dashboard (summary cards, utilization, performance chart, security, cost, alerts, anomalies, recommendations, snapshot, activity calendar)
- [x] Sidebar & top navigation (responsive, collapsible, search, notifications, profile menu)
- [x] Cloud Resources (filter, search, grid/list, detail modal, start/stop/reboot)
- [x] Resource details (charts, findings, events, recommendations)
- [x] Security page + real backend scanning endpoint
- [x] Cost Optimization page + apply-recommendation flow
- [x] Analytics page (24H–90D charts + generated insights)
- [x] Anomaly Detection (z-score, explainable, dashboard + Analytics)
- [x] Alerts (filter, search, read/resolve/archive/delete)
- [x] Recommendations (category/status filters, apply simulation)
- [x] Settings (profile, notifications, cloud env, security prefs, appearance)
- [x] MongoDB integration with automatic in-memory fallback
- [x] Seed data (24 resources, ~4,000 metric points, 11+ findings, 13 alerts, 13 recommendations)
- [x] REST API (23 endpoints) with clean JSON errors and proper status codes
- [x] Responsive layout (mobile/tablet/desktop, collapsible sidebar, scrollable tables)
- [x] Loading skeletons, empty states, error states with retry, toast notifications
- [x] Frontend production build succeeds (`npm run build`)
- [x] Backend starts correctly (`python run.py` / `gunicorn run:app`)
- [x] `.env.example` (both frontend & backend) and `.gitignore` present
- [x] README with full documentation and deployment instructions
- [x] Backend test suite: 22/22 passing (`pytest -q`, both storage modes)

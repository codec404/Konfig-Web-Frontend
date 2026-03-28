# Konfig Web Frontend

React dashboard for managing configs, rollouts, schemas, and organisations across distributed services.

## Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Services
![Services](docs/screenshots/services.png)

### Rollouts
![Rollouts](docs/screenshots/rollouts.png)

## Overview

- **Framework:** React 18 + TypeScript + Vite
- **State:** TanStack Query (server state) + React Context (auth)
- **Auth:** httpOnly cookie-based JWT — no tokens in JS; OTP email login and Google OAuth supported
- **Real-time:** WebSocket subscription per service for live config updates
- **Theme:** Dark/light mode toggle, persisted to `localStorage`
- **Multi-tenant:** Subdomain-based org routing (e.g. `myorg.example.com`)

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Stats tiles, service cards, recent activity feed |
| Services | `/services` | All services with config count and latest version |
| Service Detail | `/services/:name` | Config list, upload, delete, rollout, rollback |
| Rollouts | `/rollouts` | Deployment history with progress bars and status |
| Schemas | `/schemas` | Registered validation schemas |
| Live Updates | `/live` | Real-time WebSocket feed of config push events |
| Org Management | `/org` | Member approval, invites, roles, permissions, service visibility |
| Super Admin | `/admin` | User management, org management, app log viewer, bug reports |

## Project Structure

```
src/
  api/              # Axios client + typed API functions
    client.ts       # Axios instance (withCredentials: true)
    auth.ts         # sendOtp, loginOtp, logout, me, googleLogin, updateMe
    configs.ts      # CRUD for configs
    orgs.ts         # Org management, invites, permissions
    rollouts.ts     # Rollout start, promote, rollback, status
    schemas.ts      # Schema registration and listing
    stats.ts        # Dashboard stats and audit log
  components/       # Shared UI (Layout, ConfigList, RolloutPanel, etc.)
    LiveUpdates.tsx # WebSocket event feed with reconnect and error handling
  contexts/
    AuthContext.tsx # Session restoration from cookie on mount
  pages/            # Route-level pages
  utils/
    subdomain.ts    # Org slug extraction from subdomain
  index.css         # Global styles and CSS custom properties
public/
  konfig.svg        # App favicon
docs/
  screenshots/      # UI screenshots for README
```

## Running Locally

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. Requires `konfig-web-backend` on port `8090` — API and WebSocket calls are proxied via the Vite config.

## Build

```bash
npm run build
```

Output goes to `dist/`. Served in production by Caddy (see `../Konfig/docker-compose.yml`).

## Docker

```bash
cd ../Konfig
docker compose up --build -d web-frontend
```

The container serves the static build. In production, Caddy handles TLS termination and proxies `/api` and `/ws` to the Go backend.

## Environment

The API base URL is configured via Vite's proxy for local dev — no `.env` file is required. The following build-time variables are available:

| Variable | Description |
|----------|-------------|
| `VITE_WS_URL` | Override WebSocket base URL (defaults to current host with `ws://`/`wss://`) |
| `VITE_BASE_DOMAIN` | Root domain used for subdomain org routing (e.g. `example.com`) |

```bash
# .env.local (optional, for local overrides)
VITE_BASE_DOMAIN=localhost
```

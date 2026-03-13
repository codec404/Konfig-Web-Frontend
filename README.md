# Konfig Web Frontend

React dashboard for managing configs, rollouts, and schemas across services.

## Overview

- Built with React 18 + TypeScript + Vite
- Talks to the `konfig-web-backend` Go service via `/api` and `/ws`
- Features: dark/light theme, per-service config management, rollout tracking, schema validation

## Project Structure

```
src/
  components/       # Shared UI components (Layout, ConfigList, RolloutPanel, etc.)
  pages/            # Route-level pages (Dashboard, ServiceDetail, RolloutsPage, etc.)
  index.css         # Global styles and CSS custom properties
public/
  konfig.svg        # App favicon
```

## Running Locally

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. Requires `konfig-web-backend` running on port `8090` (API calls are proxied via Vite).

## Build

```bash
npm run build
```

Output goes to `dist/`. Served in production by Nginx (see `Dockerfile`).

## Docker

```bash
cd ../Konfig
docker compose up --build -d web-frontend
```

The Nginx container serves the built static files and proxies `/api` and `/ws` to the Go backend.

# TOR Match

npm workspaces monorepo.

## Structure

```
frontend/   Next.js app (UI, server actions, mock data — see frontend)
backend/    Express + MongoDB API server (see backend/README.md)
```

## Getting started

```bash
npm install                # installs all workspaces from the repo root
npm run dev:frontend        # http://localhost:3000
npm run dev:backend         # http://localhost:4000 (needs backend/.env, see its README)
```

Other available scripts: `build:frontend`, `build:backend`, `lint:frontend`, `lint:backend`.
Run any workspace's own scripts directly with `npm run <script> --workspace <frontend|backend>`.

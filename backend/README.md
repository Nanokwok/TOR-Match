# TOR-Match Backend

Standalone Node.js / Express API server for TOR-Match, backed by MongoDB Atlas. Runs as its own
process alongside the Next.js frontend in `../frontend`. Part of the npm workspaces monorepo rooted
one level up — see the [root README](../README.md).

## Stack

- Express 4 + TypeScript
- MongoDB Atlas via Mongoose
- JWT auth (httpOnly cookie, `Authorization: Bearer` also accepted) with bcrypt password hashing
- Zod for request validation

## Getting started

Install once from the repo root (installs every workspace):

```bash
npm install
cp backend/.env.example backend/.env   # then fill in MONGODB_URI and JWT_SECRET
npm run dev:backend                     # http://localhost:4000
```

Or, from within this directory:

```bash
cd backend
cp .env.example .env
npm run dev             # http://localhost:4000
```

### Environment variables

See [.env.example](.env.example):

- `MONGODB_URI` — your MongoDB Atlas connection string.
- `CORS_ORIGIN` — comma-separated list of allowed frontend origins (defaults to `http://localhost:3000`).
- `JWT_SECRET` / `JWT_EXPIRES_IN` — auth token signing.
- `AUTH_COOKIE_NAME` — name of the httpOnly session cookie.

## Project layout

```
src/
  config/       env loading, MongoDB connection
  models/       Mongoose schemas (User, Company, Tor, WorkspaceCard, Notification)
  middleware/   auth guards, error handling
  controllers/  request handlers
  routes/       Express routers, mounted under /api
  utils/        ApiError, asyncHandler, JWT helpers
  app.ts        Express app wiring (middleware + routes)
  index.ts      process entrypoint (connects DB, starts HTTP server)
```

Mongoose schemas mirror the frontend's TypeScript types in `../frontend/src/types` (`Tor`,
`WorkspaceCard`, `CompanySetupProfile`, `AppNotification`) so the shapes returned by the API line up
with what the Next.js app already expects from `src/server/services/*` and `src/actions/*`.

## API overview

All routes are mounted under `/api`.

| Method | Path                          | Auth | Description |
|---|---|---|---|
| GET  | `/health`                       | –        | Liveness check |
| POST | `/auth/register`                | –        | Create account, sets session cookie |
| POST | `/auth/login`                   | –        | Log in, sets session cookie |
| POST | `/auth/logout`                  | –        | Clears session cookie |
| GET  | `/auth/me`                      | required | Current user |
| GET  | `/tors`                         | optional | List TORs (`keyword`, `status`, `department`, `budgetRange` query params) |
| GET  | `/tors/departments`             | –        | Distinct department list |
| GET  | `/tors/local-offices`           | –        | Distinct local office list |
| GET  | `/tors/:id`                     | optional | TOR detail |
| GET  | `/companies/me`                 | required | Current user's company profile |
| PUT  | `/companies/me`                 | required | Create/update company profile |
| GET  | `/workspace/board`              | required | Kanban board grouped by column |
| POST | `/workspace/cards`              | required | Add a TOR to the board |
| PATCH| `/workspace/cards/:id/move`     | required | Move a card to another column |
| DELETE| `/workspace/cards/:id`         | required | Remove a card |
| GET  | `/notifications`                | required | List notifications |
| PATCH| `/notifications/:id/read`       | required | Mark one as read |
| PATCH| `/notifications/read-all`       | required | Mark all as read |

Auth uses an httpOnly `tm_token` cookie by default (matches the pattern already used for admin
sessions in `../frontend/src/lib/admin-session.ts`), and also accepts `Authorization: Bearer <token>`
for non-browser clients. When calling from the Next.js app, set `credentials: "include"` on `fetch`.

## Next steps

- Wire the Next.js server actions in `../frontend/src/actions` and services in
  `../frontend/src/server/services` to call this API instead of the mock data in
  `../frontend/src/server/db/mock`.
- Add a seed script if you want to load the existing mock TOR data into MongoDB for local dev.
- Add integration tests once the frontend integration is settled.

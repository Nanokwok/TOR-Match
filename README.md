# TOR-Match Installation & Setup Guide

This guide walks you through setting up and running **TOR-Match** locally for development or production.

TOR-Match is configured as an **npm workspaces monorepo**:
- **`backend/`**: Node.js & Express API server with MongoDB Atlas, Mongoose, and Gemini-based PDF extraction.
- **`frontend/`**: Next.js 16 (React 19, Tailwind CSS v4) web application.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install Dependencies](#2-clone--install-dependencies)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Setup & Seeding](#4-database-setup--seeding)
5. [TOR Ingestion Pipeline (Scraper & AI Extraction)](#5-tor-ingestion-pipeline-scraper--ai-extraction)
6. [Running Development Servers](#6-running-development-servers)
7. [Production Build & Execution](#7-production-build--execution)
8. [Testing & Quality Checks](#8-testing--quality-checks)
9. [Common Troubleshooting](#9-common-troubleshooting)

---

## 1. Prerequisites

Ensure your development machine has the following installed:
- **Node.js**: `v20.x` or higher (`node -v`)
- **npm**: `v9.x` or higher (`npm -v`)
- **MongoDB**: A running local MongoDB instance or a [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI.
- **Google Cloud SDK (`gcloud`)** *(Optional)*: Only required if you intend to run the live AI ingestion pipeline for extracting TOR documents via Google Vertex AI.

---

## 2. Clone & Install Dependencies

Clone the repository and install all dependencies for both frontend and backend workspaces in a single command from the root directory:

```bash
git clone https://github.com/Nanokwok/TOR-Match.git
cd TOR-Match
npm install
```

---

## 3. Environment Configuration

Both workspaces require their own `.env` file created from their respective `.env.example`.

### 3.1 Backend Configuration

Copy the example file:
```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and configure the essential settings:
```env
# Server
PORT=4000
NODE_ENV=development

# MongoDB Atlas or local connection string
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tor-match?retryWrites=true&w=majority

# CORS (Frontend URL)
CORS_ORIGIN=http://localhost:3000

# Authentication
JWT_SECRET=your-super-secret-random-jwt-key-here
JWT_EXPIRES_IN=7d
AUTH_COOKIE_NAME=tm_token

# (Optional) Admin account setup for `npm run seed:admin`
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME="System Administrator"

# (Optional) Vertex AI for TOR Scraper Ingestion
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_REGION=global
EXTRACTION_MODEL=gemini-2.5-flash
SCRAPER_USER_AGENT=TORMatchBot/0.1 (+https://github.com/Nanokwok/TOR-Match)
```

### 3.2 Frontend Configuration

Copy the example file:
```bash
cp frontend/.env.example frontend/.env
```

Open `frontend/.env` and verify the values:
```env
# Base URL of the backend API (must match backend PORT)
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Name of the auth cookie (must match AUTH_COOKIE_NAME in backend/.env)
AUTH_COOKIE_NAME=tm_token

# (Optional in dev, required in production)
ADMIN_SESSION_SECRET=dev-admin-session-secret-change-me
USER_SESSION_SECRET=dev-user-session-secret-change-me
```

> ⚠️ **Important:** Ensure that `NEXT_PUBLIC_API_URL` uses the exact port specified in `backend/.env` (`PORT`), and that `AUTH_COOKIE_NAME` is identical in both files.

---

## 4. Database Setup & Seeding

Before starting the web interface, populate the database with fixture TORs and set up an administrator account.

```bash
# 1. Seed initial sample TOR documents
npm run seed --workspace backend

# 2. Check seed status without modifying data (optional)
npm run seed --workspace backend -- --check

# 3. Create or update the admin account defined in backend/.env
npm run seed:admin --workspace backend

# Alternatively, promote an already registered user to admin:
npm run seed:admin --workspace backend -- --promote your-email@example.com
```

---

## 5. TOR Ingestion Pipeline (Scraper & AI Extraction)

The project includes an end-to-end scraper pipeline that fetches procurement announcements from the Thai Comptroller General's Department (**CGD e-GP RSS Feed**), downloads tender/TOR PDFs from Bangkok Metropolitan Administration (BMA) sources, and uses **Gemini via Google Vertex AI** to extract structured qualifications and criteria.

```
CGD e-GP RSS Feed ──> Software Title Filter ──> PDF Download ──> Gemini (Vertex AI) ──> MongoDB
```

### 5.1 Authenticate Google Cloud (Vertex AI)
Run the following in your terminal to set up Application Default Credentials:
```bash
gcloud auth application-default login
```
Ensure `VERTEX_PROJECT_ID` is set in `backend/.env`.

### 5.2 Ingestion Commands

| Task | Command |
|---|---|
| **Standard Ingestion** (Today's software announcements) | `npm run ingest --workspace backend` |
| **Dry Run** (Preview matches without PDF downloads or AI calls) | `npm run ingest --workspace backend -- --dry-run` |
| **Backfill History** (Walk back N days, e.g., 3 days) | `npm run ingest --workspace backend -- --days 3` |
| **Ingest All Announcements** (Disable IT/software title filter) | `npm run ingest --workspace backend -- --all` |
| **Force Re-extraction** (Re-extract items already in database) | `npm run ingest --workspace backend -- --force` |
| **Filter by Types** (e.g., `B0` draft TOR, `D0` tender invitation) | `npm run ingest --workspace backend -- --types B0,D0` |

*(Note for Windows / PowerShell: Quote the double hyphen if flags are ignored: `npm run ingest "--" --dry-run`)*

> 🕒 **Notice on e-GP Feed Availability:** The official government e-GP RSS feed is actively served only between **17:01 and 08:29 ICT**.

### 5.3 Ingestion Maintenance Scripts
```bash
# Probe feed history and check availability
npm run walk:feed --workspace backend -- --days 30

# Publish reviewed/approved drafts to the public /browse catalog
npm run publish:approved --workspace backend

# Re-extract stored drafts
npm run reextract --workspace backend
```

---

## 6. Running Development Servers

For the best developer experience, open two terminal windows from the repository root:

### Terminal 1: Backend API Server
```bash
npm run dev:backend
```
- API Base URL: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

### Terminal 2: Frontend Web App
```bash
npm run dev:frontend
```
- Web Application: `http://localhost:3000`
- Admin Portal: `http://localhost:3000/admin`
- Browse TORs: `http://localhost:3000/browse`

---

## 7. Production Build & Execution

To test or deploy production-optimized builds:

```bash
# 1. Build both frontend and backend
npm run build

# Or build individually:
npm run build:backend
npm run build:frontend

# 2. Run the production servers
npm run start:backend     # Runs compiled Express server (dist/index.js)
npm run start:frontend    # Runs Next.js production server
```

---

## 8. Testing & Quality Checks

Run the automated test suites, linting, and security audits:

```bash
# Run all tests across both frontend and backend
npm test

# Run tests individually
npm run test:backend
npm run test:frontend

# Linting
npm run lint

# Security & Static Code Analysis (Semgrep)
npm run sast

# Generate Software Bill of Materials (SBOM)
npm run sbom
```

---

## 9. Common Troubleshooting

| Issue | Solution |
|---|---|
| **`Missing required environment variable: NEXT_PUBLIC_API_URL`** | Ensure `frontend/.env` exists and contains `NEXT_PUBLIC_API_URL`. Next.js requires this at build/run time. |
| **API calls fail with 401 or CORS errors** | Check that `CORS_ORIGIN` in `backend/.env` matches your frontend URL (default: `http://localhost:3000`), and `NEXT_PUBLIC_API_URL` matches the backend port. |
| **`VERTEX_PROJECT_ID must be set to run extraction`** | Add `VERTEX_PROJECT_ID` to `backend/.env` and execute `gcloud auth application-default login`. |
| **`AUTH_COOKIE_NAME` mismatch** | The auth cookie name in `backend/.env` and `frontend/.env` must match (recommended: `tm_token`). |
| **e-GP RSS Feed returns 404 or empty** | The Thai government e-GP RSS service is only active between 17:01 and 08:29 ICT. Test outside these hours using `--dry-run` or mock seeds. |

# TOR-Match — What the Project Owner Needs to Know

## 1. What This Project Is

A platform that automatically ingests government procurement announcements (TORs), has AI read the PDF and extract it into structured data, matches it against company profiles saved in the system, and notifies only the companies that genuinely meet the requirements — not just a nicer way to read announcements, but a conversion of qualification requirements into something the system can check automatically.

## 2. Tech Stack

- **Backend**: Node.js + Express, MongoDB Atlas, JWT auth, Zod validation
- **Frontend**: Next.js (App Router), Server Components/Server Actions
- **AI**: Claude (Anthropic) via **Google Vertex AI** — not Gemini, despite running on Google Cloud (auth via GCP Application Default Credentials, not an API key)
- **Scraper**: Playwright (pulls listings from egp2.bangkok.go.th, Bangkok Metropolitan Administration)
- **Monorepo**: npm workspaces (`frontend/`, `backend/`)

## 3. Core Data Flow (Pipeline)

```
Scraper (Playwright) pulls announcements + PDFs from the BMA site
        ↓
AI Extraction (Claude via Vertex) reads the PDF directly (no separate OCR step)
Extracts: title, department, budget, deadline, payment milestones,
          structured qualification criteria (registered capital / past contracts /
          certifications / e-GP registration / blacklist status),
          a confidence score (aiConfidence 0-100)
        ↓
TorDraft (review queue)
        ↓
  ├─ confidence clears the threshold set on Admin Settings → auto-publishes immediately
  └─ confidence too low → waits for admin review at /admin/tor-review
        ↓
Tor (the real, published collection — visible to end users on the Browse page)
        ↓
Every company in the system is checked against the new criteria →
matching companies get an automatic Notification
```

## 4. Features Already Built

| Feature | Status |
|---|---|
| Scraper pulling announcements + PDFs from the BMA site | ✅ Code ready (blocked on a site filter issue — see section 6) |
| AI extraction: PDF → structured data | ✅ Code ready (blocked on quota — see section 6) |
| Machine-checkable qualification criteria | ✅ Working — checks 5 types (registered capital / past contracts / certifications / e-GP / blacklist) |
| Matching engine (company vs. TOR) | ✅ Returns 4 states: passed / failed / insufficient data / needs manual review |
| Auto-publish when confidence clears the threshold | ✅ Reads the threshold live from Admin Settings — adjustable with no redeploy |
| Admin review screen (`/admin/tor-review`) | ✅ Every field editable, including qualification criteria |
| Automatic notifications when a TOR matches | ✅ Deep-linked straight to that TOR |
| Per-user notification preferences (`/settings/notifications`) | ✅ Persisted per user |
| Admin System Settings | ✅ System behavior tunable from the UI, nothing hardcoded |
| Company setup wizard | ✅ Persisted per user |
| Workspace / bookmarking TORs | ✅ |

## 5. Key Technical Decisions (and Why)

- **Claude via Vertex AI, not Gemini or the direct Anthropic API** — the team chose Vertex (likely for the team's GCP credit arrangement), even though the original task list said "Gemini prompt"
- **Reads PDFs directly, no OCR** — Claude reads documents natively, both text-layer and scanned
- **Nothing hardcoded for thresholds/settings** — anything that should be tunable (auto-approve threshold, enabled/disabled) is read live from Admin Settings in the database every time, not baked into the code
- **The TOR review form edits Thai as the primary language** — Thai is the site's default language; English is supplementary data the backend merges back in on its own
- **Publish validation**: title + department must have a value in at least one language (not specifically English) — because a TOR may legitimately exist in Thai only
- **TorDraft is a separate collection from the real Tor collection** — so unreviewed data can never accidentally leak into the Browse page

## 6. Current Status — What's Blocking

1. **AI extraction has never completed a full end-to-end run yet** — the code is ready and its auth/logic has been verified, but it's blocked on **GCP quota** for the Claude model on Vertex AI project `tor-match-508814` (a quota increase request has been submitted; awaiting Google's approval — timing is out of our control)
2. **The scraper hit a filter issue on the BMA site** — the site's default fiscal-year filter (2565–2568 BE) doesn't cover the current year (2569 BE), so discovery returns 0 listings. The code needs to select the year explicitly instead of relying on the site's default.
3. **A PR is ready to open** — all the work is on branch `feat/AI-summary`, already pushed to GitHub, ready to open against `main` (compare link: `github.com/Nanokwok/TOR-Match/compare/main...feat/AI-summary`)

## 7. Known Gaps (Not Yet Done / Incomplete)

- If a PDF can't be read during extraction, the job currently just fails with no draft left for review (it should save a draft for manual review instead)
- The threshold the scraper uses at ingest time (`run-scrape.ts`) doesn't yet read from Admin Settings the way the auto-publish hook does (different write path — the scraper uses `findOneAndUpdate`, which doesn't trigger the hook)
- No cron scheduler yet (the plan is twice daily, 18:00 plus a 07:00 backup run)
- No digest email sending yet (only the preference exists for users to configure it)
- Parts of the Admin Overview dashboard are still mock data (the trend chart, the activity feed)
- Exploring the Comptroller General's Department's official e-GP RSS feed as an alternative to scraping the website — currently just an exploratory page (`/egp-playground`), not wired into the real pipeline yet

## 8. Branch Structure (Current)

- `main` — officially merged code
- `feat/AI-summary` — all of the AI pipeline work (auto-publish, criteria editor fix, scraper), ready to open a PR into main
- `feat/tor-scraper` — BossPattadon's original scraper work (already merged into feat/AI-summary)
- `feat/TOR-approval` — auto-publish + criteria fix (already merged into feat/AI-summary)

## 9. Terms Worth Knowing

- **TorDraft** — an announcement that hasn't been approved/reviewed yet
- **Tor** — a published announcement, visible to regular users
- **aiConfidence** — the AI's self-reported confidence when reading the PDF (0-100)
- **autoApproveThreshold** — the minimum confidence that triggers auto-publish (configurable at `/admin/settings`)
- **qualification criteria** — structured eligibility requirements the matching engine can check automatically
- **e-GP** — the Comptroller General's Department's electronic government procurement system

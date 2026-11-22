import "dotenv/config"

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Like {@link required}, but the fallback is only ever used outside production.
 *
 * A secret with a working default fails silently: the server starts, auth
 * "works", and every token is signed with a value that is committed to a public
 * repo — so anyone can mint one for themselves, `role: "admin"` included.
 * Production must fail to boot instead.
 */
function requiredSecret(name: string, developmentFallback: string): string {
  const value = process.env[name]
  if (value) return value

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${name} must be set in production — the development fallback is public in source control`
    )
  }
  return developmentFallback
}

/** A whole number above zero from the environment; anything else (unset, blank, 0, "abc") falls back. */
function positiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

/** A whole number, zero included; anything else (unset, blank, negative, "abc") falls back. */
function nonNegativeInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === "") return fallback
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 ? value : fallback
}

/**
 * The origins allowed to call the API from a browser, from a comma-separated list.
 *
 * A wildcard is refused outright: the API sends cookies (`credentials: true`),
 * and "any site may read an authenticated response" is never what was meant by
 * a copied-in `*`. Failing at start-up says so before the first request.
 */
export function parseCorsOrigins(raw: string): string[] {
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (origins.includes("*")) {
    throw new Error('CORS_ORIGIN must list explicit origins; "*" is not allowed because the API sends cookies')
  }
  return origins
}

/**
 * In production a cookie name gets the `__Host-` prefix (ASVS V3.3.1): the browser
 * then refuses to store it unless it is Secure, has Path=/ and no Domain, so
 * another subdomain or an insecure page cannot plant or overwrite it. Elsewhere
 * the name is left alone: the prefix needs Secure, and development runs on plain
 * http. A name that already starts with `__` is used as given.
 */
export function hostCookieName(base: string, production = process.env.NODE_ENV === "production"): string {
  return production && !base.startsWith("__") ? `__Host-${base}` : base
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: required("MONGODB_URI"),
  corsOrigin: parseCorsOrigins(process.env.CORS_ORIGIN ?? "http://localhost:3000"),
  jwtSecret: requiredSecret("JWT_SECRET", "dev-jwt-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  authCookieName: hostCookieName(process.env.AUTH_COOKIE_NAME ?? "tm_token"),
  /** The frontend's own session cookie, which the backend only ever clears (on logout). */
  userSessionCookieName: hostCookieName("tm_user_session"),
  userIdleTimeoutSeconds: Number(process.env.USER_IDLE_TIMEOUT_SECONDS ?? 30 * 60),
  /**
   * Longest a session may last, however active the user is. Refreshing a token
   * extends its idle window and its `exp`, but never this: it counts from the
   * `issuedAt` of the sign-in, which every refresh carries over.
   */
  sessionMaxAgeSeconds: positiveInt("SESSION_MAX_AGE_SECONDS", 7 * 24 * 60 * 60),
  /** Global limit for /api/*: at most `rateLimitMaxRequests` per client IP in each `rateLimitWindowMs`. */
  rateLimitWindowMs: positiveInt("RATE_LIMIT_WINDOW_MS", 60 * 1000),
  rateLimitMaxRequests: positiveInt("RATE_LIMIT_MAX_REQUESTS", 100),
  /** How long the list of published TORs is kept in memory (see tor-cache.service). 0 turns the cache off. */
  torCacheTtlMs: nonNegativeInt("TOR_CACHE_TTL_MS", 60 * 1000),

  /**
   * Deliberately not `required()`: only TOR extraction needs these, and making
   * the API server (and CI) fail to boot without them would punish everyone
   * who never runs it. Extraction checks them at its own start.
   *
   * Claude is reached through Google Vertex AI, so there is no Anthropic API
   * key — auth is GCP Application Default Credentials
   * (`gcloud auth application-default login`, or a service account).
   */
  vertexProjectId: process.env.VERTEX_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT ?? "",
  /** "global" is the recommended endpoint; a specific region also works. */
  vertexRegion: process.env.VERTEX_REGION ?? "global",
  /** Overridable: which Claude models a Vertex project can call varies by project and region. */
  extractionModel: process.env.EXTRACTION_MODEL ?? "claude-opus-5",
  /**
   * Outgoing mail (notification emails). Deliberately optional: with no
   * SMTP_HOST the app runs normally and email alerts are skipped with a
   * warning, so only deployments that want email need a mail account.
   */
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  mailFrom: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "TOR Match <no-reply@localhost>",
  /** Base URL of the web app, used for the links inside emails. */
  appUrl: (process.env.APP_URL ?? (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",")[0]).trim(),
  /** Daily / weekly digest emails, checked every 15 minutes inside the API server. Set DIGESTS_ENABLED=false to turn off. */
  digestsEnabled: process.env.DIGESTS_ENABLED !== "false",
  /** Hourly deadline reminders inside the API server. Set DEADLINE_REMINDERS_ENABLED=false to turn off. */
  deadlineRemindersEnabled: process.env.DEADLINE_REMINDERS_ENABLED !== "false",
  /**
   * Google sign-in ("Log in with Google"). Optional: with no client id the
   * button reports that Google sign-in is not configured and email login is
   * unaffected. Create an OAuth client (type "Web application") in Google Cloud
   * Console and allow `<APP_URL>/auth/google/callback` as its redirect URI.
   */
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  bmaBaseUrl: process.env.BMA_BASE_URL ?? "https://egp2.bangkok.go.th",
  /**
   * The CGD e-GP RSS feed — the published channel for mirroring procurement
   * announcements, and the source of the announcement PDFs.
   */
  egpRssUrl:
    process.env.EGP_RSS_URL ??
    "http://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml",
  /** รหัสหน่วยงานภาครัฐ of the Bangkok Metropolitan Administration (4 digits). */
  egpDeptId: process.env.EGP_DEPT_ID ?? "",
  /**
   * Sent on every request to a government site — the RSS feed, the document
   * downloads, and the detail-page lookups. Identifying ourselves with a
   * reachable contact is the other half of being allowed to fetch at all, so
   * keep a real address here.
   */
  /**
   * Hosts the scraper may download documents from (each also matches its
   * subdomains). A link anywhere else, or one that resolves to a private
   * address, is refused — see scraper/url-guard.ts.
   */
  scraperAllowedHosts: (
    process.env.SCRAPER_ALLOWED_HOSTS ?? "gprocurement.go.th,cgd.go.th,bangkok.go.th"
  )
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
  /** Lets tests point the downloader at a local server. Never honoured in production. */
  scraperAllowAnyHost: process.env.NODE_ENV !== "production" && process.env.SCRAPER_ALLOW_ANY_HOST === "true",
  scraperUserAgent:
    process.env.SCRAPER_USER_AGENT ??
    "TORMatchBot/0.1 (+https://github.com/Nanokwok/TOR-Match)",
}

export const isProduction = env.nodeEnv === "production"

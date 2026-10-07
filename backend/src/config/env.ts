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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: required("MONGODB_URI"),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret: requiredSecret("JWT_SECRET", "dev-jwt-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  authCookieName: process.env.AUTH_COOKIE_NAME ?? "tm_token",

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
  /** Hourly deadline reminders inside the API server. Set DEADLINE_REMINDERS_ENABLED=false to turn off. */
  deadlineRemindersEnabled: process.env.DEADLINE_REMINDERS_ENABLED !== "false",
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
  scraperUserAgent:
    process.env.SCRAPER_USER_AGENT ??
    "TORMatchBot/0.1 (+https://github.com/Nanokwok/TOR-Match)",
}

export const isProduction = env.nodeEnv === "production"

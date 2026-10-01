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
   * Deliberately not `required()`: only the scraper/extraction pipeline needs
   * these, and making the API server (and CI) fail to boot without them would
   * punish everyone who never runs it. The scraper checks them at its own start.
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
   * Screens listings for software work before any PDF is read. It judges a
   * title and a few metadata fields, not a document, so the cheapest model is
   * the right one — the saving comes from the extraction calls it prevents.
   */
  classifierModel: process.env.CLASSIFIER_MODEL ?? "claude-haiku-4-5",
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
   * Sent on every scraper request. egp2.bangkok.go.th's robots.txt allows
   * crawling its public pages, and identifying ourselves with a reachable
   * contact is the other half of that bargain — keep a real address here.
   */
  scraperUserAgent:
    process.env.SCRAPER_USER_AGENT ??
    "TORMatchBot/0.1 (+https://github.com/Nanokwok/TOR-Match)",
}

export const isProduction = env.nodeEnv === "production"

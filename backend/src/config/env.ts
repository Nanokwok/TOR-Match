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
}

export const isProduction = env.nodeEnv === "production"

import crypto from "node:crypto"

/** How long a reset link works. Short, because the link is a password for as long as it lives. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

/**
 * Asking again within this time of the last link sends nothing. Without it,
 * anyone could use the form to fill a stranger's inbox.
 */
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000

/** SHA-256 is enough here: the token is 256 random bits, so there is nothing to brute-force or look up in a table. */
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex")
}

/** A new random token (what goes in the email) and its hash (what goes in the database). */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url")
  return { token, tokenHash: hashResetToken(token) }
}

/** The page the email links to. The token is the only thing in the query string. */
export function buildResetUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, "")}/forgot-password?token=${encodeURIComponent(token)}`
}

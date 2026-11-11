/** How many days ahead a certificate counts as "expiring soon". */
export const CERTIFICATE_WARNING_DAYS = 30

export type CertificateExpiry =
  | { state: "expired"; daysAgo: number }
  | { state: "expiring"; daysLeft: number }
  | { state: "ok" }
  /** No usable date: the profile screen asks for it, there is nothing to warn about. */
  | { state: "unknown" }

const DAY_MS = 24 * 60 * 60 * 1000

function dayNumber(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const time = Date.parse(`${date}T00:00:00Z`)
  return Number.isNaN(time) ? null : Math.floor(time / DAY_MS)
}

/**
 * Pure: where a certificate stands today. Both dates are Bangkok calendar days
 * (YYYY-MM-DD), the same way the matching engine reads them: a certificate is
 * valid through its expiration date and expired from the day after.
 */
export function certificateExpiry(expirationDate: string | undefined, today: string): CertificateExpiry {
  const expires = dayNumber((expirationDate ?? "").trim())
  const now = dayNumber(today)
  if (expires === null || now === null) return { state: "unknown" }
  if (expires < now) return { state: "expired", daysAgo: now - expires }
  const daysLeft = expires - now
  return daysLeft <= CERTIFICATE_WARNING_DAYS ? { state: "expiring", daysLeft } : { state: "ok" }
}

/**
 * The visitor's address, from the headers the platform in front of Next.js adds.
 *
 * The backend limits requests per client address, but every call it gets comes
 * from this server. Without passing the visitor's address along, all users would
 * share one allowance (and one login lockout).
 *
 * `X-Forwarded-For` is "client, proxy, proxy…": each proxy appends the address it
 * received the request from. The last entry is the one added by the proxy closest
 * to us, so it is the one a visitor cannot choose; the first can be sent by anyone.
 * With a single proxy in front (the usual setup) the last entry is the visitor.
 */
export function pickClientIp(forwardedFor: string | null, realIp: string | null): string | null {
  const entries = (forwardedFor ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  return entries.at(-1) ?? (realIp?.trim() || null)
}

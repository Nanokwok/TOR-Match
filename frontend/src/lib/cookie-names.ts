/**
 * Cookie name prefixes (ASVS V3.3.1).
 *
 * A browser refuses to store a `__Host-` cookie unless it is Secure, has Path=/
 * and no Domain, so another subdomain or an insecure page cannot plant or
 * overwrite it. `__Secure-` only asks for Secure; it is for the admin cookies,
 * which are scoped to /admin and so cannot be `__Host-`.
 *
 * The prefixes apply in production only: they need Secure, and development runs
 * on plain http. A name that already starts with `__` is used as given.
 *
 * No Node-only imports: the request proxy runs on the edge runtime.
 */
const PRODUCTION = process.env.NODE_ENV === "production"

export function prefixedCookieName(
  base: string,
  prefix: "__Host-" | "__Secure-",
  production = PRODUCTION
): string {
  return production && !base.startsWith("__") ? `${prefix}${base}` : base
}

/** For cookies with Path=/ and no Domain. */
export const hostCookieName = (base: string) => prefixedCookieName(base, "__Host-")

/** For cookies with another path. */
export const secureCookieName = (base: string) => prefixedCookieName(base, "__Secure-")

/**
 * Options that expire a cookie. A prefixed cookie is only removed by a header
 * that meets the same rules as the one that set it, so Secure (and Path=/) must
 * be there: `cookies().delete()` sends neither and would leave it in place.
 */
export function expiredRootCookieOptions() {
  return {
    httpOnly: true,
    secure: PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  }
}

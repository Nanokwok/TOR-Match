/**
 * User preferences (locale, theme) are stored in cookies rather than
 * localStorage so the server can read them while rendering. That lets the very
 * first HTML already carry the right `lang` and `dark` class — no init script,
 * no flash of the wrong theme, and no hydration mismatch.
 */
export const LOCALE_COOKIE = "tor-match-locale"

/** What the user picked: "system" | "light" | "dark". */
export const THEME_COOKIE = "tor-match-theme"

/**
 * What "system" actually resolved to on this device ("light" | "dark").
 * The server cannot evaluate `prefers-color-scheme`, so the client records the
 * outcome here for the next render to use.
 */
export const RESOLVED_THEME_COOKIE = "tor-match-theme-resolved"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Writes a preference cookie from the browser.
 *
 * Not HttpOnly on purpose — this is display preference, not a credential, and
 * the client needs to update it. SameSite=Lax keeps it off cross-site requests.
 */
export function writePreferenceCookie(name: string, value: string) {
  if (typeof document === "undefined") return

  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
}
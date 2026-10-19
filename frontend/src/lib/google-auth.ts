import "server-only"

/** Holds the one-time value that must come back from Google unchanged. */
export const GOOGLE_STATE_COOKIE = "tm_google_state"

export function googleStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax so it is sent when Google redirects the browser back to us.
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  }
}

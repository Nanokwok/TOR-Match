/**
 * Deciding what a verified Google sign-in means for our user table. Kept pure
 * (no database, no Google) so the rules can be tested on their own.
 */

export type GoogleProfile = {
  /** Google's stable id for the account (the `sub` claim) — unlike the email, it never changes. */
  googleId: string
  email: string
  emailVerified: boolean
  name: string
}

type ExistingUser = { id: string; googleId?: string | null }

export type GoogleSignInPlan =
  | { action: "login"; userId: string }
  /** Same email as an existing password account: attach the Google id to it. */
  | { action: "link"; userId: string }
  | { action: "create" }
  | { action: "reject"; reason: "email-not-verified" | "email-taken-by-another-google-account" }

/**
 * - A known Google id signs straight in, even if the email on the account has since changed.
 * - Otherwise the email must be one Google has verified: linking to an existing
 *   account by an unverified address would let anyone claim it.
 * - A verified email that matches an existing account links to it; no match creates one.
 */
export function planGoogleSignIn(
  profile: GoogleProfile,
  byGoogleId: ExistingUser | null,
  byEmail: ExistingUser | null
): GoogleSignInPlan {
  if (byGoogleId) return { action: "login", userId: byGoogleId.id }
  if (!profile.emailVerified) return { action: "reject", reason: "email-not-verified" }
  if (!byEmail) return { action: "create" }
  if (byEmail.googleId && byEmail.googleId !== profile.googleId) {
    return { action: "reject", reason: "email-taken-by-another-google-account" }
  }
  return { action: "link", userId: byEmail.id }
}

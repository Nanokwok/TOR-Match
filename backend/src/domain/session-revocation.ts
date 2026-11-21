/**
 * Whether a login token was issued before the account's password last changed.
 *
 * `issuedAt` is the moment of the original sign-in and survives the sliding
 * refresh of the token, so keeping a session alive never moves it past a password
 * change. A token with no `issuedAt` predates the claim; once the password has
 * changed it cannot be shown to be newer, so it counts as revoked.
 */
export function isSessionRevoked(issuedAt: number | undefined, passwordChangedAt: Date | null | undefined): boolean {
  if (!passwordChangedAt) return false
  if (typeof issuedAt !== "number") return true
  return issuedAt < passwordChangedAt.getTime()
}

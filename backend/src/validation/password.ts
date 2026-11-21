import { z } from "zod"

/**
 * bcrypt reads only the first 72 *bytes* of a password and ignores the rest, so
 * a longer one would be stored as something shorter than the user typed, and
 * its tail would protect nothing. Counted in bytes because a Thai character is
 * three of them: 72 characters of Thai would be cut at 24.
 */
export const MAX_PASSWORD_BYTES = 72

/**
 * A password a user sets (registration, reset, change): at least 8 characters
 * and no more than bcrypt can use. Deliberately no rules about which characters
 * it must contain (ASVS V6.2.5); breached passwords are refused separately.
 *
 * Not applied to login: that must verify exactly what was sent (V6.2.8), and
 * accounts made before this limit may already hold a longer one.
 */
export const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((value) => Buffer.byteLength(value, "utf8") <= MAX_PASSWORD_BYTES, {
    message: `Password must be at most ${MAX_PASSWORD_BYTES} bytes (about ${MAX_PASSWORD_BYTES} English characters, fewer for Thai)`,
  })

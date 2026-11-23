import bcrypt from "bcryptjs"

import { env, isProduction } from "@/config/env"
import {
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TTL_MS,
  buildResetUrl,
  generateResetToken,
  hashResetToken,
} from "@/domain/password-reset"
import { renderPasswordResetEmail } from "@/domain/password-reset-email"
import { PasswordResetToken } from "@/models/PasswordResetToken.model"
import { User } from "@/models/User.model"
import { sendEmail } from "@/services/email.service"
import { isPasswordPwned, PWNED_PASSWORD_ERROR_MESSAGE } from "@/services/pwned-password.service"
import { ApiError } from "@/utils/ApiError"

const SALT_ROUNDS = 10

export const INVALID_RESET_LINK_MESSAGE =
  "This password reset link is invalid or has expired. Please request a new one."

/** What the service uses from outside, so a test can replace mail and the breach lookup. */
export type PasswordResetDeps = {
  send?: typeof sendEmail
  isPwned?: typeof isPasswordPwned
  now?: () => Date
}

/**
 * Sends a reset link to `email` if it belongs to an account that has a password.
 *
 * It never says whether that was the case. Unknown addresses and Google-only
 * accounts (which have no password to reset: the login page already tells them
 * to use Google) return quietly, so the form cannot be used to find out who has
 * an account. A repeat request inside the cooldown also sends nothing.
 */
export async function requestPasswordReset(email: string, deps: PasswordResetDeps = {}): Promise<void> {
  const send = deps.send ?? sendEmail
  const now = (deps.now ?? (() => new Date()))()

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash")
  if (!user?.passwordHash) return

  const recent = await PasswordResetToken.exists({
    userId: user._id,
    createdAt: { $gt: new Date(now.getTime() - PASSWORD_RESET_COOLDOWN_MS) },
  })
  if (recent) return

  // One live link per account: asking again replaces the one already sent.
  await PasswordResetToken.deleteMany({ userId: user._id })
  const { token, tokenHash } = generateResetToken()
  const record = await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    // Set from the same clock as the cooldown and expiry checks, not left to the database.
    createdAt: now,
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
  })

  const resetUrl = buildResetUrl(env.appUrl, token)
  try {
    const sent = await send({
      to: user.email,
      ...renderPasswordResetEmail({ name: user.name, resetUrl, appUrl: env.appUrl }),
    })
    if (!sent && !isProduction) {
      // No SMTP in development: the link would otherwise be impossible to get.
      console.warn(`[password-reset] SMTP is not configured; reset link for ${user.email}: ${resetUrl}`)
    }
  } catch (error) {
    // The link never reached the user; free them to ask again right away.
    await PasswordResetToken.deleteOne({ _id: record._id })
    throw error
  }
}

/**
 * Sets a new password from a link's token. The token works once: it is removed
 * before the password changes, and so is every other link for the account.
 * Every session that was signed in before this moment stops working: the point
 * of a reset is often to lock out someone who should not have access.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  deps: PasswordResetDeps = {}
): Promise<{ userId: string }> {
  const isPwned = deps.isPwned ?? isPasswordPwned
  const now = (deps.now ?? (() => new Date()))()

  const record = await PasswordResetToken.findOne({ tokenHash: hashResetToken(token) })
  // The TTL index only sweeps about once a minute, so expiry is checked here too.
  if (!record || record.expiresAt <= now) throw ApiError.badRequest(INVALID_RESET_LINK_MESSAGE)

  // Before the token is spent, so a rejected password can be corrected on the same link.
  if (await isPwned(newPassword)) throw ApiError.badRequest(PWNED_PASSWORD_ERROR_MESSAGE)

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

  // Deleting decides who used the link: of two simultaneous requests only one gets the document back.
  const spent = await PasswordResetToken.findOneAndDelete({ _id: record._id })
  if (!spent) throw ApiError.badRequest(INVALID_RESET_LINK_MESSAGE)

  const updated = await User.updateOne({ _id: record.userId }, { $set: { passwordHash }, $inc: { tokenVersion: 1 } })
  if (updated.matchedCount === 0) throw ApiError.badRequest(INVALID_RESET_LINK_MESSAGE)
  await PasswordResetToken.deleteMany({ userId: record.userId })
  return { userId: String(record.userId) }
}

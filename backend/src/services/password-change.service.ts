import bcrypt from "bcryptjs"

import { PasswordResetToken } from "@/models/PasswordResetToken.model"
import { User } from "@/models/User.model"
import { isPasswordPwned, PWNED_PASSWORD_ERROR_MESSAGE } from "@/services/pwned-password.service"
import { ApiError } from "@/utils/ApiError"

const SALT_ROUNDS = 10

export const WRONG_CURRENT_PASSWORD_MESSAGE = "Your current password is incorrect."
export const SAME_PASSWORD_MESSAGE = "Choose a password that is different from your current one."
export const NO_PASSWORD_MESSAGE = "This account signs in with Google and has no password to change."

/** What the service uses from outside, so a test can replace the breach lookup and the clock. */
export type PasswordChangeDeps = {
  isPwned?: typeof isPasswordPwned
  now?: () => Date
}

/**
 * Changes the password of a signed-in user, who must prove they know the
 * current one. (A stolen session alone must not be enough to take the account.)
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  deps: PasswordChangeDeps = {}
): Promise<{ tokenVersion: number }> {
  const isPwned = deps.isPwned ?? isPasswordPwned

  const user = await User.findById(userId).select("+passwordHash")
  if (!user) throw ApiError.unauthorized()
  if (!user.passwordHash) throw ApiError.badRequest(NO_PASSWORD_MESSAGE)

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw ApiError.badRequest(WRONG_CURRENT_PASSWORD_MESSAGE)
  }
  if (newPassword === currentPassword) throw ApiError.badRequest(SAME_PASSWORD_MESSAGE)
  if (await isPwned(newPassword)) throw ApiError.badRequest(PWNED_PASSWORD_ERROR_MESSAGE)

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
    { new: true }
  )
  if (!updated) throw ApiError.unauthorized()

  // A reset link sent before the change must not let its holder set a password again.
  await PasswordResetToken.deleteMany({ userId: user._id })

  return { tokenVersion: updated.tokenVersion ?? 1 }
}

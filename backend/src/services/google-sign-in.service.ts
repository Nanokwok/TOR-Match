import { planGoogleSignIn, type GoogleProfile } from "@/domain/google-account"
import { PasswordResetToken } from "@/models/PasswordResetToken.model"
import { User } from "@/models/User.model"
import { ApiError } from "@/utils/ApiError"

/**
 * Turns a Google profile that has already been verified into one of our users:
 * signs in, creates the account, or links Google to an account with the same email.
 *
 * Linking removes the account's password and ends every session that started
 * before it. Passwords are not tied to an email address being confirmed, so the
 * password on such an account may have been set by someone who only knew the
 * address, not by its owner. Google has just proved who the owner is; whatever
 * could get into the account before that moment must not be able to afterwards.
 * The owner keeps access through Google.
 */
export async function signInWithGoogleProfile(profile: GoogleProfile) {
  const [byGoogleId, byEmail] = await Promise.all([
    User.findOne({ googleId: profile.googleId }),
    User.findOne({ email: profile.email }),
  ])
  const plan = planGoogleSignIn(
    profile,
    byGoogleId && { id: String(byGoogleId._id), googleId: byGoogleId.googleId },
    byEmail && { id: String(byEmail._id), googleId: byEmail.googleId }
  )

  if (plan.action === "reject") {
    throw ApiError.unauthorized(
      plan.reason === "email-not-verified"
        ? "Your Google email address is not verified"
        : "This email is already linked to a different Google account"
    )
  }

  const user =
    plan.action === "create"
      ? await User.create({ name: profile.name, email: profile.email, googleId: profile.googleId })
      : plan.action === "link"
        ? await User.findByIdAndUpdate(
            plan.userId,
            {
              $set: { googleId: profile.googleId, passwordChangedAt: new Date() },
              $unset: { passwordHash: 1 },
            },
            { new: true }
          )
        : await User.findById(plan.userId)
  if (!user) throw ApiError.unauthorized("Account not found")

  // A reset link sent before the link would let its holder set a password again.
  if (plan.action === "link") await PasswordResetToken.deleteMany({ userId: user._id })

  return { user, action: plan.action }
}

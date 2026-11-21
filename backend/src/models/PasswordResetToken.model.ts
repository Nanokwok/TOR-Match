import { Schema, model } from "mongoose"

/**
 * A password-reset link that has been sent. Only a hash of the token is stored,
 * so a copy of the database cannot be used to reset anyone's password; the token
 * itself exists only in the email.
 */
const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    /** MongoDB removes the document once this time has passed (TTL index). */
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const PasswordResetToken = model("PasswordResetToken", passwordResetTokenSchema)

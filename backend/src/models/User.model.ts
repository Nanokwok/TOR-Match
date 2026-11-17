import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** Absent for accounts that only ever sign in with Google. */
    passwordHash: { type: String, select: false },
    /** Google's stable account id (`sub`); set once an account signs in with Google. */
    googleId: { type: String, unique: true, sparse: true },
    /**
     * When the password was last reset. Sessions signed in before this moment are
     * no longer accepted (see dropRevokedSessions), so a reset also signs out
     * whoever else was using the account.
     */
    passwordChangedAt: { type: Date },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", default: null },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>

export const User = model("User", userSchema)

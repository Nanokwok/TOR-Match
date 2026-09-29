import bcrypt from "bcryptjs"

import { User } from "@/models/User.model"

const SALT_ROUNDS = 10

export async function ensureAdminUserFromEnv(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME?.trim() || "Admin"

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed an admin user"
    )
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const existing = await User.findOne({ email }).select("+passwordHash")

  if (!existing) {
    await User.create({
      email,
      name,
      passwordHash,
      role: "admin",
    })
    console.log(`[seed:admin] created admin user ${email}`)
    return
  }

  const updates: { role?: "admin"; name?: string; passwordHash?: string } = {}
  if (existing.role !== "admin") updates.role = "admin"
  if (existing.name !== name) updates.name = name

  const matches = await bcrypt.compare(password, existing.passwordHash)
  if (!matches) updates.passwordHash = passwordHash

  if (Object.keys(updates).length === 0) {
    console.log(`[seed:admin] admin user ${email} already up to date`)
    return
  }

  await User.updateOne({ _id: existing._id }, { $set: updates })
  console.log(`[seed:admin] updated admin user ${email}`)
}

export async function promoteUserToAdmin(emailRaw: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase()
  if (!email) {
    throw new Error("Email is required to promote a user to admin")
  }

  const user = await User.findOne({ email })
  if (!user) {
    throw new Error(`No user found with email ${email}`)
  }

  if (user.role === "admin") {
    console.log(`[seed:admin] ${email} is already an admin`)
    return
  }

  await User.updateOne({ _id: user._id }, { $set: { role: "admin" } })
  console.log(`[seed:admin] promoted ${email} to admin`)
}

/**
 * Creates (or promotes) the admin account the /admin screens sign in with.
 *
 *   npm run seed:admin
 *
 * Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD. Nothing else in the
 * codebase creates an admin — `role` defaults to "user" on registration — so
 * without this the admin API routes are unreachable.
 */
import bcrypt from "bcryptjs"

import { connectDB, disconnectDB } from "@/config/db"
import { User } from "@/models/User.model"

const SALT_ROUNDS = 10

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME?.trim() || "TOR Match Admin"

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed an admin")
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters")
  }

  await connectDB()

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const existing = await User.findOne({ email })

  if (existing) {
    // Re-running rotates the password and (re-)grants the admin role, so a
    // demoted or locked-out admin can always be recovered from the CLI.
    existing.set({ passwordHash, role: "admin", name })
    await existing.save()
    console.log(`[seed:admin] updated existing user ${email} (role: admin)`)
  } else {
    await User.create({ email, name, passwordHash, role: "admin" })
    console.log(`[seed:admin] created admin ${email}`)
  }

  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[seed:admin] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})

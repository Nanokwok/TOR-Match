import { connectDB, disconnectDB } from "@/config/db"
import {
  ensureAdminUserFromEnv,
  promoteUserToAdmin,
} from "@/services/ensure-admin"

function promoteEmailFromArgv(argv: string[]): string | null {
  const flagIndex = argv.indexOf("--promote")
  if (flagIndex !== -1) {
    const email = argv[flagIndex + 1]
    if (!email || email.startsWith("--")) {
      throw new Error("Usage: npm run seed:admin -- --promote <email>")
    }
    return email
  }

  // On some Windows npm invocations `--promote` is dropped; a bare email still means promote.
  const bare = argv.slice(2).find((arg) => arg.includes("@") && !arg.startsWith("-"))
  return bare ?? null
}

async function main() {
  await connectDB()

  const promoteEmail = promoteEmailFromArgv(process.argv)
  if (promoteEmail) {
    await promoteUserToAdmin(promoteEmail)
  } else {
    await ensureAdminUserFromEnv()
  }

  await disconnectDB()
}

main().catch((error) => {
  console.error("[seed:admin] failed", error)
  process.exit(1)
})

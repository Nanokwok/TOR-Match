/**
 * Sends any digest emails that are due, once, then exits.
 *
 *   npm run notify:digests --workspace backend
 *
 * To try one out right now, whatever the schedule says, for a single account:
 *
 *   npm run notify:digests --workspace backend -- --to=you@example.com
 */
import { connectDB, disconnectDB } from "@/config/db"
import { sendDueDigests } from "@/services/digest.service"

async function main() {
  const to = process.argv.find((arg) => arg.startsWith("--to="))?.slice("--to=".length)
  await connectDB()
  const sent = await sendDueDigests(to ? { force: { email: to } } : {})
  console.log(`[digest] sent ${sent.daily} daily and ${sent.weekly} weekly digest(s)`)
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[digest] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})

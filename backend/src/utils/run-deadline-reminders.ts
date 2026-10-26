/**
 * Sends any deadline reminders that are due, once, then exits. For a system
 * scheduler (cron / Task Scheduler) when the API server is not the one
 * running the hourly job.
 *
 *   npm run notify:deadlines --workspace backend
 */
import { connectDB, disconnectDB } from "@/config/db"
import { notifyDeadlineReminders } from "@/services/deadline-reminder.service"
import { notifyCertificateExpiry } from "@/services/profile-notification.service"

async function main() {
  await connectDB()
  const tracked = await notifyDeadlineReminders()
  const certificates = await notifyCertificateExpiry()
  console.log(`[deadline-reminders] checked ${tracked} tracked card(s) with a deadline in range, ${certificates} certificate alert(s)`)
  await disconnectDB()
}

main().catch(async (error) => {
  console.error("[deadline-reminders] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})

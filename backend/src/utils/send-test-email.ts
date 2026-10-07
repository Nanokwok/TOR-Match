/**
 * Sends one sample notification email, to check the SMTP settings in .env.
 *
 *   npm run email:test --workspace backend                 # to SMTP_USER
 *   npm run email:test --workspace backend -- me@x.co      # to an address
 */
import { connectDB, disconnectDB } from "@/config/db"
import { env } from "@/config/env"
import { sendEmail } from "@/services/email.service"
import { renderEmail } from "@/services/match-notification.service"

async function main() {
  const to = process.argv[2] ?? env.smtpUser
  if (!to) throw new Error("Pass a recipient, or set SMTP_USER")

  const mail = renderEmail(
    {
      title: { en: "Test: High-budget TOR", th: "ทดสอบ: TOR งบประมาณสูง" },
      description: {
        en: "If you can read this, TOR Match email alerts are working.",
        th: "ถ้าคุณอ่านอีเมลนี้ได้ แปลว่าระบบแจ้งเตือนทางอีเมลของ TOR Match ทำงานแล้ว",
      },
      link: "/browse",
    },
    env.appUrl
  )

  // Connects so the admin-configured sender (Admin Settings) is read, as in the real app.
  await connectDB()
  const sent = await sendEmail({ to, ...mail })
  await disconnectDB()
  console.log(sent ? `[email] sent to ${to}` : "[email] not sent — SMTP_HOST is not set")
}

main().catch((error) => {
  console.error("[email] failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})

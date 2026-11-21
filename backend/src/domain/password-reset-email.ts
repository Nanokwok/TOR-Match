import { emailLayout } from "@/domain/email-layout"
import { PASSWORD_RESET_TTL_MS } from "@/domain/password-reset"
import { escapeHtml } from "@/utils/html"

const MINUTES = PASSWORD_RESET_TTL_MS / 60_000

/**
 * The email that carries a reset link. Thai first, English under it, like every
 * other email the app sends. It is an account email, so it is not tied to the
 * notification settings and says so in the footer.
 */
export function renderPasswordResetEmail(params: { name: string; resetUrl: string; appUrl: string }) {
  const { name, resetUrl, appUrl } = params

  const text = [
    `สวัสดี ${name},`,
    "",
    "เราได้รับคำขอรีเซ็ตรหัสผ่านของบัญชี TOR Match ของคุณ เปิดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:",
    resetUrl,
    "",
    `ลิงก์นี้ใช้ได้ภายใน ${MINUTES} นาที และใช้ได้เพียงครั้งเดียว`,
    "หากคุณไม่ได้เป็นผู้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมของคุณยังใช้ได้ตามปกติ",
    "",
    `Hi ${name},`,
    "",
    "We received a request to reset the password of your TOR Match account. Open the link below to choose a new one:",
    resetUrl,
    "",
    `This link works for ${MINUTES} minutes and can be used once.`,
    "If you did not ask for this, you can ignore this email; your current password still works.",
  ].join("\n")

  const html = emailLayout({
    headingTh: "รีเซ็ตรหัสผ่านของคุณ",
    headingEn: "Reset your password",
    appUrl,
    bodyHtml:
      `<p style="margin:0 0 12px">สวัสดี ${escapeHtml(name)}, เราได้รับคำขอรีเซ็ตรหัสผ่านของบัญชีนี้ ` +
      `ลิงก์ใช้ได้ภายใน ${MINUTES} นาที และใช้ได้เพียงครั้งเดียว หากคุณไม่ได้เป็นผู้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ</p>` +
      `<p style="margin:0 0 12px;color:#737373">Hi ${escapeHtml(name)}, we received a request to reset the password of this account. ` +
      `The link works for ${MINUTES} minutes and can be used once. If you did not ask for this, ignore this email; your current password still works.</p>` +
      `<p style="margin:16px 0 0;font-size:12px;color:#737373;word-break:break-all">ถ้าปุ่มไม่ทำงาน คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์ / If the button does not work, paste this link into your browser:<br>${escapeHtml(resetUrl)}</p>`,
    cta: { label: "ตั้งรหัสผ่านใหม่ / Set a new password", url: resetUrl },
    footer: {
      th: "อีเมลนี้เป็นอีเมลเกี่ยวกับบัญชีของคุณ จึงส่งแม้ปิดการแจ้งเตือนอื่นไว้",
      en: "This is an account email, so it is sent even when other notifications are turned off.",
    },
  })

  return { subject: "รีเซ็ตรหัสผ่าน TOR Match / Reset your TOR Match password", text, html }
}

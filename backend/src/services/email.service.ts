import nodemailer, { type Transporter } from "nodemailer"

import { env } from "@/config/env"
import {
  SYSTEM_SETTINGS_SINGLETON_KEY,
  SystemSettings,
} from "@/models/SystemSettings.model"

export type OutgoingEmail = { to: string; subject: string; text: string; html: string }

/** The shipped default before the sender became configurable; it never was a real mailbox. */
const OLD_PLACEHOLDER_SENDER = "support@tormatch.local"

/**
 * Pure: the From and Reply-To for outgoing mail. The admin's "Support email"
 * (Admin Settings) wins; with none set, the MAIL_FROM from .env is used. Note
 * that Gmail rewrites From to the account that logs in over SMTP unless the
 * address is a verified alias, which is why Reply-To carries it as well.
 */
export function resolveSender(
  adminEmail: string | undefined | null,
  fallbackFrom: string
): { from: string; replyTo?: string } {
  const email = adminEmail?.trim()
  if (!email || email === OLD_PLACEHOLDER_SENDER) return { from: fallbackFrom }
  return { from: `TOR Match <${email}>`, replyTo: email }
}

/** Reads the admin-configured sender once, so a batch of emails does not query it per message. */
export async function currentSender() {
  const settings = await SystemSettings.findOne({ singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY })
    .select("supportEmail")
    .lean()
  return resolveSender(settings?.supportEmail, env.mailFrom)
}

let transporter: Transporter | null | undefined

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter
  if (!env.smtpHost) {
    console.warn("[email] SMTP_HOST is not set — notification emails are skipped")
    transporter = null
    return transporter
  }
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  })
  return transporter
}

/** True when the message was accepted by the mail server; false when email is not configured. Throws on a delivery failure. */
export async function sendEmail(
  message: OutgoingEmail,
  sender?: { from: string; replyTo?: string }
): Promise<boolean> {
  const mailer = getTransporter()
  if (!mailer) return false
  await mailer.sendMail({ ...(sender ?? (await currentSender())), ...message })
  return true
}

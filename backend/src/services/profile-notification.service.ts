import { bangkokClock } from "@/domain/digest-schedule"
import { certificateExpiry } from "@/domain/certificate-expiry"
import { Company, type CompanyDoc } from "@/models/Company.model"
import { deliver, type NewNotification } from "@/services/match-notification.service"

/**
 * "System & profile verification" alerts: what happens to a company's profile
 * that its owner would want to hear about. Two things trigger them today — an
 * admin approving or suspending the profile, and a certificate on it running
 * out, which quietly turns every requirement that needs that certificate into
 * a failure.
 */

const CERTIFICATE_NAMES: Record<string, string> = {
  "iso-29110": "ISO/IEC 29110",
  "iso-27001": "ISO/IEC 27001",
  "cmmi-2": "CMMI Level 2+",
  "iso-9001": "ISO 9001",
}

const PROFILE_LINK = "/company-profile"

const STATUS_COPY = {
  active: {
    title: { en: "Your company profile was approved", th: "โปรไฟล์บริษัทของคุณได้รับการอนุมัติแล้ว" },
    description: {
      en: "You will now be matched with TORs and notified when one fits.",
      th: "ระบบจะจับคู่ TOR และแจ้งเตือนเมื่อมีโครงการที่เหมาะกับคุณ",
    },
  },
  suspended: {
    title: { en: "Your company profile was suspended", th: "โปรไฟล์บริษัทของคุณถูกระงับ" },
    description: {
      en: "An administrator suspended this profile. Contact support to have it restored.",
      th: "ผู้ดูแลระบบระงับโปรไฟล์นี้ กรุณาติดต่อฝ่ายสนับสนุนเพื่อขอเปิดใช้งานอีกครั้ง",
    },
  },
  pending: {
    title: { en: "Your company profile is under review", th: "โปรไฟล์บริษัทของคุณอยู่ระหว่างการตรวจสอบ" },
    description: {
      en: "An administrator is reviewing this profile again.",
      th: "ผู้ดูแลระบบกำลังตรวจสอบโปรไฟล์นี้อีกครั้ง",
    },
  },
} as const

/**
 * Tells the owner their profile's status changed. Call it once, right after an
 * admin changes it, so there is nothing to dedupe against: two real changes to
 * the same status are two alerts.
 */
export async function notifyCompanyStatusChanged(company: CompanyDoc, status: keyof typeof STATUS_COPY): Promise<void> {
  const copy = STATUS_COPY[status]
  await deliver("system-profile", [
    {
      userId: company.ownerId,
      category: "system",
      dedupeKey: `profile-status:${company._id}:${status}:${Date.now()}`,
      link: PROFILE_LINK,
      title: copy.title,
      description: copy.description,
    },
  ])
}

function certificateAlert(
  company: CompanyDoc,
  cert: { id: string; expirationDate: string },
  state: ReturnType<typeof certificateExpiry>
): NewNotification | null {
  if (state.state !== "expired" && state.state !== "expiring") return null
  const name = CERTIFICATE_NAMES[cert.id] ?? cert.id
  const expired = state.state === "expired"
  return {
    userId: company.ownerId,
    category: "system",
    // One alert per certificate and expiration date: renewing it (a new date) re-arms the warning.
    dedupeKey: `cert-${state.state}:${company.ownerId}:${cert.id}:${cert.expirationDate}`,
    link: PROFILE_LINK,
    title: expired
      ? { en: `${name} has expired`, th: `ใบรับรอง ${name} หมดอายุแล้ว` }
      : { en: `${name} expires soon`, th: `ใบรับรอง ${name} ใกล้หมดอายุ` },
    description: expired
      ? {
          en: `It expired on ${cert.expirationDate}, so TORs that require it no longer match. Update the certificate on your profile.`,
          th: `หมดอายุเมื่อ ${cert.expirationDate} จึงไม่ผ่านเงื่อนไขของ TOR ที่ต้องใช้ใบรับรองนี้ กรุณาอัปเดตในโปรไฟล์`,
        }
      : {
          en: `It expires on ${cert.expirationDate} (${state.daysLeft} day${state.daysLeft === 1 ? "" : "s"} left). Renew it so you keep matching TORs that require it.`,
          th: `หมดอายุวันที่ ${cert.expirationDate} (เหลือ ${state.daysLeft} วัน) ต่อใบรับรองเพื่อให้ยังผ่านเงื่อนไขของ TOR ที่ต้องใช้`,
        },
  }
}

/**
 * Warns owners of certificates that are about to expire or already have. Only
 * certificates the company has selected count. Safe to run as often as you
 * like: each certificate and expiration date alerts once.
 */
export async function notifyCertificateExpiry(now = new Date()): Promise<number> {
  const today = bangkokClock(now).date
  const companies = await Company.find({ "certifications.selected": true })

  const alerts: NewNotification[] = []
  for (const company of companies) {
    for (const cert of company.certifications ?? []) {
      if (!cert.selected) continue
      const alert = certificateAlert(company, { id: cert.id, expirationDate: cert.expirationDate ?? "" }, certificateExpiry(cert.expirationDate, today))
      if (alert) alerts.push(alert)
    }
  }
  if (alerts.length) await deliver("system-profile", alerts)
  return alerts.length
}

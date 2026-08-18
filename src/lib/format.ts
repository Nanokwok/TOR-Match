import type { Locale } from "@/lib/i18n"
import { localeToIntl } from "@/lib/i18n"

export function formatBaht(amount: number, locale: Locale = "en") {
  const label = locale === "th" ? "บาท" : "Baht"
  return `${amount.toLocaleString(localeToIntl(locale))} ${label}`
}

export function formatThb(amount: number, locale: Locale = "en") {
  return `฿${amount.toLocaleString(localeToIntl(locale))} THB`
}

export function formatMilestoneLabel(
  milestoneNumber: number,
  percent: number,
  amountBaht: number,
  locale: Locale = "en"
) {
  const intl = localeToIntl(locale)
  if (locale === "th") {
    return `งวดที่ ${milestoneNumber} (${percent}% - ฿${amountBaht.toLocaleString(intl)})`
  }
  return `Milestone ${milestoneNumber} (${percent}% - ฿${amountBaht.toLocaleString(intl)})`
}

export function formatTorDeadline(isoDate: string, locale: Locale = "en") {
  const date = new Date(isoDate)
  const intl = localeToIntl(locale)
  const datePart = new Intl.DateTimeFormat(intl, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(date)
  const timePart = new Intl.DateTimeFormat(intl, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(date)

  return `${datePart} — ${timePart}`
}

export function getDaysUntilDeadline(deadline: string) {
  const now = new Date()
  const end = new Date(deadline)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatShortDate(isoDate: string, locale: Locale = "en") {
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(isoDate))
}

export function formatDaysLeft(
  deadline: string,
  locale: Locale = "en",
  labels?: { dueToday: string; oneDayLeft: string; daysLeft: string }
) {
  const days = getDaysUntilDeadline(deadline)
  const dueToday = labels?.dueToday ?? "Due today"
  const oneDayLeft = labels?.oneDayLeft ?? "1 Day Left"
  const daysLeft = labels?.daysLeft ?? `${days} Days Left`

  const label =
    days <= 0 ? dueToday : days === 1 ? oneDayLeft : daysLeft.replace("{days}", String(days))
  return `${label} (${formatShortDate(deadline, locale)})`
}

export function formatRelativeTime(isoDate: string, locale: Locale = "en") {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = Math.max(0, now - then)
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (locale === "th") {
    if (minutes < 1) return "เมื่อสักครู่"
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
    if (days === 1) return "เมื่อวาน"
    if (days < 7) return `${days} วันที่แล้ว`
    return formatShortDate(isoDate, locale)
  }

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return formatShortDate(isoDate, locale)
}

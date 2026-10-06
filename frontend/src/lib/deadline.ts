import type { Locale } from "@/lib/i18n"
import type { Tor, TorProcurementStatus } from "@/types/tor"
import { getDaysUntilDeadline } from "@/lib/format"

export const DEFAULT_APPROACHING_DEADLINE_DAYS = 7

export type DeadlineUrgency = "overdue" | "critical" | "approaching" | "normal"

export type DeadlineStatus = {
  daysLeft: number
  isValid: boolean
  isOverdue: boolean
  isDueToday: boolean
  isApproaching: boolean
  urgency: DeadlineUrgency
}

export function isValidDateString(dateStr: string | null | undefined): dateStr is string {
  if (!dateStr?.trim()) return false
  const date = new Date(dateStr)
  return !Number.isNaN(date.getTime())
}

export function isApproachingDeadline(
  deadline: string | null | undefined,
  thresholdDays: number = DEFAULT_APPROACHING_DEADLINE_DAYS,
  options?: { inclusive?: boolean; now?: Date }
): boolean {
  if (!deadline || !isValidDateString(deadline)) return false

  const daysLeft = getDaysUntilDeadline(deadline)
  if (daysLeft < 0) return false // Deadline has already passed

  return options?.inclusive ? daysLeft <= thresholdDays : daysLeft < thresholdDays
}

export function getDeadlineStatus(
  deadline: string | null | undefined,
  thresholdDays: number = DEFAULT_APPROACHING_DEADLINE_DAYS,
  options?: { inclusive?: boolean }
): DeadlineStatus {
  if (!deadline || !isValidDateString(deadline)) {
    return {
      daysLeft: 0,
      isValid: false,
      isOverdue: false,
      isDueToday: false,
      isApproaching: false,
      urgency: "normal",
    }
  }

  const daysLeft = getDaysUntilDeadline(deadline)
  const isOverdue = daysLeft < 0
  const isDueToday = daysLeft === 0
  const isApproaching =
    !isOverdue &&
    (options?.inclusive ? daysLeft <= thresholdDays : daysLeft < thresholdDays)

  let urgency: DeadlineUrgency = "normal"
  if (isOverdue) {
    urgency = "overdue"
  } else if (daysLeft <= 1) {
    urgency = "critical"
  } else if (isApproaching) {
    urgency = "approaching"
  }

  return {
    daysLeft,
    isValid: true,
    isOverdue,
    isDueToday,
    isApproaching,
    urgency,
  }
}

export { getDaysUntilDeadline }

export type TorStage = "draft" | "open" | "closed"

export type TorStatusBadgeInfo = {
  stage: TorStage
  label: string
  shortLabel: string
  variantClasses: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
}

export type TorDeadlineInfo = {
  stage: TorStage
  label: string
  dateText: string
  fullDisplay: string
  isPendingNotice: boolean
  pendingNoticeText: string
  daysLeft: number | null
}

function isValidIsoDate(isoDate?: string | null): boolean {
  if (!isoDate || typeof isoDate !== "string") return false
  const trimmed = isoDate.trim()
  if (!trimmed || trimmed === "-") return false
  const time = new Date(trimmed).getTime()
  return !Number.isNaN(time)
}

/**
 * Determine the procurement stage of a TOR:
 * 1. "draft": ร่าง TOR / ประชาพิจารณ์ (status === "draft" or missing/empty deadline)
 * 2. "open": เปิดรับซองข้อเสนอ (status === "open" | "closing-soon")
 * 3. "closed": สิ้นสุดการยื่น / รอประกาศผล (status === "closed" | "awarded")
 */
export function getTorStage(tor: {
  status?: TorProcurementStatus | string
  deadline?: string | null
}): TorStage {
  const status = (tor.status || "").toLowerCase()
  if (status === "draft" || !isValidIsoDate(tor.deadline)) {
    return "draft"
  }
  if (status === "closed" || status === "awarded") {
    return "closed"
  }
  return "open"
}

/**
 * Format a date string in Thai Buddhist Era (พ.ศ. 2 digits, e.g. "15 ต.ค. 69")
 * or standard English (e.g. "15 Oct 26").
 */
export function formatThaiShortDate(isoDate: string, locale: Locale = "th"): string {
  if (!isValidIsoDate(isoDate)) return "-"
  const date = new Date(isoDate)

  if (locale === "th") {
    // Uses Thai calendar with Buddhist Era year (2 digits: 2569 -> "69")
    try {
      const formatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        day: "numeric",
        month: "short",
        year: "2-digit",
        timeZone: "Asia/Bangkok",
      })
      return formatter.format(date)
    } catch {
      return date.toLocaleDateString("th-TH")
    }
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      timeZone: "Asia/Bangkok",
    })
    return formatter.format(date)
  } catch {
    return date.toLocaleDateString("en-US")
  }
}

/**
 * Calculate the number of days left from now until the deadline.
 */
export function getDaysLeftUntil(
  deadline: string,
  currentDate: Date = new Date()
): number {
  if (!isValidIsoDate(deadline)) return 0
  const target = new Date(deadline)
  const diffMs = target.getTime() - currentDate.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Get the status pill/badge presentation:
 * - ถ้าร่าง TOR: [ ร่าง TOR / ประชาพิจารณ์ ] (สีส้ม/เหลือง)
 * - ถ้าเปิดซองแล้ว: [ เปิดรับซองข้อเสนอ ] (สีเขียว)
 * - ถ้าปิดรับ/ได้ผู้ชนะแล้ว: [ สิ้นสุดการยื่น / รอประกาศผล ] (สีเทา)
 */
export function getTorStatusBadgeInfo(
  tor: { status?: TorProcurementStatus | string; deadline?: string | null },
  locale: Locale = "th"
): TorStatusBadgeInfo {
  const stage = getTorStage(tor)

  if (stage === "draft") {
    return {
      stage: "draft",
      label: locale === "th" ? "ร่าง TOR / ประชาพิจารณ์" : "Draft TOR / Public Hearing",
      shortLabel: locale === "th" ? "ร่าง TOR" : "Draft TOR",
      variantClasses:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      badgeBg: "bg-slate-100 dark:bg-slate-800",
      badgeText: "text-slate-700 dark:text-slate-300",
      badgeBorder: "border-slate-200 dark:border-slate-700",
    }
  }

  if (stage === "closed") {
    return {
      stage: "closed",
      label:
        locale === "th"
          ? "สิ้นสุดการยื่น / รอประกาศผล"
          : "Submission Ended / Awaiting Results",
      shortLabel: locale === "th" ? "สิ้นสุดการยื่น" : "Ended",
      variantClasses:
        "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      badgeBg: "bg-slate-100 dark:bg-slate-800",
      badgeText: "text-slate-700 dark:text-slate-300",
      badgeBorder: "border-slate-300 dark:border-slate-700",
    }
  }

  // stage === "open"
  return {
    stage: "open",
    label: locale === "th" ? "เปิดรับซองข้อเสนอ" : "Accepting Proposals",
    shortLabel: locale === "th" ? "เปิดรับซอง" : "Open",
    variantClasses:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    badgeBorder: "border-emerald-300 dark:border-emerald-800",
  }
}

/**
 * Get deadline label, formatted date, and full display text based on procurement stage:
 * - ถ้าร่าง TOR: วิจารณ์ได้ถึง: 15 ต.ค. 69 (หรือ "-" พร้อม Tooltip ถ้ายังไม่มีวัน)
 * - ถ้าเปิดซองแล้ว: กำหนดส่งซอง: 20 ต.ค. 69 (เหลือ 5 วัน)
 * - ถ้าปิดรับ/ได้ผู้ชนะแล้ว: สิ้นสุดการยื่น / รอประกาศผล
 */
export function getTorDeadlineInfo(
  tor: { status?: TorProcurementStatus | string; deadline?: string | null },
  locale: Locale = "th",
  currentDate: Date = new Date()
): TorDeadlineInfo {
  const stage = getTorStage(tor)
  const hasDate = isValidIsoDate(tor.deadline)
  const formattedDate = hasDate ? formatThaiShortDate(tor.deadline!, locale) : "-"

  const pendingNoticeText =
    locale === "th"
      ? "ฉบับนี้ยังไม่ได้อยู่ในขั้นประกาศเชิญชวน บุ๊กมาร์กไว้แล้วเราจะแจ้งเตือนเมื่อมีประกาศเชิญชวน"
      : "This document is not yet at the invitation-to-bid stage. Bookmark it and we will notify you when the invitation is published."

  if (stage === "draft") {
    const label = locale === "th" ? "วิจารณ์ได้ถึง" : "Critique Deadline"
    const dateText = hasDate ? formattedDate : "-"
    return {
      stage: "draft",
      label,
      dateText,
      fullDisplay: `${label}: ${dateText}`,
      isPendingNotice: !hasDate,
      pendingNoticeText,
      daysLeft: hasDate ? getDaysLeftUntil(tor.deadline!, currentDate) : null,
    }
  }

  if (stage === "closed") {
    const label = locale === "th" ? "สิ้นสุดการยื่น" : "Submission Closed"
    const dateText = hasDate ? formattedDate : locale === "th" ? "สิ้นสุดแล้ว" : "Ended"
    return {
      stage: "closed",
      label,
      dateText,
      fullDisplay: hasDate ? `${label}: ${dateText}` : label,
      isPendingNotice: false,
      pendingNoticeText: "",
      daysLeft: null,
    }
  }

  // stage === "open"
  const label = locale === "th" ? "กำหนดส่งซอง" : "Submission Deadline"
  if (!hasDate) {
    return {
      stage: "open",
      label,
      dateText: "-",
      fullDisplay: `${label}: -`,
      isPendingNotice: true,
      pendingNoticeText,
      daysLeft: null,
    }
  }

  const daysLeft = getDaysLeftUntil(tor.deadline!, currentDate)
  let daysLeftText = ""
  if (locale === "th") {
    if (daysLeft > 1) daysLeftText = ` (เหลือ ${daysLeft} วัน)`
    else if (daysLeft === 1) daysLeftText = " (เหลือ 1 วัน)"
    else if (daysLeft === 0) daysLeftText = " (วันนี้)"
    else daysLeftText = " (สิ้นสุดแล้ว)"
  } else {
    if (daysLeft > 1) daysLeftText = ` (${daysLeft} days left)`
    else if (daysLeft === 1) daysLeftText = " (1 day left)"
    else if (daysLeft === 0) daysLeftText = " (due today)"
    else daysLeftText = " (ended)"
  }

  const dateText = `${formattedDate}${daysLeftText}`
  return {
    stage: "open",
    label,
    dateText,
    fullDisplay: `${label}: ${dateText}`,
    isPendingNotice: false,
    pendingNoticeText: "",
    daysLeft,
  }
}

export type MatchBadgeResult = {
  status: "passed" | "failed" | "pending"
  label: string
  classes: string
}

/**
 * Get visual match badge:
 * Shortened to 1 word:
 * - ผ่าน (สีเขียว)
 * - ไม่ผ่าน (สีแดง)
 * - รอตรวจ (สีเทา)
 */
export function getTorMatchBadge(
  tor: { eligible?: boolean; qualification?: Tor["qualification"] },
  locale: Locale = "th"
): MatchBadgeResult {
  const check = tor.qualification
  const failedRows = check?.rows.filter((r) => r.status === "failed") ?? []

  if (
    failedRows.length > 0 ||
    tor.eligible === false ||
    check?.status === "failed"
  ) {
    return {
      status: "failed",
      label: locale === "th" ? "ไม่ผ่าน" : "Ineligible",
      classes:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    }
  }

  if (tor.eligible || check?.status === "passed") {
    return {
      status: "passed",
      label: locale === "th" ? "ผ่าน" : "Eligible",
      classes:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    }
  }

  return {
    status: "pending",
    label: locale === "th" ? "รอตรวจ" : "Review",
    classes: "bg-muted/70 text-muted-foreground border-border",
  }
}

export type DeadlineCountdownResult = {
  label: string
  urgency: "urgent" | "warning" | "normal" | "draft" | "ended"
  classes: string
  textClass: string
}

/**
 * Get deadline countdown indicator for card bottom-right or urgency pill:
 * - เช่น เหลือ 7 วัน หรือ เหลือ 3 วัน หรือ ปิดรับวันนี้
 */
export function getTorDeadlineCountdown(
  tor: { status?: TorProcurementStatus | string; deadline?: string | null },
  locale: Locale = "th",
  currentDate: Date = new Date()
): DeadlineCountdownResult {
  const stage = getTorStage(tor)
  const hasDate = isValidIsoDate(tor.deadline)

  if (stage === "draft") {
    if (hasDate) {
      const days = getDaysLeftUntil(tor.deadline!, currentDate)
      if (days > 0) {
        const isUrgent = days <= 3
        const isWarning = days <= 7
        return {
          label: locale === "th" ? `เหลือ ${days} วัน` : `${days}d left`,
          urgency: isUrgent ? "urgent" : isWarning ? "warning" : "normal",
          classes:
            "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          textClass: isUrgent
            ? "text-red-600 dark:text-red-400 font-semibold"
            : isWarning
            ? "text-amber-600 dark:text-amber-400 font-medium"
            : "text-muted-foreground font-normal",
        }
      }
      return {
        label: locale === "th" ? "สิ้นสุดการวิจารณ์" : "Ended",
        urgency: "ended",
        classes:
          "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        textClass: "text-muted-foreground font-normal",
      }
    }

    return {
      label: "-",
      urgency: "draft",
      classes:
        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      textClass: "text-muted-foreground/70 font-normal",
    }
  }

  if (stage === "closed") {
    return {
      label: locale === "th" ? "ปิดรับแล้ว" : "Closed",
      urgency: "ended",
      classes: "bg-muted/50 text-muted-foreground border-border",
      textClass: "text-muted-foreground font-normal",
    }
  }

  // stage === "open"
  if (!hasDate) {
    return {
      label: "-",
      urgency: "normal",
      classes: "bg-muted/50 text-muted-foreground border-border",
      textClass: "text-muted-foreground/70 font-normal",
    }
  }

  const days = getDaysLeftUntil(tor.deadline!, currentDate)

  if (days <= 0) {
    return {
      label:
        locale === "th"
          ? days === 0
            ? "ปิดรับวันนี้"
            : "ปิดรับแล้ว"
          : days === 0
          ? "Due today"
          : "Closed",
      urgency: "urgent",
      classes:
        "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 font-semibold",
      textClass: "text-red-600 dark:text-red-400 font-semibold",
    }
  }

  if (days <= 3) {
    return {
      label: locale === "th" ? `เหลือ ${days} วัน` : `${days}d left`,
      urgency: "urgent",
      classes:
        "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 font-semibold",
      textClass: "text-red-600 dark:text-red-400 font-semibold",
    }
  }

  if (days <= 7) {
    return {
      label: locale === "th" ? `เหลือ ${days} วัน` : `${days}d left`,
      urgency: "warning",
      classes:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-medium",
      textClass: "text-amber-600 dark:text-amber-400 font-medium",
    }
  }

  return {
    label: locale === "th" ? `เหลือ ${days} วัน` : `${days}d left`,
    urgency: "normal",
    classes: "bg-muted/60 text-muted-foreground border-border font-normal",
    textClass: "text-muted-foreground font-normal",
  }
}

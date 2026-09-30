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

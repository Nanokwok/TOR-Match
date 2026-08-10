export function formatBaht(amount: number) {
  return `${amount.toLocaleString("en-US")} Baht`
}

export function formatThb(amount: number) {
  return `฿${amount.toLocaleString("en-US")} THB`
}

export function formatMilestoneLabel(
  milestoneNumber: number,
  percent: number,
  amountBaht: number
) {
  return `Milestone ${milestoneNumber} (${percent}% - ฿${amountBaht.toLocaleString("en-US")})`
}

export function formatTorDeadline(isoDate: string) {
  const date = new Date(isoDate)
  const datePart = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(date)
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(date)

  return `${datePart} — ${timePart} PM`
}

export function getDaysUntilDeadline(deadline: string) {
  const now = new Date()
  const end = new Date(deadline)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatShortDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(isoDate))
}

export function formatDaysLeft(deadline: string) {
  const days = getDaysUntilDeadline(deadline)
  const label =
    days <= 0
      ? "Due today"
      : days === 1
        ? "1 Day Left"
        : `${days} Days Left`
  return `${label} (${formatShortDate(deadline)})`
}

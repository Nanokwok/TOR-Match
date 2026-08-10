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

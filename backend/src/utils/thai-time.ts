/**
 * Pure: a stored date as a Date. The review form stores local wall-clock text
 * with no offset, and these are Thai government dates, so an offset-less value
 * means Bangkok time — not whatever zone the server happens to run in. A bare
 * date closes at the end of that day.
 */
export function parseThaiDateTime(value: string | undefined | null): Date | null {
  const text = value?.trim()
  if (!text) return null
  const withZone = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T23:59:00+07:00`
    : /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text)
      ? `${text}+07:00`
      : text
  const date = new Date(withZone)
  return Number.isNaN(date.getTime()) ? null : date
}

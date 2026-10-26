/**
 * When a digest email is due. Times a user picks in the settings screen are
 * Bangkok wall-clock times, whatever zone the server runs in.
 */

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
export type Weekday = (typeof WEEKDAYS)[number]

/** How long after its scheduled time a digest may still go out (the server may have been down). */
export const DIGEST_GRACE_MINUTES = 6 * 60

export type DigestKind = "daily" | "weekly"

/** Pure: the Bangkok date, minutes since midnight and weekday of an instant. */
export function bangkokClock(now: Date): { date: string; minutes: number; weekday: Weekday } {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    weekday: WEEKDAYS[shifted.getUTCDay()],
  }
}

/** Pure: "08:30" as minutes since midnight, or null when it is not a time. */
export function parseClockTime(value: string | undefined | null): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "")
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

/**
 * Pure: whether a digest is due right now, and the key that identifies this
 * occurrence. The key is stored once a digest goes out, so being "due" for
 * several ticks in a row still sends exactly one email.
 *
 * Daily: due from the chosen time until the grace period ends, each day.
 * Weekly: the same, but only on the chosen weekday.
 */
export function digestDue(params: {
  kind: DigestKind
  time: string
  weekday?: string
  now: Date
  graceMinutes?: number
}): { due: boolean; periodKey: string } {
  const { kind, time, weekday, now, graceMinutes = DIGEST_GRACE_MINUTES } = params
  const clock = bangkokClock(now)
  const periodKey = `${kind}:${clock.date}`
  const scheduled = parseClockTime(time)
  if (scheduled === null) return { due: false, periodKey }
  if (kind === "weekly" && clock.weekday !== weekday) return { due: false, periodKey }
  const late = clock.minutes - scheduled
  return { due: late >= 0 && late < graceMinutes, periodKey }
}

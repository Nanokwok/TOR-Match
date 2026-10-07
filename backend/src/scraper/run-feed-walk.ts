/**
 * Walks the e-GP feed backwards one day at a time, to find how far back it
 * serves and what we would gain by reading it that way.
 *
 *   npm run walk:feed                         # back until the feed runs dry
 *   npm run walk:feed "--" --types P0         # one type — the cheap depth probe
 *   npm run walk:feed "--" --days 60          # hard stop after 60 days
 *   npm run walk:feed "--" --stop-after 15    # dry days tolerated before giving up
 *   npm run walk:feed "--" --out history.json # every announcement found, as JSON
 *
 * The separator is quoted because PowerShell eats a bare `--`; see cli-flags.
 *
 * Why this exists. The feed caps a day at 20 items per announcement type
 * (§4.2), and a busy day at the BMA publishes far more — 84 plans on
 * 2026-10-07, 116 on 2026-09-30. The documented escape hatch, re-querying per
 * `methodId`, turned out not to be one: for P0 the parameter is ignored
 * outright (all twelve methods return the same 20 items), and for D0 it is
 * honoured but cannot split the day because nearly every BMA announcement is
 * e-bidding. Measured: twelve extra requests, zero extra announcements.
 *
 * `announceDate` (§4.6) is the axis that does work. Each day queried gets its
 * own 20-item allowance, and the feed answers for days far outside the seven
 * the undated query backfills — 2026-09-07 still answered when probed on
 * 2026-10-07. Ten day-queries of P0 returned 140 unique projects where the
 * undated query returned 20.
 *
 * This script only reads: nothing is written to the database and no document is
 * downloaded. It reports what a day-walking ingest would collect, so the gain
 * can be weighed against the request cost before the ingest is rewired.
 *
 * A day with no items is not the end of the feed — weekends and public
 * holidays are genuinely empty (2026-10-04 and 2026-09-27 were Sundays). So the
 * walk stops only after `--stop-after` *consecutive* empty days.
 */
import { writeFileSync } from "node:fs"

import { connectDB, disconnectDB } from "@/config/db"
import { env } from "@/config/env"
import { TorDraft } from "@/models/TorDraft.model"
import {
  ANNOUNCE_TYPES,
  announceDateCode,
  FEED_WINDOW_LABEL,
  fetchFeed,
  isFeedOpen,
  type AnnounceType,
} from "@/scraper/egp-rss"
import { titleSuggestsSoftware } from "@/scraper/software-filter"
import { readFlag } from "@/utils/cli-flags"

/** Spacing between requests, matching the ingest's own sweep. */
const REQUEST_GAP_MS = 300

/**
 * How long to wait after a day's request failed.
 *
 * A long walk is hundreds of requests against someone else's public service,
 * and it starts refusing them well before the history runs out. Slowing down
 * on a refusal is what lets the walk reach the end of the feed rather than the
 * end of its own welcome.
 */
const FAILURE_BACKOFF_MS = 5_000

/**
 * How many consecutive empty days end the walk. Two covers a weekend; Thai
 * public holidays can bridge a weekend into four or five days, and Songkran
 * closes most of a week. Ten is comfortably past that without spending
 * hundreds of requests proving the feed is finished.
 */
const DEFAULT_STOP_AFTER = 10

/** A ceiling, so a feed that answers for every date cannot loop for ever. */
const DEFAULT_MAX_DAYS = 400

const ALL_TYPES = Object.values(ANNOUNCE_TYPES)

type Options = {
  types: AnnounceType[]
  maxDays: number
  stopAfter: number
  out?: string
}

function parseTypes(raw: string | undefined): AnnounceType[] {
  if (!raw) return ALL_TYPES
  const wanted = raw.split(",").map((part) => part.trim().toUpperCase()).filter(Boolean)
  const unknown = wanted.filter((type) => !ALL_TYPES.includes(type as AnnounceType))
  if (unknown.length) {
    throw new Error(`Unknown announce type(s): ${unknown.join(", ")}. Known: ${ALL_TYPES.join(", ")}`)
  }
  return ALL_TYPES.filter((type) => wanted.includes(type))
}

function positiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--${name} must be a positive whole number, got "${raw}"`)
  }
  return value
}

function parseArgs(argv: string[]): Options {
  return {
    types: parseTypes(readFlag(argv, "types")),
    maxDays: positiveInt(readFlag(argv, "days"), DEFAULT_MAX_DAYS, "days"),
    stopAfter: positiveInt(readFlag(argv, "stop-after"), DEFAULT_STOP_AFTER, "stop-after"),
    out: readFlag(argv, "out"),
  }
}

/** What one announcement type returned for one day. */
type Slot = {
  type: AnnounceType
  /** Items returned, after the 20-item cap. */
  items: number
  /** The day's real total as the feed reports it (§4.7). */
  countByDay: number
  /** Announcements the cap kept from us: 0 when the day fitted. */
  lost: number
  failed?: string
}

type DayReport = {
  date: string
  slots: Slot[]
  items: number
  lost: number
}

/** One project, however many announcements and days it was seen across. */
type FoundProject = {
  projectNo: string
  title: string
  types: string[]
  /** Oldest publication date seen for it. */
  firstSeen: string
  software: boolean
}

async function walk(options: Options) {
  const projects = new Map<string, FoundProject & { typeSet: Set<string> }>()
  const days: DayReport[] = []
  let requests = 0
  let dryStreak = 0
  let failedRuns = 0
  let oldestWithItems: string | undefined

  for (let back = 0; back < options.maxDays; back += 1) {
    const announceDate = announceDateCode(back)
    const slots: Slot[] = []

    for (const announceType of options.types) {
      if (requests > 0) await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS))
      requests += 1
      try {
        const result = await fetchFeed({ deptId: env.egpDeptId, announceType, announceDate })
        slots.push({
          type: announceType,
          items: result.items.length,
          countByDay: result.countByDay,
          lost: Math.max(0, result.countByDay - result.items.length),
        })

        for (const item of result.items) {
          const existing = projects.get(item.projectNo)
          if (existing) {
            existing.typeSet.add(announceType)
            if (item.publishedDate && item.publishedDate < existing.firstSeen) {
              existing.firstSeen = item.publishedDate
            }
            continue
          }
          projects.set(item.projectNo, {
            projectNo: item.projectNo,
            title: item.title,
            typeSet: new Set([announceType]),
            types: [],
            firstSeen: item.publishedDate,
            software: titleSuggestsSoftware({ title: item.title }),
          })
        }
      } catch (error) {
        // One day's one type failing must not end a walk that may already have
        // collected hundreds of announcements.
        slots.push({
          type: announceType,
          items: 0,
          countByDay: 0,
          lost: 0,
          failed: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const items = slots.reduce((sum, slot) => sum + slot.items, 0)
    const lost = slots.reduce((sum, slot) => sum + slot.lost, 0)
    days.push({ date: announceDate, slots, items, lost })

    const detail = slots
      .filter((slot) => slot.items || slot.failed)
      .map((slot) => (slot.failed ? `${slot.type}:failed` : `${slot.type}:${slot.items}${slot.lost ? `/${slot.items + slot.lost}` : ""}`))
      .join(" ")
    console.log(
      `[walk] ${announceDate}  ${String(items).padStart(3)} items` +
        `${lost ? `  ${lost} lost to the cap` : ""}${detail ? `  ${detail}` : "  (empty)"}`
    )

    if (items) {
      oldestWithItems = announceDate
      dryStreak = 0
    } else if (slots.some((slot) => slot.failed)) {
      // A day that errored is not a day the feed has nothing for, and counting
      // it as one ends the walk at the wrong place: a burst of refusals after a
      // few hundred rapid requests once made this report the feed as ending in
      // June, when it answers for January perfectly well a moment later.
      dryStreak = 0
      failedRuns += 1
      // Back off, because the far likelier cause is this walk's own pace.
      await new Promise((resolve) => setTimeout(resolve, FAILURE_BACKOFF_MS))
    } else {
      dryStreak += 1
      if (dryStreak >= options.stopAfter) {
        console.log(`[walk] ${dryStreak} empty days in a row — stopping`)
        break
      }
    }
  }

  for (const project of projects.values()) {
    project.types = [...project.typeSet].sort()
  }

  return { projects, days, requests, oldestWithItems, failedRuns }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (!env.egpDeptId) {
    throw new Error("EGP_DEPT_ID must be set (the BMA's e-GP agency code)")
  }
  if (!isFeedOpen()) {
    console.warn(
      `[walk] the e-GP feed only answers during ${FEED_WINDOW_LABEL} — expect every day to come back empty`
    )
  }
  console.log(
    `[walk] ${options.types.join(",")} · up to ${options.maxDays} days back · ` +
      `${options.types.length} request(s) per day · stopping after ${options.stopAfter} empty days`
  )

  const { projects, days, requests, oldestWithItems, failedRuns } = await walk(options)

  const all = [...projects.values()]
  const software = all.filter((project) => project.software)
  const lost = days.reduce((sum, day) => sum + day.lost, 0)
  const walked = days.length

  // How much of this the pipeline has never seen is the number that decides
  // whether rewiring the ingest is worth it.
  //
  // P0 is excluded from that judgement by its own numbering: a plan is keyed by
  // a plan number ("P69100026970"), not by the project number its tender later
  // carries, so a plan can never match a draft and every one would be counted
  // as new. Walk B0/D0 for the figure that means something.
  const plans = software.filter((project) => project.projectNo.startsWith("P")).length
  await connectDB()
  const known = new Set(
    await TorDraft.find(
      { announcementNo: { $in: software.map((project) => project.projectNo) } },
      { announcementNo: 1 }
    ).distinct("announcementNo")
  )
  await disconnectDB()
  const fresh = software.filter((project) => !known.has(project.projectNo))

  console.log(`
[walk] ${walked} days walked, ${requests} request(s)
[walk] oldest day the feed answered with items: ${oldestWithItems ?? "none"}
[walk] ${all.length} unique projects, ${software.length} pass the software filter
[walk] ${fresh.length} of those ${software.length} are not in TorDraft yet
[walk] ${failedRuns} day(s) the feed refused and were backed off, not counted as empty
[walk] ${lost} announcement(s) still lost to the 20-item cap on busy days${
    plans
      ? `\n[walk] note: ${plans} of them are P0 plans, keyed by plan number — they cannot match a draft, so they inflate the line above`
      : ""
  }`)

  if (options.out) {
    const payload = {
      generatedAt: new Date().toISOString(),
      deptId: env.egpDeptId,
      types: options.types,
      oldestWithItems,
      requests,
      lostToCap: lost,
      days,
      projects: all.map(({ typeSet: _typeSet, ...project }) => project),
    }
    writeFileSync(options.out, JSON.stringify(payload, null, 2), "utf8")
    console.log(`[walk] wrote ${options.out}`)
  }
}

main().catch(async (error) => {
  console.error("[walk] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})

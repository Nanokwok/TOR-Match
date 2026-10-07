import { createHash } from "node:crypto"

import { env } from "@/config/env"
import type { CompanyDoc } from "@/models/Company.model"
import { Company } from "@/models/Company.model"
import { Notification } from "@/models/Notification.model"
import { NotificationSettings } from "@/models/NotificationSettings.model"
import { BIDDABLE_STATUSES } from "@/models/tor-fields.schema"
import { Tor, type TorDoc } from "@/models/Tor.model"
import { User } from "@/models/User.model"
import { WorkspaceCard } from "@/models/WorkspaceCard.model"
import { currentSender, sendEmail } from "@/services/email.service"
import { matchCompanyToTor, requirementIdentity } from "@/services/qualification.service"

/** A TOR budgeted above this (baht) raises a "high-budget" alert. */
export const HIGH_BUDGET_THRESHOLD_BAHT = 10_000_000

type Requirements = Parameters<typeof matchCompanyToTor>[1]["qualificationRequirements"]

/** The ids of NotificationSettings.events that this service raises. */
export type NotificationEvent =
  | "new-high-match"
  | "high-budget"
  | "deal-breaker"
  | "deadline-7-day"
  | "deadline-3-day"
  | "deadline-24-hour"

/**
 * What an event does for someone with no saved preference for it. Mirrors the
 * defaults the settings screen shows (DEFAULT_NOTIFICATION_SETTINGS on the
 * frontend): everything on except the 7-day deadline email, which is a nudge
 * rather than something time-critical.
 */
const DEFAULT_EVENT_PREFERENCE: Record<NotificationEvent, { inApp: boolean; email: boolean }> = {
  "new-high-match": { inApp: true, email: true },
  "high-budget": { inApp: true, email: true },
  "deal-breaker": { inApp: true, email: true },
  "deadline-7-day": { inApp: true, email: false },
  "deadline-3-day": { inApp: true, email: true },
  "deadline-24-hour": { inApp: true, email: true },
}

type PreferenceSource = {
  inAppEnabled?: boolean
  emailEnabled?: boolean
  emailRecipient?: string
  instantEmailAlerts?: boolean
  events?: Partial<Record<NotificationEvent, { inApp?: boolean; email?: boolean }>>
} | null

/** Pure: which of the currently-eligible ids (TOR ids, or owner/user ids) have no existing "match" notification yet. */
export function selectNewMatches(eligibleIds: string[], alreadyNotifiedIds: string[]): string[] {
  const notified = new Set(alreadyNotifiedIds)
  return eligibleIds.filter((id) => !notified.has(id))
}

/**
 * Pure: whether a user's saved preferences allow an in-app alert for this
 * event. A user who never opened the settings screen has no document, and the
 * schema defaults every switch to on, so that case allows it.
 */
export function allowsInApp(settings: PreferenceSource, event: NotificationEvent): boolean {
  if (!settings) return true
  if (settings.inAppEnabled === false) return false
  return (settings.events?.[event]?.inApp ?? DEFAULT_EVENT_PREFERENCE[event].inApp) !== false
}

/**
 * Pure: whether to email this event right now. Like in-app alerts it is on
 * by default — a user who never opened the settings screen is emailed, and
 * turns it off there (the screen shows the same defaults). The instant switch
 * gates it because digests (which would carry the rest) are not sent yet.
 */
export function allowsEmail(settings: PreferenceSource, event: NotificationEvent): boolean {
  if (settings?.emailEnabled === false || settings?.instantEmailAlerts === false) return false
  return (settings?.events?.[event]?.email ?? DEFAULT_EVENT_PREFERENCE[event].email) !== false
}

/** An earlier build of the settings screen saved this sample address as if it were real. */
const PLACEHOLDER_RECIPIENT = "user@company.com"

/** Pure: the saved alert address, falling back to the account's own email. */
export function emailRecipient(settings: PreferenceSource, accountEmail?: string): string {
  const saved = settings?.emailRecipient?.trim()
  return (saved && saved !== PLACEHOLDER_RECIPIENT ? saved : "") || accountEmail?.trim() || ""
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Pure: the bilingual email for one notification. Titles come from scraped text, so the HTML is escaped. */
export function renderEmail(
  notification: { title: { en: string; th: string }; description: { en: string; th: string }; link?: string },
  appUrl: string
) {
  const url = notification.link ? `${appUrl.replace(/\/$/, "")}${notification.link}` : appUrl
  const { title, description } = notification
  return {
    subject: `${title.th} / ${title.en}`,
    text: `${title.th}\n${description.th}\n\n${title.en}\n${description.en}\n\n${url}\n`,
    html:
      `<p><strong>${escapeHtml(title.th)}</strong><br>${escapeHtml(description.th)}</p>` +
      `<p><strong>${escapeHtml(title.en)}</strong><br>${escapeHtml(description.en)}</p>` +
      `<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`,
  }
}

export function isHighBudget(tor: { budgetBaht: number }): boolean {
  return tor.budgetBaht > HIGH_BUDGET_THRESHOLD_BAHT
}

/**
 * Pure: the company met every requirement the TOR used to have as far as the
 * profile can tell, and a requirement in the new version it now fails. A TOR
 * with nothing to compare against (first publication) is never a "change".
 */
export function becameDealBreaker(
  company: Parameters<typeof matchCompanyToTor>[0],
  before: Requirements | null,
  after: Requirements
): boolean {
  if (!before) return false
  const failedBefore = matchCompanyToTor(company, { qualificationRequirements: before }).status === "failed"
  if (failedBefore) return false
  return matchCompanyToTor(company, { qualificationRequirements: after }).status === "failed"
}

/** Pure: a stable id for one version of a TOR's requirements, so the same change alerts once. */
export function requirementsVersion(requirements: Requirements): string {
  const fingerprints = requirements.map((row) => requirementIdentity(row).fingerprint).sort()
  return createHash("sha1").update(fingerprints.join("|")).digest("hex").slice(0, 12)
}

export type NewNotification = {
  userId: unknown
  dedupeKey: string
  title: { en: string; th: string }
  description: { en: string; th: string }
  link?: string
  [field: string]: unknown
}

/**
 * Stores each notification the recipient's preferences want (bell and/or
 * email), skipping any whose dedupeKey was written before, then sends the
 * emails. A record is kept for email-only recipients too (hidden from the
 * bell), because it is what stops the next ingest run emailing them again.
 */
export async function deliver(event: NotificationEvent, notifications: NewNotification[]): Promise<void> {
  if (!notifications.length) return

  const userIds = [...new Set(notifications.map((n) => String(n.userId)))]
  const [settingsDocs, users, seenKeys] = await Promise.all([
    NotificationSettings.find({ userId: { $in: userIds } }).lean(),
    User.find({ _id: { $in: userIds } }).select("email").lean(),
    Notification.find({ dedupeKey: { $in: notifications.map((n) => n.dedupeKey) } }).distinct("dedupeKey"),
  ])
  const settingsByUser = new Map(settingsDocs.map((doc) => [String(doc.userId), doc as unknown as PreferenceSource]))
  const emailByUser = new Map(users.map((user) => [String(user._id), user.email]))
  const seen = new Set(seenKeys)

  const plans = notifications
    .filter((n) => !seen.has(n.dedupeKey))
    .map((n) => {
      const settings = settingsByUser.get(String(n.userId)) ?? null
      const to = allowsEmail(settings, event) ? emailRecipient(settings, emailByUser.get(String(n.userId))) : ""
      return { notification: n, inApp: allowsInApp(settings, event), to }
    })
    .filter((plan) => plan.inApp || plan.to)
  if (!plans.length) return

  const inserted = await Notification.insertMany(
    plans.map((plan) => ({ ...plan.notification, inApp: plan.inApp }))
  )

  const sender = plans.some((plan) => plan.to) ? await currentSender() : undefined
  await Promise.allSettled(
    plans.map(async (plan, index) => {
      if (!plan.to) return
      const sent = await sendEmail({ to: plan.to, ...renderEmail(plan.notification, env.appUrl) }, sender)
      if (sent) await Notification.updateOne({ _id: inserted[index]._id }, { $set: { emailedAt: new Date() } })
    })
  ).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") console.error("[email] notification email failed", result.reason)
    }
  })
}

export const torName = (tor: TorDoc, locale: "en" | "th") =>
  locale === "en" ? tor.title.en || tor.title.th : tor.title.th || tor.title.en

function buildMatchNotification(userId: unknown, tor: TorDoc) {
  return {
    userId,
    category: "match" as const,
    torId: tor._id,
    dedupeKey: `match:${userId}:${tor._id}`,
    autoVerifiedMatch: true,
    link: `/browse?tor=${tor._id}`,
    action: "view-tor" as const,
    title: {
      en: `You now qualify for ${torName(tor, "en")}`,
      th: `คุณมีคุณสมบัติสำหรับ ${torName(tor, "th")} แล้ว`,
    },
    description: {
      en: "Your saved company profile now meets every automated eligibility criterion for this TOR.",
      th: "โปรไฟล์บริษัทที่บันทึกไว้ผ่านคุณสมบัติอัตโนมัติทุกข้อสำหรับ TOR นี้แล้ว",
    },
  }
}

function buildHighBudgetNotification(userId: unknown, tor: TorDoc) {
  const millions = (tor.budgetBaht / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })
  return {
    userId,
    category: "high-budget" as const,
    torId: tor._id,
    dedupeKey: `high-budget:${userId}:${tor._id}`,
    link: `/browse?tor=${tor._id}`,
    action: "view-tor" as const,
    title: {
      en: `High-budget TOR: ${torName(tor, "en")}`,
      th: `TOR งบประมาณสูง: ${torName(tor, "th")}`,
    },
    description: {
      en: `Budget of ฿${millions}M, above the ฿${HIGH_BUDGET_THRESHOLD_BAHT / 1_000_000}M alert line.`,
      th: `งบประมาณ ${millions} ล้านบาท สูงกว่าเกณฑ์แจ้งเตือน ${HIGH_BUDGET_THRESHOLD_BAHT / 1_000_000} ล้านบาท`,
    },
  }
}

function buildDealBreakerNotification(userId: unknown, tor: TorDoc, version: string) {
  return {
    userId,
    category: "deal-breaker" as const,
    torId: tor._id,
    dedupeKey: `deal-breaker:${userId}:${tor._id}:${version}`,
    link: `/browse?tor=${tor._id}`,
    action: "view-tor" as const,
    title: {
      en: `Requirements changed: ${torName(tor, "en")}`,
      th: `เงื่อนไขเปลี่ยน: ${torName(tor, "th")}`,
    },
    description: {
      en: "A TOR you are tracking changed its criteria, and your company no longer meets one of them.",
      th: "TOR ที่คุณติดตามเปลี่ยนเงื่อนไข และบริษัทของคุณไม่ผ่านเงื่อนไขข้อใดข้อหนึ่งแล้ว",
    },
  }
}

/**
 * Checks the company's saved profile against every open TOR and creates a
 * "match" notification for any TOR the company is newly eligible for. Does
 * not re-notify for a TOR the user was already notified about, and never
 * removes a notification if the company later stops matching (a match alert
 * is a historical fact, not a live status).
 */
export async function notifyNewMatches(userId: string, company: CompanyDoc): Promise<void> {
  const tors = await Tor.find({ status: { $in: BIDDABLE_STATUSES } })
  if (!tors.length) return

  const eligibleTors = tors.filter((tor: TorDoc) => matchCompanyToTor(company, tor).eligible)
  if (!eligibleTors.length) return

  const alreadyNotified = await Notification.find({
    userId,
    category: "match",
    torId: { $in: eligibleTors.map((tor) => tor._id) },
  }).distinct("torId")
  const newMatchIds = new Set(
    selectNewMatches(
      eligibleTors.map((tor) => String(tor._id)),
      alreadyNotified.map(String)
    )
  )
  const newMatches = eligibleTors.filter((tor) => newMatchIds.has(String(tor._id)))
  if (!newMatches.length) return

  await deliver(
    "new-high-match",
    newMatches.map((tor) => buildMatchNotification(userId, tor))
  )
}

/**
 * Checks every saved company against one TOR and creates a "match"
 * notification for any company newly eligible for it.
 */
export async function notifyCompaniesForTor(tor: TorDoc): Promise<void> {
  // A cancelled project, or one that already has a winner, is not something a
  // company can act on — telling them they now qualify for it would be noise.
  if (!BIDDABLE_STATUSES.includes(tor.status as (typeof BIDDABLE_STATUSES)[number])) return

  const companies = await Company.find()
  if (!companies.length) return

  const eligibleCompanies = companies.filter((company) => matchCompanyToTor(company, tor).eligible)
  if (!eligibleCompanies.length) return

  const alreadyNotified = await Notification.find({
    category: "match",
    torId: tor._id,
    userId: { $in: eligibleCompanies.map((company) => company.ownerId) },
  }).distinct("userId")
  const newMatchOwnerIds = new Set(
    selectNewMatches(
      eligibleCompanies.map((company) => String(company.ownerId)),
      alreadyNotified.map(String)
    )
  )
  const newMatches = eligibleCompanies.filter((company) => newMatchOwnerIds.has(String(company.ownerId)))
  if (!newMatches.length) return

  await deliver(
    "new-high-match",
    newMatches.map((company) => buildMatchNotification(company.ownerId, tor))
  )
}

/**
 * Alerts companies to a TOR over the high-budget line. Companies whose profile
 * already fails a requirement are skipped: a big budget they cannot bid for is
 * noise, not an opportunity.
 */
export async function notifyHighBudget(tor: TorDoc): Promise<void> {
  if (!BIDDABLE_STATUSES.includes(tor.status as (typeof BIDDABLE_STATUSES)[number])) return
  if (!isHighBudget(tor)) return

  const companies = (await Company.find()).filter(
    (company) => matchCompanyToTor(company, tor).status !== "failed"
  )
  await deliver(
    "high-budget",
    companies.map((company) => buildHighBudgetNotification(company.ownerId, tor))
  )
}

/**
 * Warns the users tracking a TOR (it sits on their workspace board) when its
 * requirements changed in a way their company now fails. Alerts once per
 * version of the requirements, so re-ingesting an unchanged announcement is
 * silent.
 */
export async function notifyDealBreakers(tor: TorDoc, before: Requirements | null): Promise<void> {
  if (!before) return

  const trackers = await WorkspaceCard.find({ torId: tor._id }).distinct("ownerId")
  if (!trackers.length) return

  const companies = (await Company.find({ ownerId: { $in: trackers } })).filter((company) =>
    becameDealBreaker(company, before, tor.qualificationRequirements)
  )
  const version = requirementsVersion(tor.qualificationRequirements)
  await deliver(
    "deal-breaker",
    companies.map((company) => buildDealBreakerNotification(company.ownerId, tor, version))
  )
}

/**
 * Every alert a freshly published TOR can raise. `before` is the requirement
 * list the live TOR had prior to this publish (null for a brand-new TOR). One
 * failing alert must not stop the others, nor fail the publish.
 */
export async function notifyTorPublished(tor: TorDoc, before: Requirements | null): Promise<void> {
  const results = await Promise.allSettled([
    notifyCompaniesForTor(tor),
    notifyHighBudget(tor),
    notifyDealBreakers(tor, before),
  ])
  for (const result of results) {
    if (result.status === "rejected") console.error("TOR notification failed", result.reason)
  }
}

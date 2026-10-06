import { createHash } from "node:crypto"

import type { CompanyDoc } from "@/models/Company.model"
import { Company } from "@/models/Company.model"
import { Notification } from "@/models/Notification.model"
import { NotificationSettings } from "@/models/NotificationSettings.model"
import { Tor, type TorDoc } from "@/models/Tor.model"
import { WorkspaceCard } from "@/models/WorkspaceCard.model"
import { matchCompanyToTor, requirementIdentity } from "@/services/qualification.service"

/** A TOR budgeted above this (baht) raises a "high-budget" alert. */
export const HIGH_BUDGET_THRESHOLD_BAHT = 10_000_000

type Requirements = Parameters<typeof matchCompanyToTor>[1]["qualificationRequirements"]

/** The ids of NotificationSettings.events that this service raises. */
export type NotificationEvent = "new-high-match" | "high-budget" | "deal-breaker"

type PreferenceSource = {
  inAppEnabled?: boolean
  events?: Partial<Record<NotificationEvent, { inApp?: boolean }>>
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
  return settings.events?.[event]?.inApp !== false
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

async function usersAllowing(userIds: unknown[], event: NotificationEvent): Promise<Set<string>> {
  if (!userIds.length) return new Set()
  const saved = await NotificationSettings.find({ userId: { $in: userIds } }).lean()
  const byUser = new Map(saved.map((doc) => [String(doc.userId), doc as unknown as PreferenceSource]))
  return new Set(
    userIds.map(String).filter((id) => allowsInApp(byUser.get(id) ?? null, event))
  )
}

type NewNotification = {
  userId: unknown
  dedupeKey: string
  [field: string]: unknown
}

/** Inserts only the notifications whose dedupeKey has not been written before. */
async function insertUnseen(notifications: NewNotification[]): Promise<void> {
  if (!notifications.length) return
  const seen = new Set(
    await Notification.find({ dedupeKey: { $in: notifications.map((n) => n.dedupeKey) } }).distinct("dedupeKey")
  )
  const fresh = notifications.filter((n) => !seen.has(n.dedupeKey))
  if (fresh.length) await Notification.insertMany(fresh)
}

const torName = (tor: TorDoc, locale: "en" | "th") =>
  locale === "en" ? tor.title.en || tor.title.th : tor.title.th || tor.title.en

function buildMatchNotification(userId: unknown, tor: TorDoc) {
  return {
    userId,
    category: "match" as const,
    torId: tor._id,
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
  if (!(await usersAllowing([userId], "new-high-match")).has(userId)) return

  const tors = await Tor.find({ status: { $in: ["open", "closing-soon"] } })
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

  await Notification.insertMany(newMatches.map((tor) => buildMatchNotification(userId, tor)))
}

/**
 * Checks every saved company against one TOR and creates a "match"
 * notification for any company newly eligible for it.
 */
export async function notifyCompaniesForTor(tor: TorDoc): Promise<void> {
  if (!["open", "closing-soon"].includes(tor.status)) return

  const companies = await Company.find()
  if (!companies.length) return

  const eligibleCompanies = companies.filter((company) => matchCompanyToTor(company, tor).eligible)
  if (!eligibleCompanies.length) return

  const allowed = await usersAllowing(
    eligibleCompanies.map((company) => company.ownerId),
    "new-high-match"
  )
  const wanting = eligibleCompanies.filter((company) => allowed.has(String(company.ownerId)))
  if (!wanting.length) return

  const alreadyNotified = await Notification.find({
    category: "match",
    torId: tor._id,
    userId: { $in: wanting.map((company) => company.ownerId) },
  }).distinct("userId")
  const newMatchOwnerIds = new Set(
    selectNewMatches(
      wanting.map((company) => String(company.ownerId)),
      alreadyNotified.map(String)
    )
  )
  const newMatches = wanting.filter((company) => newMatchOwnerIds.has(String(company.ownerId)))
  if (!newMatches.length) return

  await Notification.insertMany(
    newMatches.map((company) => buildMatchNotification(company.ownerId, tor))
  )
}

/**
 * Alerts companies to a TOR over the high-budget line. Companies whose profile
 * already fails a requirement are skipped: a big budget they cannot bid for is
 * noise, not an opportunity.
 */
export async function notifyHighBudget(tor: TorDoc): Promise<void> {
  if (!["open", "closing-soon"].includes(tor.status)) return
  if (!isHighBudget(tor)) return

  const companies = (await Company.find()).filter(
    (company) => matchCompanyToTor(company, tor).status !== "failed"
  )
  const allowed = await usersAllowing(
    companies.map((company) => company.ownerId),
    "high-budget"
  )
  await insertUnseen(
    companies
      .filter((company) => allowed.has(String(company.ownerId)))
      .map((company) => buildHighBudgetNotification(company.ownerId, tor))
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
  const allowed = await usersAllowing(
    companies.map((company) => company.ownerId),
    "deal-breaker"
  )
  const version = requirementsVersion(tor.qualificationRequirements)
  await insertUnseen(
    companies
      .filter((company) => allowed.has(String(company.ownerId)))
      .map((company) => buildDealBreakerNotification(company.ownerId, tor, version))
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

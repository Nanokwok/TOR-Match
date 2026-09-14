import type { CompanyDoc } from "@/models/Company.model"
import { Company } from "@/models/Company.model"
import { Notification } from "@/models/Notification.model"
import { Tor, type TorDoc } from "@/models/Tor.model"
import { matchCompanyToTor } from "@/services/qualification.service"

/** Pure: which of the currently-eligible ids (TOR ids, or owner/user ids) have no existing "match" notification yet. */
export function selectNewMatches(eligibleIds: string[], alreadyNotifiedIds: string[]): string[] {
  const notified = new Set(alreadyNotifiedIds)
  return eligibleIds.filter((id) => !notified.has(id))
}

function buildMatchNotification(userId: unknown, tor: TorDoc) {
  return {
    userId,
    category: "match" as const,
    torId: tor._id,
    autoVerifiedMatch: true,
    link: "/browse",
    action: "view-tor" as const,
    title: {
      en: `You now qualify for ${tor.title.en}`,
      th: `คุณมีคุณสมบัติสำหรับ ${tor.title.th} แล้ว`,
    },
    description: {
      en: "Your saved company profile now meets every automated eligibility criterion for this TOR.",
      th: "โปรไฟล์บริษัทที่บันทึกไว้ผ่านคุณสมบัติอัตโนมัติทุกข้อสำหรับ TOR นี้แล้ว",
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
 * notification for any company newly eligible for it. Call this right after
 * a TOR is published (see publishTorDraft in tor-draft.controller.ts) — that
 * is the real point a TOR becomes visible to users, not the seed script.
 */
export async function notifyCompaniesForTor(tor: TorDoc): Promise<void> {
  if (!["open", "closing-soon"].includes(tor.status)) return

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

  await Notification.insertMany(
    newMatches.map((company) => buildMatchNotification(company.ownerId, tor))
  )
}

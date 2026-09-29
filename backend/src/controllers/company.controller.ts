import type { Request, Response } from "express"
import { Company } from "@/models/Company.model"
import { notifyNewMatches } from "@/services/match-notification.service"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

/** Profile fields users may write via /companies/me — never status or ownership. */
const UPSERT_FIELDS = [
  "companyNameThai",
  "companyNameEnglish",
  "taxId",
  "companySize",
  "contactEmail",
  "phone",
  "registeredCapitalThb",
  "egpStatus",
  "notBlacklisted",
  "certifications",
  "pastProjects",
  "techStack",
  "specializations",
] as const

function pickUpsertFields(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  for (const key of UPSERT_FIELDS) {
    if (key in body) patch[key] = body[key]
  }
  return patch
}

export const getMyCompany = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const company = await Company.findOne({ ownerId: req.user.sub })
  res.status(200).json(company)
})

export const upsertMyCompany = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()

  const body = typeof req.body === "object" && req.body !== null ? req.body : {}
  const patch = pickUpsertFields(body as Record<string, unknown>)

  const company = await Company.findOneAndUpdate(
    { ownerId: req.user.sub },
    {
      $set: { ...patch, ownerId: req.user.sub },
      $setOnInsert: { status: "pending" },
    },
    { new: true, upsert: true, runValidators: true }
  )

  // Awaited so the response only returns once any new-match notifications
  // exist — otherwise a client that refetches right after saving can race
  // ahead of this and see a stale (pre-notification) list. A notification
  // bug must still never fail the profile save itself, hence the catch.
  await notifyNewMatches(req.user.sub, company).catch((error) => {
    console.error("notifyNewMatches failed", error)
  })

  res.status(200).json(company)
})

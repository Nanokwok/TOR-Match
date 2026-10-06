import type { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import { z } from "zod"

import { Company } from "@/models/Company.model"
import { QualificationSelfCheck } from "@/models/QualificationSelfCheck.model"
import { Tor } from "@/models/Tor.model"
import { requirementIdentity } from "@/services/qualification.service"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

/**
 * The bidder's own answers to the requirements their profile cannot cover.
 *
 * Saved wholesale rather than per row: the panel edits a draft and saves once,
 * the same shape the notification settings screen uses, so a half-saved set can
 * never be read back.
 */

const saveSchema = z.object({
  entries: z.array(
    z.object({
      requirementId: z.string().min(1),
      answer: z.boolean(),
      note: z.string().max(2000).optional(),
    })
  ),
})

/** The caller's company, which is what an answer belongs to. */
async function requireCompany(req: Request) {
  if (!req.user) throw ApiError.unauthorized()
  const company = await Company.findOne({ ownerId: req.user.sub })
  if (!company) throw ApiError.badRequest("Set up your company profile first")
  return company
}

async function requireTor(id: string) {
  if (!isValidObjectId(id)) throw ApiError.notFound("TOR not found")
  const tor = await Tor.findById(id)
  if (!tor) throw ApiError.notFound("TOR not found")
  return tor
}

export const getSelfCheck = asyncHandler(async (req: Request, res: Response) => {
  const company = await requireCompany(req)
  const tor = await requireTor(req.params.id)
  const stored = await QualificationSelfCheck.findOne({ companyId: company._id, torId: tor._id })
  res.status(200).json({ entries: stored?.entries ?? [] })
})

export const saveSelfCheck = asyncHandler(async (req: Request, res: Response) => {
  const company = await requireCompany(req)
  const tor = await requireTor(req.params.id)

  const parsed = saveSchema.safeParse(req.body)
  if (!parsed.success) throw ApiError.badRequest("Invalid self-check payload")

  // Fingerprints are computed here, never accepted from the client: they are
  // what decides whether an answer still applies, so a stale or crafted client
  // must not be able to assert that an old answer covers a changed requirement.
  const requirements = new Map(
    tor.qualificationRequirements.map((row) => [row.id, requirementIdentity(row)])
  )

  const answeredAt = new Date()
  const entries = parsed.data.entries.map((entry) => {
    const requirement = requirements.get(entry.requirementId)
    // Rejecting rather than dropping: a client sending an unknown id is working
    // from a TOR that has since changed, and silently keeping the rest would
    // save a set the bidder never saw.
    if (!requirement) throw ApiError.badRequest(`Unknown requirement: ${entry.requirementId}`)
    return {
      requirementId: entry.requirementId,
      key: requirement.key,
      answer: entry.answer,
      criteriaFingerprint: requirement.fingerprint,
      note: entry.note ?? "",
      answeredAt,
    }
  })

  const saved = await QualificationSelfCheck.findOneAndUpdate(
    { companyId: company._id, torId: tor._id },
    { $set: { entries } },
    { new: true, upsert: true, runValidators: true }
  )

  res.status(200).json({ entries: saved?.entries ?? [] })
})

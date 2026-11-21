import type { Request, Response } from "express"
import mongoose from "mongoose"
import { z } from "zod"
import { Tor } from "@/models/Tor.model"
import { WorkspaceCard } from "@/models/WorkspaceCard.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

const COLUMNS = ["bookmark", "todo", "in-progress", "done"] as const
const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const

const objectIdString = z.string().regex(/^[a-f\d]{24}$/i, "Not a valid id")

const addCardSchema = z.object({
  torId: objectIdString,
  column: z.enum(COLUMNS).optional(),
  priority: z.enum(PRIORITIES).optional(),
})

// Unknown keys are dropped (`id` on a checklist item, for one): only these reach the database.
const updateCardSchema = z.object({
  priority: z.enum(PRIORITIES).optional(),
  column: z.enum(COLUMNS).optional(),
  assigneeIds: z.array(objectIdString).max(50).optional(),
  checklist: z
    .array(z.object({ label: z.string().max(500), completed: z.boolean().optional() }))
    .max(100)
    .optional(),
})

export const getBoard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const cards = await WorkspaceCard.find({ ownerId: req.user.sub }).populate("torId")

  const orphanedCardIds: mongoose.Types.ObjectId[] = []
  const columns: Record<string, unknown[]> = { bookmark: [], todo: [], "in-progress": [], done: [] }
  for (const card of cards) {
    if (!card.torId) {
      orphanedCardIds.push(card._id as mongoose.Types.ObjectId)
      continue
    }
    columns[card.column]?.push(card)
  }

  if (orphanedCardIds.length > 0) {
    await WorkspaceCard.deleteMany({ _id: { $in: orphanedCardIds } })
  }

  const validTotal = cards.length - orphanedCardIds.length
  res.status(200).json({ columns, total: validTotal })
})

export const addCard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const parsed = addCardSchema.safeParse(req.body)
  if (!parsed.success) throw ApiError.badRequest("Invalid card", parsed.error.flatten())
  const { torId, column = "bookmark", priority = "MEDIUM" } = parsed.data

  const torExists = await Tor.exists({ _id: torId })
  if (!torExists) {
    throw ApiError.notFound("TOR not found")
  }

  const card = await WorkspaceCard.findOneAndUpdate(
    { ownerId: req.user.sub, torId },
    { $setOnInsert: { ownerId: req.user.sub, torId, column, priority } },
    { new: true, upsert: true }
  )
  res.status(201).json(card)
})

export const moveCard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const { column } = req.body ?? {}
  if (!COLUMNS.includes(column)) throw ApiError.badRequest("Invalid column")
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ApiError.badRequest("Invalid card id")
  }

  const card = await WorkspaceCard.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.sub },
    { $set: { column } },
    { new: true }
  )
  if (!card) throw ApiError.notFound("Card not found")
  res.status(200).json(card)
})

export const removeCard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const { id } = req.params
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid card id")
  }
  const result = await WorkspaceCard.findOneAndDelete({ _id: id, ownerId: req.user.sub })
  if (!result) throw ApiError.notFound("Card not found")
  res.status(204).send()
})

export const removeCardByTorId = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const { torId } = req.params
  if (!torId || torId === "null" || torId === "undefined" || !mongoose.Types.ObjectId.isValid(torId)) {
    throw ApiError.badRequest("Valid torId is required")
  }

  const result = await WorkspaceCard.findOneAndDelete({
    ownerId: req.user.sub,
    torId,
  })
  if (!result) throw ApiError.notFound("Card not found")
  res.status(204).send()
})

export const updateCard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const { id } = req.params
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid card id")
  }

  const parsed = updateCardSchema.safeParse(req.body)
  if (!parsed.success) throw ApiError.badRequest("Invalid card update", parsed.error.flatten())
  const { priority, column, assigneeIds, checklist } = parsed.data
  const update: Record<string, unknown> = {}
  if (priority !== undefined) update.priority = priority
  if (column !== undefined) update.column = column
  if (assigneeIds !== undefined) update.assigneeIds = assigneeIds
  if (checklist !== undefined) update.checklist = checklist

  const card = await WorkspaceCard.findOneAndUpdate(
    { _id: id, ownerId: req.user.sub },
    { $set: update },
    { new: true }
  ).populate("torId")
  if (!card) throw ApiError.notFound("Card not found")
  res.status(200).json(card)
})

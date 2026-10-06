import type { Request, Response } from "express"
import mongoose from "mongoose"
import { Tor } from "@/models/Tor.model"
import { WorkspaceCard } from "@/models/WorkspaceCard.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

const COLUMNS = ["bookmark", "todo", "in-progress", "done"] as const

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
  const { torId, column = "bookmark", priority = "MEDIUM" } = req.body ?? {}
  if (!torId) throw ApiError.badRequest("torId is required")
  if (!mongoose.Types.ObjectId.isValid(torId)) {
    throw ApiError.badRequest("Invalid torId format")
  }

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

  const { priority, column, assigneeIds, checklist } = req.body ?? {}
  const update: Record<string, unknown> = {}
  if (priority !== undefined) update.priority = priority
  if (column !== undefined && COLUMNS.includes(column)) update.column = column
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

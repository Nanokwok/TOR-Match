import type { Request, Response } from "express"
import { WorkspaceCard } from "@/models/WorkspaceCard.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

const COLUMNS = ["bookmark", "todo", "in-progress", "done"] as const

export const getBoard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const cards = await WorkspaceCard.find({ ownerId: req.user.sub }).populate("torId")

  const columns: Record<string, unknown[]> = { bookmark: [], todo: [], "in-progress": [], done: [] }
  for (const card of cards) {
    columns[card.column]?.push(card)
  }

  res.status(200).json({ columns, total: cards.length })
})

export const addCard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const { torId, column = "bookmark", priority = "MEDIUM" } = req.body ?? {}
  if (!torId) throw ApiError.badRequest("torId is required")

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
  const result = await WorkspaceCard.findOneAndDelete({ _id: req.params.id, ownerId: req.user.sub })
  if (!result) throw ApiError.notFound("Card not found")
  res.status(204).send()
})

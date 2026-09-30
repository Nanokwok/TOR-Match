import type { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
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

export const removeCardByTorId = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const { torId } = req.params
  if (!torId) throw ApiError.badRequest("torId is required")

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
  const { priority, assigneeIds, checklist } = req.body ?? {}

  const update: Record<string, unknown> = {}
  if (priority !== undefined) {
    if (!["HIGH", "MEDIUM", "LOW"].includes(priority)) {
      throw ApiError.badRequest("Invalid priority")
    }
    update.priority = priority
  }
  if (assigneeIds !== undefined) {
    if (!Array.isArray(assigneeIds)) {
      throw ApiError.badRequest("assigneeIds must be an array")
    }
    update.assigneeIds = assigneeIds.map(String)
  }
  if (checklist !== undefined) {
    if (!Array.isArray(checklist)) {
      throw ApiError.badRequest("checklist must be an array")
    }
    update.checklist = checklist.map(
      (item: { id?: string; label?: string; completed?: boolean }) => ({
        id: item.id ? String(item.id) : undefined,
        label: String(item.label ?? ""),
        completed: Boolean(item.completed),
      })
    )
  }

  const isObjectId = isValidObjectId(id)
  const filter = isObjectId
    ? { ownerId: req.user.sub, $or: [{ _id: id }, { torId: id }] }
    : { ownerId: req.user.sub, torId: id }

  const card = await WorkspaceCard.findOneAndUpdate(
    filter,
    { $set: update },
    { new: true }
  ).populate("torId")

  if (!card) throw ApiError.notFound("Card not found")
  res.status(200).json(card)
})

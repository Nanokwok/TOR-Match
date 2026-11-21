import type { NextFunction, Request, Response } from "express"
import mongoose from "mongoose"
import { ApiError } from "@/utils/ApiError"
import { isProduction } from "@/config/env"

export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, details: err.details })
    return
  }

  // A value of the wrong type for a field (an object where a string belongs) is the
  // caller's mistake, not ours: answer 400 without naming the field or the schema.
  if (err instanceof mongoose.Error.CastError || err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: "Invalid input" })
    return
  }

  console.error("[error]", err)
  res.status(500).json({
    error: "Internal server error",
    ...(isProduction ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  })
}

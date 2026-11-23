import type { NextFunction, Request, Response } from "express"
import mongoose from "mongoose"
import { ApiError } from "@/utils/ApiError"
import { isProduction } from "@/config/env"
import { logSecurityEvent } from "@/utils/security-logger"

export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
}

/**
 * Builds the error handler. `production` is a parameter so a test can see both
 * behaviours; the app uses {@link errorMiddleware}, built from the environment.
 */
export function createErrorMiddleware(production: boolean) {
  return function handleError(err: unknown, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ApiError) {
      if (err.status === 401 || err.status === 403) {
        logSecurityEvent({
          event: "ACCESS_DENIED",
          req,
          reason: `${err.status} - ${err.message}`,
        })
      }
      // A 400's details are the validator's field-by-field report: useful to a
      // developer, and in production a description of the schema for a stranger.
      // Other statuses carry details meant for the caller (a 429 says when to retry).
      const details = production && err.status === 400 ? undefined : err.details
      res.status(err.status).json({ error: err.message, details })
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
      ...(production ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    })
  }
}

export const errorMiddleware = createErrorMiddleware(isProduction)

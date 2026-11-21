import type { NextFunction, Request, Response } from "express"

import { ApiError } from "@/utils/ApiError"

/** Deeper than any real payload; stops a crafted body from being walked forever. */
const MAX_DEPTH = 20

/**
 * The first key that could be read as a MongoDB operator or a path, or null.
 *
 * `$gt`, `$ne`, `$where` and the like are operators when they are keys of an
 * object that reaches a query; a `.` in a key is a path into a nested document;
 * `__proto__` is the way into prototype pollution. No field this API accepts is
 * named like any of those, so their presence is never innocent.
 */
export function findUnsafeKey(value: unknown, depth = 0): string | null {
  if (value === null || typeof value !== "object") return null
  if (depth > MAX_DEPTH) return "(nested too deeply)"

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUnsafeKey(item, depth + 1)
      if (found) return found
    }
    return null
  }

  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".") || key === "__proto__") return key
    const found = findUnsafeKey(child, depth + 1)
    if (found) return found
  }
  return null
}

/**
 * Refuses a request whose body or query string carries operator-like keys.
 *
 * Rejected rather than stripped: removing `$ne` from `{ status: { $ne: "x" } }`
 * leaves `{ status: {} }`, a different question from the one that was asked, so
 * the caller would be answered as if they had meant it. A 400 says what is wrong.
 *
 * Mounted once, ahead of every route, so a controller that forgets to validate
 * its input still cannot be handed an operator. Controllers keep validating the
 * *shape* of what they accept (types, enums, lengths); this only closes the
 * operator door for all of them at once.
 */
export function rejectMongoOperators(req: Request, _res: Response, next: NextFunction) {
  // Not req.params: when this runs ahead of the routes there are none yet.
  for (const part of [req.body, req.query]) {
    if (findUnsafeKey(part)) {
      return next(ApiError.badRequest("Invalid request: field names may not start with '$' or contain '.'"))
    }
  }
  next()
}

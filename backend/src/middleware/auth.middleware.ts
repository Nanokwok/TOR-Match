import type { NextFunction, Request, Response } from "express"
import { env } from "@/config/env"
import { ApiError } from "@/utils/ApiError"
import { verifyAuthToken, type AuthTokenPayload } from "@/utils/jwt"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[env.authCookieName]
  if (cookieToken) return cookieToken

  const header = req.headers.authorization
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length)

  return null
}

/** Requires a valid auth token; attaches the decoded payload to req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (!token) return next(ApiError.unauthorized("Authentication required"))

  try {
    req.user = verifyAuthToken(token)
    next()
  } catch {
    next(ApiError.unauthorized("Invalid or expired session"))
  }
}

/** Decodes the token if present but does not fail the request when absent/invalid. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (token) {
    try {
      req.user = verifyAuthToken(token)
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next()
}

export function requireRole(...roles: AuthTokenPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized("Authentication required"))
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden())
    next()
  }
}

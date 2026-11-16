import type { NextFunction, Request, Response } from "express"
import { env } from "@/config/env"
import { ApiError } from "@/utils/ApiError"
import { authCookieOptions, signAuthToken, verifyAuthToken, type AuthTokenPayload } from "@/utils/jwt"

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


export function isSessionExpired(
  lastActiveAt: number | undefined,
  maxIdleSeconds = env.userIdleTimeoutSeconds
): boolean {
  if (typeof lastActiveAt !== "number") return false
  return Date.now() - lastActiveAt > maxIdleSeconds * 1000
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (!token) return next(ApiError.unauthorized("Authentication required"))

  try {
    const user = verifyAuthToken(token)
    if (isSessionExpired(user.lastActiveAt)) {
      return next(ApiError.unauthorized("Session expired due to inactivity"))
    }
    req.user = user

    const now = Date.now()
    if (now - (user.lastActiveAt ?? 0) >= 1000) {
      const refreshedToken = signAuthToken({
        ...user,
        lastActiveAt: now,
      })
      res.setHeader("X-Refreshed-Token", refreshedToken)
      if (req.cookies?.[env.authCookieName]) {
        res.cookie(env.authCookieName, refreshedToken, authCookieOptions())
      }
    }

    next()
  } catch {
    next(ApiError.unauthorized("Invalid or expired session"))
  }
}

/** Decodes the token if present but does not fail the request when absent/invalid/expired. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (token) {
    try {
      const user = verifyAuthToken(token)
      if (!isSessionExpired(user.lastActiveAt)) {
        req.user = user
      }
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

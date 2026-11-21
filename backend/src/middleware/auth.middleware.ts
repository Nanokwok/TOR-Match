import type { NextFunction, Request, Response } from "express"
import mongoose from "mongoose"
import { env } from "@/config/env"
import { User } from "@/models/User.model"
import { ApiError } from "@/utils/ApiError"
import { authCookieOptions, signAuthToken, verifyAuthToken, type AuthTokenPayload } from "@/utils/jwt"
import { logSecurityEvent } from "@/utils/security-logger"

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
      logSecurityEvent({ event: "ACCESS_DENIED", req, userId: user.sub, email: user.email, reason: "Session expired due to inactivity" })
      return next(ApiError.unauthorized("Session expired due to inactivity"))
    }

    const completeAuth = (dbUser?: { tokenVersion?: number } | null) => {
      if (!dbUser || (dbUser.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
        logSecurityEvent({ event: "AUTH_SESSION_REVOKED", req, userId: user.sub, email: user.email, reason: "Token version outdated or user removed" })
        return next(ApiError.unauthorized("Session has been revoked"))
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
    }

    if (mongoose.connection.readyState === 1) {
      User.findById(user.sub)
        .select("tokenVersion")
        .then((dbUser) => completeAuth(dbUser))
        .catch((err) => next(err instanceof ApiError ? err : ApiError.unauthorized("Invalid or expired session")))
    } else if (process.env.NODE_ENV === "test") {
      completeAuth({ tokenVersion: user.tokenVersion ?? 0 })
    } else {
      next(ApiError.unauthorized("Invalid or expired session"))
    }
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
        if (mongoose.connection.readyState === 1) {
          User.findById(user.sub)
            .select("tokenVersion")
            .then((dbUser) => {
              if (dbUser && (dbUser.tokenVersion ?? 0) === (user.tokenVersion ?? 0)) {
                req.user = user
              }
              next()
            })
            .catch(() => next())
          return
        } else if (process.env.NODE_ENV === "test") {
          req.user = user
        }
      }
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next()
}

export function requireRole(...roles: AuthTokenPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      logSecurityEvent({ event: "ACCESS_DENIED", req, reason: "Authentication required" })
      return next(ApiError.unauthorized("Authentication required"))
    }
    if (!roles.includes(req.user.role)) {
      logSecurityEvent({
        event: "ROLE_ACCESS_DENIED",
        req,
        userId: req.user.sub,
        email: req.user.email,
        reason: `Forbidden: required roles [${roles.join(", ")}], user has role '${req.user.role}'`,
      })
      return next(ApiError.forbidden())
    }
    next()
  }
}

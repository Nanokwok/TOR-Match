import type { NextFunction, Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import { env } from "@/config/env"
import { isSessionRevoked } from "@/domain/session-revocation"
import { User } from "@/models/User.model"
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


/**
 * Signs out, as far as the rest of the request is concerned, any session that
 * began before the account's last password reset.
 *
 * It looks at both places a token can come from (cookie and Authorization
 * header), removes the stale ones from the request and clears the cookie, so
 * `requireAuth` answers 401 and `optionalAuth` treats the visitor as anonymous.
 * Tokens that do not verify are left for those middlewares to refuse.
 *
 * This is the one place the stateless login token meets the database: one small
 * lookup by id for a request that carries a valid token, none for anonymous ones.
 */
export async function dropRevokedSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const sources = [
      { token: req.cookies?.[env.authCookieName] as string | undefined, remove: () => delete req.cookies[env.authCookieName] },
      {
        token: req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice("Bearer ".length) : undefined,
        remove: () => delete req.headers.authorization,
      },
    ]

    for (const { token, remove } of sources) {
      if (!token) continue
      let session: AuthTokenPayload
      try {
        session = verifyAuthToken(token)
      } catch {
        continue
      }
      if (!isValidObjectId(session.sub)) continue

      const account = await User.findOne({ _id: session.sub }).select("passwordChangedAt").lean()
      if (account && isSessionRevoked(session.issuedAt, account.passwordChangedAt)) {
        remove()
        res.clearCookie(env.authCookieName, { ...authCookieOptions(), maxAge: 0 })
      }
    }
    next()
  } catch (error) {
    next(error)
  }
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

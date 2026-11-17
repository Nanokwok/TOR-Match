import rateLimit, { type Options } from "express-rate-limit"
import { env } from "@/config/env"
import { ApiError } from "@/utils/ApiError"

export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
export const LOGIN_RATE_LIMIT_MAX = 5
export const LOGIN_RATE_LIMIT_MESSAGE =
  "Too many login attempts. Please try again in 15 minutes."

export function createLoginRateLimiter(options?: Partial<Options>) {
  return rateLimit({
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
    limit: LOGIN_RATE_LIMIT_MAX,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    statusCode: 429,
    message: {
      error: LOGIN_RATE_LIMIT_MESSAGE,
    },
    ...options,
  })
}

export const loginRateLimiter = createLoginRateLimiter()

/**
 * Every route under /api/*: a ceiling on how fast one client can read from the
 * database, so a script cannot scrape the TOR list or tie the server up.
 *
 * The window and the ceiling come from RATE_LIMIT_WINDOW_MS and
 * RATE_LIMIT_MAX_REQUESTS. The limiter is meant to be mounted on "/api", so the
 * path it sees is relative to that: "/health" is the load-balancer probe and
 * must keep answering when a client is being throttled.
 *
 * The 429 goes through the error middleware, so it has the same
 * `{ error, details }` body as every other failure, and `RateLimit-*` plus
 * `Retry-After` headers say when to come back.
 *
 * Build one per app (not a shared module instance): each owns its own counters.
 */
export function createApiRateLimiter(options?: Partial<Options>) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMaxRequests,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    skip: (req) => req.path === "/health",
    handler: (_req, _res, next, limiter) => {
      next(
        ApiError.tooManyRequests(undefined, {
          limit: limiter.limit,
          retryAfterSeconds: Math.ceil(limiter.windowMs / 1000),
        })
      )
    },
    ...options,
  })
}

/**
 * The two password-reset endpoints. Every request counts (not just failures):
 * "forgot password" has no failure to count, and each call can cost an email.
 */
function createResetLimiter(limit: number) {
  return rateLimit({
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(ApiError.tooManyRequests("Too many password reset attempts. Please try again in 15 minutes."))
    },
  })
}

export const forgotPasswordRateLimiter = createResetLimiter(5)
export const resetPasswordRateLimiter = createResetLimiter(10)

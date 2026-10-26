import rateLimit, { type Options } from "express-rate-limit"

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

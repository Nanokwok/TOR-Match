import type { Request, Response } from "express"
import { z } from "zod"

import { requestPasswordReset, resetPassword } from "@/services/password-reset.service"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"
import { logSecurityEvent } from "@/utils/security-logger"
import { newPasswordSchema } from "@/validation/password"

const forgotSchema = z.object({ email: z.string().trim().email("Valid email is required") })

const resetSchema = z.object({
  token: z.string().min(20, "Reset token is required").max(200),
  password: newPasswordSchema,
})

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) throw ApiError.badRequest("Invalid input", parsed.error.flatten())

  // Logged for every request, whether or not the address has an account: the log
  // is how a burst of requests against one address gets noticed. The response
  // below never says which it was.
  logSecurityEvent({ event: "AUTH_PASSWORD_RESET_REQUESTED", req, email: parsed.data.email.toLowerCase() })

  // Not awaited: the answer must not depend on how long the mail server takes,
  // or the response time would give away whether the address has an account.
  void requestPasswordReset(parsed.data.email).catch((error) => {
    console.error("[password-reset] could not send the reset email:", error instanceof Error ? error.message : error)
  })

  res.status(200).json({ ok: true })
})

export const resetPasswordWithToken = asyncHandler(async (req: Request, res: Response) => {
  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) throw ApiError.badRequest("Invalid input", parsed.error.flatten())

  try {
    const { userId } = await resetPassword(parsed.data.token, parsed.data.password)
    logSecurityEvent({ event: "PASSWORD_CHANGED", req, userId, details: { method: "reset-link" } })
  } catch (error) {
    // The reason is the service's own message (expired link, breached password), never the token.
    if (error instanceof ApiError) {
      logSecurityEvent({ event: "AUTH_PASSWORD_RESET_FAILED", req, reason: error.message })
    }
    throw error
  }
  res.status(200).json({ ok: true })
})

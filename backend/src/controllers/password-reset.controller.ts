import type { Request, Response } from "express"
import { z } from "zod"

import { requestPasswordReset, resetPassword } from "@/services/password-reset.service"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"

const forgotSchema = z.object({ email: z.string().trim().email("Valid email is required") })

const resetSchema = z.object({
  token: z.string().min(20, "Reset token is required").max(200),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) throw ApiError.badRequest("Invalid input", parsed.error.flatten())

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

  await resetPassword(parsed.data.token, parsed.data.password)
  res.status(200).json({ ok: true })
})

import type { Request, Response } from "express"
import { z } from "zod"

import { env } from "@/config/env"
import { changePassword } from "@/services/password-change.service"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"
import { authCookieOptions, signAuthToken } from "@/utils/jwt"
import { newPasswordSchema } from "@/validation/password"

const changeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: newPasswordSchema,
})

export const changeMyPassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()

  const parsed = changeSchema.safeParse(req.body)
  if (!parsed.success) throw ApiError.badRequest("Invalid input", parsed.error.flatten())

  const result = await changePassword(req.user.sub, parsed.data.currentPassword, parsed.data.newPassword)

  const token = signAuthToken({
    sub: req.user.sub,
    email: req.user.email,
    role: req.user.role,
    tokenVersion: result.tokenVersion,
  })
  res.cookie(env.authCookieName, token, authCookieOptions())
  // requireAuth already put a token for the old session in this header.
  res.setHeader("X-Refreshed-Token", token)
  res.status(200).json({ ok: true, token })
})

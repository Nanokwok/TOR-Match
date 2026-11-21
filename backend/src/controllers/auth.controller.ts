import type { Request, Response } from "express"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { User } from "@/models/User.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"
import { authCookieOptions, signAuthToken } from "@/utils/jwt"
import { env } from "@/config/env"
import { isPasswordPwned, PWNED_PASSWORD_ERROR_MESSAGE } from "@/services/pwned-password.service"
import { newPasswordSchema } from "@/validation/password"
import { logSecurityEvent } from "@/utils/security-logger"

const SALT_ROUNDS = 10

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  password: newPasswordSchema,
})

const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
})

function toPublicUser(user: { _id: unknown; email: string; name: string; role: string }) {
  return { id: String(user._id), email: user.email, name: user.name, role: user.role }
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid input", parsed.error.flatten())
  }
  const { name, email, password } = parsed.data

  const isPwned = await isPasswordPwned(password)
  if (isPwned) {
    throw ApiError.badRequest(PWNED_PASSWORD_ERROR_MESSAGE)
  }

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) throw ApiError.conflict("An account with this email already exists")

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash })

  logSecurityEvent({ event: "AUTH_REGISTRATION", req, userId: String(user._id), email: user.email })

  const token = signAuthToken({
    sub: String(user._id),
    email: user.email,
    role: user.role as "user" | "admin",
    tokenVersion: user.tokenVersion ?? 0,
  })
  res.cookie(env.authCookieName, token, authCookieOptions())
  res.status(201).json({ user: toPublicUser(user), token })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid input", parsed.error.flatten())
  }
  const { email, password } = parsed.data

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash")
  if (!user) {
    logSecurityEvent({ event: "AUTH_LOGIN_FAILURE", req, email: email.toLowerCase(), reason: "Account not found" })
    throw ApiError.unauthorized("Invalid email or password")
  }

  if (!user.passwordHash) {
    logSecurityEvent({ event: "AUTH_LOGIN_FAILURE", req, email: email.toLowerCase(), reason: "Google-only account" })
    throw ApiError.unauthorized("This account signs in with Google. Use the Google button.")
  }
  const matches = await bcrypt.compare(password, user.passwordHash)
  if (!matches) {
    logSecurityEvent({ event: "AUTH_LOGIN_FAILURE", req, email: email.toLowerCase(), reason: "Incorrect password" })
    throw ApiError.unauthorized("Invalid email or password")
  }

  logSecurityEvent({ event: "AUTH_LOGIN_SUCCESS", req, userId: String(user._id), email: user.email })

  const token = signAuthToken({
    sub: String(user._id),
    email: user.email,
    role: user.role as "user" | "admin",
    tokenVersion: user.tokenVersion ?? 0,
  })
  res.cookie(env.authCookieName, token, authCookieOptions())
  res.status(200).json({ user: toPublicUser(user), token })
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.sub) {
    await User.findByIdAndUpdate(req.user.sub, { $inc: { tokenVersion: 1 } })
    logSecurityEvent({ event: "AUTH_LOGOUT", req, userId: req.user.sub, email: req.user.email })
  }
  res.clearCookie(env.authCookieName, { ...authCookieOptions(), maxAge: 0 })
  res.clearCookie("tm_user_session", { ...authCookieOptions(), maxAge: 0 })
  res.status(204).send()
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const refreshedToken = signAuthToken({
    ...req.user,
    tokenVersion: req.user.tokenVersion ?? 0,
    lastActiveAt: Date.now(),
  })
  res.cookie(env.authCookieName, refreshedToken, authCookieOptions())
  res.setHeader("X-Refreshed-Token", refreshedToken)
  res.status(200).json({ token: refreshedToken, user: req.user })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const user = await User.findById(req.user.sub)
  if (!user) throw ApiError.unauthorized()
  res.status(200).json({ user: toPublicUser(user) })
})

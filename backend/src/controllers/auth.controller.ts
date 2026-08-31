import type { CookieOptions, Request, Response } from "express"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { User } from "@/models/User.model"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"
import { signAuthToken } from "@/utils/jwt"
import { env, isProduction } from "@/config/env"

const SALT_ROUNDS = 10

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
})

function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

function toPublicUser(user: { _id: unknown; email: string; name: string; role: string }) {
  return { id: String(user._id), email: user.email, name: user.name, role: user.role }
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid input", parsed.error.flatten())
  }
  const { name, email, password } = parsed.data

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) throw ApiError.conflict("An account with this email already exists")

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash })

  const token = signAuthToken({ sub: String(user._id), email: user.email, role: user.role as "user" | "admin" })
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
  if (!user) throw ApiError.unauthorized("Invalid email or password")

  const matches = await bcrypt.compare(password, user.passwordHash)
  if (!matches) throw ApiError.unauthorized("Invalid email or password")

  const token = signAuthToken({ sub: String(user._id), email: user.email, role: user.role as "user" | "admin" })
  res.cookie(env.authCookieName, token, authCookieOptions())
  res.status(200).json({ user: toPublicUser(user), token })
})

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(env.authCookieName, { ...authCookieOptions(), maxAge: 0 })
  res.status(204).send()
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized()
  const user = await User.findById(req.user.sub)
  if (!user) throw ApiError.unauthorized()
  res.status(200).json({ user: toPublicUser(user) })
})

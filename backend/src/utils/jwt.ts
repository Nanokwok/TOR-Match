import jwt from "jsonwebtoken"
import type { CookieOptions } from "express"
import { env, isProduction } from "@/config/env"

export type AuthTokenPayload = {
  sub: string
  email: string
  role: "user" | "admin"
  lastActiveAt?: number
  issuedAt?: number
}

export function authCookieOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  }
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  }
  const now = Date.now()
  const completePayload: AuthTokenPayload = {
    issuedAt: payload.issuedAt ?? now,
    lastActiveAt: payload.lastActiveAt ?? now,
    ...payload,
  }
  delete (completePayload as Record<string, unknown>).exp
  delete (completePayload as Record<string, unknown>).iat
  return jwt.sign(completePayload, env.jwtSecret, options)
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload
}

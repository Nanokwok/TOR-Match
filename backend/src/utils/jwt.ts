import jwt from "jsonwebtoken"
import type { CookieOptions } from "express"
import { env, isProduction } from "@/config/env"

/**
 * The one algorithm tokens are signed and accepted with (ASVS V9.1.2). Named on
 * both sides so a token that asks for another one ("none", or an RSA/EC
 * algorithm checked against our shared secret) is refused outright instead of
 * depending on the library's defaults.
 */
export const JWT_ALGORITHM = "HS256" as const

export type AuthTokenPayload = {
  sub: string
  email: string
  role: "user" | "admin"
  tokenVersion?: number
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
    algorithm: JWT_ALGORITHM,
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  }
  const now = Date.now()
  const completePayload: AuthTokenPayload = {
    issuedAt: payload.issuedAt ?? now,
    lastActiveAt: payload.lastActiveAt ?? now,
    tokenVersion: payload.tokenVersion ?? 0,
    ...payload,
  }
  delete (completePayload as Record<string, unknown>).exp
  delete (completePayload as Record<string, unknown>).iat
  return jwt.sign(completePayload, env.jwtSecret, options)
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret, { algorithms: [JWT_ALGORITHM] }) as AuthTokenPayload
}

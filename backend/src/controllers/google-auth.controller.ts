import type { CookieOptions, Request, Response } from "express"
import { OAuth2Client } from "google-auth-library"
import { z } from "zod"

import { env, isProduction } from "@/config/env"
import type { GoogleProfile } from "@/domain/google-account"
import { signInWithGoogleProfile } from "@/services/google-sign-in.service"
import { ApiError } from "@/utils/ApiError"
import { asyncHandler } from "@/utils/asyncHandler"
import { signAuthToken } from "@/utils/jwt"

/**
 * Google sign-in, authorization-code flow.
 *
 * The browser is sent to Google by the web app, Google redirects back to the
 * web app's callback with a one-time `code`, and the callback hands that code
 * to POST /auth/google. The exchange happens here so the client secret never
 * leaves the backend, and the redirect URI is fixed by configuration rather
 * than taken from the request.
 */

const GOOGLE_SCOPES = ["openid", "email", "profile"]

/** Where Google sends the user back to: the web app's callback route. */
function redirectUri(): string {
  return `${env.appUrl.replace(/\/$/, "")}/auth/google/callback`
}

function client(): OAuth2Client {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new ApiError(503, "Google sign-in is not configured on this server")
  }
  return new OAuth2Client(env.googleClientId, env.googleClientSecret, redirectUri())
}

function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

const urlQuerySchema = z.object({ state: z.string().min(8).max(200) })

export const googleAuthUrl = asyncHandler(async (req: Request, res: Response) => {
  const parsed = urlQuerySchema.safeParse(req.query)
  if (!parsed.success) throw ApiError.badRequest("A state value is required")

  const url = client().generateAuthUrl({
    scope: GOOGLE_SCOPES,
    state: parsed.data.state,
    // Always show the account chooser, so signing out and in can switch Google accounts.
    prompt: "select_account",
  })
  res.status(200).json({ url })
})

const codeSchema = z.object({ code: z.string().min(1) })

async function profileFromCode(code: string): Promise<GoogleProfile> {
  const google = client()
  const { tokens } = await google.getToken(code).catch(() => {
    throw ApiError.unauthorized("Google rejected the sign-in code. Please try again.")
  })
  if (!tokens.id_token) throw ApiError.unauthorized("Google did not return an identity token")

  // Verifies the signature, the expiry and that the token was issued to us.
  const ticket = await google.verifyIdToken({ idToken: tokens.id_token, audience: env.googleClientId })
  const payload = ticket.getPayload()
  if (!payload?.sub || !payload.email) throw ApiError.unauthorized("Google did not share an email address")

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: payload.name?.trim() || payload.email.split("@")[0],
  }
}

export const googleSignIn = asyncHandler(async (req: Request, res: Response) => {
  const parsed = codeSchema.safeParse(req.body)
  if (!parsed.success) throw ApiError.badRequest("A Google authorization code is required")

  const profile = await profileFromCode(parsed.data.code)
  const { user, action } = await signInWithGoogleProfile(profile)

  const token = signAuthToken({ sub: String(user._id), email: user.email, role: user.role as "user" | "admin" })
  res.cookie(env.authCookieName, token, authCookieOptions())
  res.status(action === "create" ? 201 : 200).json({
    user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
    token,
    created: action === "create",
  })
})

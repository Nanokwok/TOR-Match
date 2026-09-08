import jwt from "jsonwebtoken"
import { env } from "@/config/env"

export type AuthTokenPayload = {
  sub: string
  email: string
  role: "user" | "admin"
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  }
  return jwt.sign(payload, env.jwtSecret, options)
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload
}

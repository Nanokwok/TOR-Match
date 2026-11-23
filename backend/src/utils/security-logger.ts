import type { Request } from "express"
import { isProduction } from "@/config/env"

export type SecurityEventType =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILURE"
  | "AUTH_LOGOUT"
  | "AUTH_SESSION_REVOKED"
  | "AUTH_REGISTRATION"
  | "PASSWORD_CHANGED"
  | "PASSWORD_CHANGE_FAILED"
  | "AUTH_PASSWORD_RESET_REQUESTED"
  | "AUTH_PASSWORD_RESET_FAILED"
  | "TOR_PUBLISHED"
  | "ACCESS_DENIED"
  | "ROLE_ACCESS_DENIED"
  | "COMPANY_STATUS_MODIFIED"
  | "INPUT_VALIDATION_FAILURE"

export interface SecurityLogPayload {
  event: SecurityEventType
  req?: Request
  userId?: string
  email?: string
  reason?: string
  details?: Record<string, unknown>
}

export function logSecurityEvent(payload: SecurityLogPayload): void {
  const timestamp = new Date().toISOString()
  const ip = payload.req?.ip || (payload.req?.headers["x-forwarded-for"] as string) || "unknown"
  const method = payload.req?.method
  const path = payload.req?.originalUrl || payload.req?.url

  const logEntry = {
    timestamp,
    category: "SECURITY",
    event: payload.event,
    ip,
    method,
    path,
    userId: payload.userId,
    email: payload.email,
    reason: payload.reason,
    ...payload.details,
  }

  if (isProduction) {
    console.log(JSON.stringify(logEntry))
  } else {
    const details = payload.reason ? ` - ${payload.reason}` : ""
    const target = payload.email ? ` (user: ${payload.email})` : payload.userId ? ` (id: ${payload.userId})` : ""
    console.log(`[security] ${timestamp} ${payload.event}${target} from ${ip}${details}`)
  }
}

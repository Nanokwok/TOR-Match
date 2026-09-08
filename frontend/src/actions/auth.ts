"use server"

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string }

type EmailLoginInput = {
  email: string
  password: string
  rememberMe?: boolean
}

type EmailRegisterInput = {
  email: string
  password: string
}

/**
 * Auth action stubs. Replace with a real auth provider later.
 */
export async function loginWithEmailAction({
  email,
  password,
}: EmailLoginInput): Promise<AuthResult> {
  if (!email.trim() || !password.trim()) {
    return { ok: false, error: "Email and password are required." }
  }
  console.log("Action clicked: Login with email", { email })
  return { ok: true }
}

export async function loginWithGoogleAction(): Promise<AuthResult> {
  console.log("Action clicked: Login with Google")
  return { ok: true }
}

export async function registerWithEmailAction({
  email,
  password,
}: EmailRegisterInput): Promise<AuthResult> {
  if (!email.trim() || !password.trim()) {
    return { ok: false, error: "Email and password are required." }
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }
  console.log("Action clicked: Register with email", { email })
  return { ok: true }
}

export async function registerWithGoogleAction(): Promise<AuthResult> {
  console.log("Action clicked: Register with Google")
  return { ok: true }
}

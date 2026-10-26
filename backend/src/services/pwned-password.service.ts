import crypto from "node:crypto"

export const HIBP_RANGE_API_URL = "https://api.pwnedpasswords.com/range"
export const HIBP_TIMEOUT_MS = 1500
export const PWNED_PASSWORD_ERROR_MESSAGE =
  "This password has appeared in a known data breach. Please choose a different, unique password."

export interface CheckPwnedPasswordOptions {
  timeoutMs?: number
  baseUrl?: string
  fetchFn?: typeof fetch
}

export function hashPasswordSha1(password: string): {
  hash: string
  prefix: string
  suffix: string
} {
  const hash = crypto.createHash("sha1").update(password, "utf8").digest("hex").toUpperCase()
  return {
    hash,
    prefix: hash.slice(0, 5),
    suffix: hash.slice(5),
  }
}

export function isSuffixInPwnedList(responseText: string, targetSuffix: string): boolean {
  const normalizedTarget = targetSuffix.trim().toUpperCase()
  const lines = responseText.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const colonIdx = trimmed.indexOf(":")
    const suffixPart = (colonIdx === -1 ? trimmed : trimmed.substring(0, colonIdx)).trim().toUpperCase()

    if (suffixPart === normalizedTarget) {
      if (colonIdx !== -1) {
        const countStr = trimmed.substring(colonIdx + 1).trim()
        const count = parseInt(countStr, 10)
        if (!Number.isNaN(count)) {
          if (count > 0) return true
          // count is 0 => padding entry from Add-Padding: true, continue checking
          continue
        }
      }
      return true
    }
  }

  return false
}

/**
 * Checks if a password has appeared in a known breach using the Have I Been Pwned (HIBP)
 * Pwned Passwords range API with k-Anonymity.
 *
 * Falls back gracefully (returns false) if the API times out (default 1.5s),
 * is unreachable, or returns a non-200 HTTP response.
 */
export async function isPasswordPwned(
  password: string,
  options: CheckPwnedPasswordOptions = {}
): Promise<boolean> {
  const {
    timeoutMs = HIBP_TIMEOUT_MS,
    baseUrl = HIBP_RANGE_API_URL,
    fetchFn = globalThis.fetch,
  } = options

  const { prefix, suffix } = hashPasswordSha1(password)
  const url = `${baseUrl}/${prefix}`

  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort(new Error(`HIBP request timed out after ${timeoutMs}ms`))
  }, timeoutMs)

  try {
    const response = await fetchFn(url, {
      method: "GET",
      headers: {
        "Add-Padding": "true",
        "User-Agent": "tor-match",
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[hibp] Range query failed with HTTP ${response.status}. Allowing registration to proceed.`)
      return false
    }

    const text = await response.text()
    return isSuffixInPwnedList(text, suffix)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[hibp] Verification error (${message}). Allowing registration to proceed.`)
    return false
  } finally {
    clearTimeout(timer)
  }
}

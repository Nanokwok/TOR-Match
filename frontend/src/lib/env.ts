/**
 * Fails fast on a missing required env var instead of silently interpolating
 * "undefined" into a URL or cookie name. Mirrors backend/src/config/env.ts.
 */
export function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

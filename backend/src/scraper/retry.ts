/**
 * Retries a Vertex call that failed for a reason that passes on its own.
 *
 * A batch run sends requests back to back and Vertex answers 429 once the
 * per-minute quota is used up. That is not a failed extraction — it is the
 * same request a few seconds too early — but without a retry it lands in the
 * job log as a failure and the announcement is skipped until someone notices.
 */

/** 429 is quota; 500/503 are Vertex's own transient faults. */
const RETRYABLE = /\b(429|500|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|INTERNAL/

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status
  if (typeof status === "number" && (status === 429 || status >= 500)) return true
  return error instanceof Error && RETRYABLE.test(error.message)
}

export async function withRetry<T>(
  label: string,
  call: () => Promise<T>,
  { attempts = 4, baseDelayMs = 20_000 } = {}
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await call()
    } catch (error) {
      if (attempt >= attempts || !isRetryable(error)) throw error
      // Quota refills on a clock, so waiting longer each time is what clears
      // it; starting at 20s rather than 1s because the window is per minute.
      const waitMs = baseDelayMs * attempt
      console.warn(
        `[scrape] ${label} attempt ${attempt}/${attempts} failed (${error instanceof Error ? error.message.slice(0, 80) : error}); retrying in ${waitMs / 1000}s`
      )
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }
}

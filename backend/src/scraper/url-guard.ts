import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

import { env } from "@/config/env"

/**
 * Which URLs the scraper may fetch (SSRF defence).
 *
 * The document links come from a feed we do not control. A link that points at
 * 169.254.169.254, localhost or a private address would make this server call
 * its own network on the feed's behalf, so a link is fetched only when it is
 * http(s), names a host on the allowlist, and every address that host resolves
 * to is a public one. The same checks run again on every redirect.
 *
 * The lookup and the fetch resolve the name separately, so a DNS server that
 * answers differently the second time can still slip past. Pinning the address
 * would close that; it needs a custom dispatcher and is not done here.
 */

export class UnsafeUrlError extends Error {}

export type UrlGuardOptions = {
  /** Host names allowed, each also matching its subdomains. Defaults to SCRAPER_ALLOWED_HOSTS. */
  allowedHosts?: readonly string[]
  /** Skips the host and address checks (never the protocol one). For local test servers only. */
  allowAnyHost?: boolean
  /** Replaces the DNS lookup; exists so a test does not need a network. */
  resolve?: (hostname: string) => Promise<string[]>
}

/** IPv4 ranges that are never a public server: [network, prefix length]. */
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // RFC 1918
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, including cloud metadata
  ["172.16.0.0", 12], // RFC 1918
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // RFC 1918
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved and broadcast
]

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((total, part) => total * 256 + Number(part), 0)
}

function isBlockedV4(ip: string): boolean {
  const value = v4ToInt(ip)
  return BLOCKED_V4.some(([network, prefix]) => {
    const size = 2 ** (32 - prefix)
    const start = v4ToInt(network)
    return value >= start && value < start + size
  })
}

/** The IPv4 address inside an IPv4-mapped IPv6 address (::ffff:a.b.c.d or ::ffff:aabb:ccdd), or null. */
function mappedV4(ip: string): string | null {
  const match = /^::ffff:(.+)$/i.exec(ip)
  if (!match) return null
  const rest = match[1]
  if (rest.includes(".")) return rest
  const groups = rest.split(":")
  if (groups.length !== 2) return null
  const [high, low] = groups.map((group) => parseInt(group, 16))
  if ([high, low].some((n) => Number.isNaN(n))) return null
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`
}

/** Whether `ip` (v4 or v6) is loopback, private, link-local, multicast or otherwise not a public address. */
export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isBlockedV4(ip)
  if (version !== 6) return true // not an address at all: refuse rather than guess

  const lower = ip.toLowerCase()
  const mapped = mappedV4(lower)
  if (mapped) return isBlockedV4(mapped)

  if (lower === "::" || lower === "::1") return true
  const firstGroup = parseInt(lower.split(":")[0] || "0", 16)
  if ((firstGroup & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
  if ((firstGroup & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((firstGroup & 0xff00) === 0xff00) return true // ff00::/8 multicast
  return false
}

function hostAllowed(hostname: string, allowedHosts: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "")
  return allowedHosts.some((allowed) => {
    const suffix = allowed.toLowerCase().replace(/^\./, "")
    return host === suffix || host.endsWith(`.${suffix}`)
  })
}

async function defaultResolve(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true })
  return records.map((record) => record.address)
}

/**
 * Returns the parsed URL when it is safe to fetch, and throws {@link UnsafeUrlError} saying why when not.
 */
export async function assertSafeDocumentUrl(raw: string | URL, options: UrlGuardOptions = {}): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UnsafeUrlError("not a valid URL")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`protocol ${url.protocol} is not allowed`)
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs with embedded credentials are not allowed")
  }

  const allowAnyHost = options.allowAnyHost ?? env.scraperAllowAnyHost
  if (allowAnyHost) return url

  const hostname = url.hostname.replace(/^\[|\]$/g, "")
  if (isIP(hostname)) {
    throw new UnsafeUrlError("IP addresses are not allowed, only named hosts")
  }
  if (!hostAllowed(hostname, options.allowedHosts ?? env.scraperAllowedHosts)) {
    throw new UnsafeUrlError(`host ${hostname} is not on the allowlist`)
  }

  const addresses = await (options.resolve ?? defaultResolve)(hostname).catch(() => [])
  if (addresses.length === 0) {
    throw new UnsafeUrlError(`host ${hostname} did not resolve`)
  }
  const blocked = addresses.find(isBlockedAddress)
  if (blocked) {
    throw new UnsafeUrlError(`host ${hostname} resolves to a non-public address (${blocked})`)
  }
  return url
}

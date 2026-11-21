#!/usr/bin/env node
/**
 * Writes docs/security/sbom.json: a CycloneDX 1.5 list of every production
 * (non-dev) package in package-lock.json, with its version, licence, purl and
 * integrity hash.
 *
 * It reads only the lockfile and the installed packages' own package.json (for
 * a licence the lockfile leaves out), so it needs no network. Run `npm ci`
 * first, so the installed tree matches the lockfile, then `npm run sbom`.
 */
import { createHash, randomUUID } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"))
const root = JSON.parse(readFileSync("package.json", "utf8"))

/** "node_modules/a/node_modules/@s/b" -> "@s/b" */
function nameOf(path) {
  return path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length)
}

/** The licence as CycloneDX wants it: an SPDX id, an expression, or a plain name. */
function licenseOf(raw) {
  const value = typeof raw === "string" ? raw : raw?.type
  if (!value) return undefined
  if (/^[A-Za-z0-9.+-]+$/.test(value)) return [{ license: { id: value } }]
  if (/\b(OR|AND|WITH)\b|[()]/.test(value)) return [{ expression: value }]
  return [{ license: { name: value } }]
}

function hashesOf(integrity) {
  const match = /^(sha512|sha256|sha1)-(.+)$/.exec(integrity ?? "")
  if (!match) return undefined
  const [, algorithm, base64] = match
  const alg = { sha512: "SHA-512", sha256: "SHA-256", sha1: "SHA-1" }[algorithm]
  return [{ alg, content: Buffer.from(base64, "base64").toString("hex") }]
}

const seen = new Map()
for (const [path, entry] of Object.entries(lock.packages)) {
  // Skip the root, the workspaces themselves and their symlinks, and anything only development needs.
  if (!path.includes("node_modules/") || entry.link || entry.dev) continue

  const name = nameOf(path)
  const key = `${name}@${entry.version}`
  if (seen.has(key)) continue

  const installed = existsSync(`${path}/package.json`) ? JSON.parse(readFileSync(`${path}/package.json`, "utf8")) : {}
  const encoded = name.startsWith("@") ? `%40${name.slice(1)}` : name

  const component = {
    type: "library",
    "bom-ref": `pkg:npm/${encoded}@${entry.version}`,
    name,
    version: entry.version,
    scope: entry.optional ? "optional" : "required",
    ...(installed.description ? { description: installed.description } : {}),
    ...(licenseOf(entry.license ?? installed.license) ? { licenses: licenseOf(entry.license ?? installed.license) } : {}),
    ...(hashesOf(entry.integrity) ? { hashes: hashesOf(entry.integrity) } : {}),
    purl: `pkg:npm/${encoded}@${entry.version}`,
  }
  seen.set(key, component)
}

const components = [...seen.values()].sort(
  (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version)
)

const bom = {
  $schema: "http://cyclonedx.org/schema/bom-1.5.json",
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  serialNumber: `urn:uuid:${randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [{ vendor: "TOR Match", name: "scripts/generate-sbom.mjs" }],
    component: {
      type: "application",
      name: root.name,
      version: root.version,
      description: "TOR-Match Fullstack Procurement & TOR Intelligence Application",
    },
    properties: [
      { name: "source", value: "package-lock.json (non-dev packages)" },
      {
        name: "lockfile-sha256",
        value: createHash("sha256").update(readFileSync("package-lock.json")).digest("hex"),
      },
    ],
  },
  components,
}

writeFileSync("docs/security/sbom.json", `${JSON.stringify(bom, null, 2)}\n`)
console.log(`Wrote docs/security/sbom.json with ${components.length} components`)

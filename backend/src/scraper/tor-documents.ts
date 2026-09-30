import { unzipSync } from "fflate"

import { env } from "@/config/env"

/**
 * Fetches the documents behind a feed link.
 *
 * The two announcement types deliver different things, and the difference
 * matters to extraction:
 *
 *   D0 (ประกาศเชิญชวน)      → one PDF: a two-page notice that defers the
 *                             bidder requirements to the tender document
 *   B0 (ร่างเอกสารประกวดราคา) → a ZIP holding that tender document, where the
 *                             requirements actually are
 *
 * So a B0 link is unpacked and the PDFs inside are ranked, rather than being
 * rejected for not being a PDF.
 */

/** Gemini accepts ~20MB of inline data per request; stay clear of the ceiling. */
const MAX_TOTAL_BYTES = 15 * 1024 * 1024
const MAX_DOWNLOAD_BYTES = 40 * 1024 * 1024

export type TorDocument = {
  /** File name inside the archive, or a synthetic one for a bare PDF. */
  name: string
  pdf: Buffer
}

/**
 * How much each file in a tender archive is worth reading, highest first.
 *
 * `doc_…` is the tender document (เอกสารประกวดราคา) and the only one that
 * spells out the bidder qualifications; `annoudoc_…` is the announcement,
 * which repeats what the D0 feed already gives. Anything else — typically
 * `sit.pdf`, a scan of the scope of work with no text layer — comes last: it
 * is the largest file and the least reliable to read.
 */
function documentRank(name: string): number {
  const lower = name.toLowerCase()
  if (lower.startsWith("doc_")) return 0
  if (lower.startsWith("annoudoc_")) return 1
  return 2
}

function isPdf(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.subarray(0, 5)).toString("latin1") === "%PDF-"
}

/** Unpacks a tender archive into its PDFs, best first. */
export function unpackArchive(archive: Buffer): TorDocument[] {
  const entries = unzipSync(new Uint8Array(archive))

  return Object.entries(entries)
    .filter(([name, bytes]) => name.toLowerCase().endsWith(".pdf") && isPdf(bytes))
    .map(([name, bytes]) => ({ name, pdf: Buffer.from(bytes) }))
    .sort((a, b) => documentRank(a.name) - documentRank(b.name))
}

/**
 * Keeps documents in rank order until the inline-data budget runs out.
 *
 * Dropping the tail rather than failing: a 19MB archive is usually one large
 * scan alongside the documents that matter, and reading those is better than
 * reading nothing.
 */
export function withinBudget(documents: TorDocument[]): TorDocument[] {
  const kept: TorDocument[] = []
  let total = 0

  for (const document of documents) {
    if (total + document.pdf.byteLength > MAX_TOTAL_BYTES) continue
    kept.push(document)
    total += document.pdf.byteLength
  }
  return kept
}

export async function downloadTorDocuments(url: string): Promise<TorDocument[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": env.scraperUserAgent },
    signal: AbortSignal.timeout(180_000),
  })
  if (!response.ok) {
    throw new Error(`Document download returned HTTP ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(
      `Download is ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB, above the ${MAX_DOWNLOAD_BYTES / 1024 / 1024}MB limit`
    )
  }

  const magic = buffer.subarray(0, 5).toString("latin1")

  if (magic === "%PDF-") {
    return [{ name: "announcement.pdf", pdf: buffer }]
  }

  // "PK" is the ZIP local-file-header signature.
  if (magic.startsWith("PK")) {
    const documents = withinBudget(unpackArchive(buffer))
    if (documents.length === 0) {
      throw new Error("Tender archive contained no readable PDF")
    }
    return documents
  }

  // A missing document often answers 200 with an HTML error page; extraction
  // would then bill a full request to read an error message.
  throw new Error(`Downloaded file is neither a PDF nor a ZIP (starts with ${JSON.stringify(magic)})`)
}

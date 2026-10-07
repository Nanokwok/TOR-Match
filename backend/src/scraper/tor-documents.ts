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

/**
 * How large a file may be before we refuse to fetch it at all.
 *
 * This is a memory guard, not a judgement about the document: what the model
 * is sent is capped by MAX_TOTAL_BYTES regardless. It used to be 40MB, which
 * rejected eight of twenty-one announcements in a live run — tender archives
 * of 42MB to 182MB, every one of them holding a `doc_…` of a few megabytes
 * next to a enormous scan. The archive is now opened and only the files worth
 * reading are decompressed, so the ceiling only has to be high enough to hold
 * the compressed bytes.
 */
const MAX_DOWNLOAD_BYTES = 256 * 1024 * 1024

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

/**
 * Unpacks a tender archive into its PDFs, best first.
 *
 * Entries are chosen from the archive's index before anything is decompressed,
 * so a 120MB scan of the site drawings costs nothing to skip. Only PDFs small
 * enough to be worth sending are expanded — which is what makes a 182MB
 * archive readable at all.
 */
export function unpackArchive(archive: Buffer): TorDocument[] {
  const oversized: string[] = []

  const entries = unzipSync(new Uint8Array(archive), {
    filter: (file) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) return false
      // fflate's `size` is the compressed size; `originalSize` is what we
      // would have to hold in memory and send, which is the number that
      // matters — a scan compresses well and would otherwise slip through.
      if (file.originalSize > MAX_TOTAL_BYTES) {
        oversized.push(`${file.name} (${(file.originalSize / 1024 / 1024).toFixed(1)}MB)`)
        return false
      }
      return true
    },
  })

  const documents = Object.entries(entries)
    .filter(([, bytes]) => isPdf(bytes))
    .map(([name, bytes]) => ({ name, pdf: Buffer.from(bytes) }))
    .sort((a, b) => documentRank(a.name) - documentRank(b.name))

  // Saying "no readable PDF" about an archive that held three of them, each
  // too big to send, would send someone looking in the wrong place.
  if (!documents.length && oversized.length) {
    throw new Error(
      `Every PDF in the archive is above the ${MAX_TOTAL_BYTES / 1024 / 1024}MB per-request budget: ${oversized.join(", ")}`
    )
  }

  return documents
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

/**
 * Fetches several links as one document set, best first.
 *
 * An announcement can be published twice — as a B0 draft archive and as a D0
 * invitation — and the two state different things, so the extraction reads both
 * in one request rather than paying for two. The budget is re-applied across
 * the whole set, which a per-link download cannot do.
 *
 * A link that fails is skipped rather than failing the set: losing the
 * invitation costs a deadline, while losing the tender document costs every
 * qualification, and neither is a reason to discard the other.
 */
/**
 * Roughly how many pages a PDF has.
 *
 * Counted from the raw bytes rather than parsed: e-GP documents carry an
 * uncompressed page tree, and the number only has to be good enough to tell a
 * two-page notice from a tender document. Returns 0 when neither marker is
 * found, which callers must read as "unknown", not "empty".
 */
export function countPdfPages(pdf: Buffer): number {
  const text = pdf.toString("latin1")
  const pageObjects = text.match(/\/Type\s*\/Page[^s]/g)?.length ?? 0
  if (pageObjects > 0) return pageObjects

  const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((match) => Number(match[1]))
  return counts.length ? Math.max(...counts) : 0
}

/**
 * Whether this document set contains a tender, rather than only a notice.
 *
 * ประกาศเชิญชวน is two to four pages and a couple of hundred kilobytes; it
 * defers every qualification to the tender document. A tender runs to dozens of
 * pages, or arrives as an archive of several files. Deciding here — after the
 * download, before the model call — costs nothing, and tells the merge whether
 * this extraction may overwrite the content a previous one found.
 */
export function carriesFullTender(documents: readonly TorDocument[]): boolean {
  if (documents.length > 1) return true

  const [only] = documents
  if (!only) return false

  return countPdfPages(only.pdf) >= 10 || only.pdf.byteLength >= 300_000
}

export async function downloadAllTorDocuments(
  urls: readonly string[]
): Promise<TorDocument[]> {
  const collected: TorDocument[] = []
  const failures: string[] = []

  for (const url of urls) {
    try {
      collected.push(...(await downloadTorDocuments(url)))
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error))
    }
  }

  if (!collected.length) {
    throw new Error(`No document could be read (${failures.join("; ") || "no links given"})`)
  }
  return withinBudget(collected)
}

export async function downloadTorDocuments(url: string): Promise<TorDocument[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": env.scraperUserAgent },
    // Tender archives run to hundreds of megabytes over a government link.
    signal: AbortSignal.timeout(600_000),
  })
  if (!response.ok) {
    throw new Error(`Document download returned HTTP ${response.status}`)
  }

  // Refused from the header where the server states one, so an absurd file is
  // declined before it is pulled across the wire and into memory.
  const declaredBytes = Number(response.headers.get("content-length") ?? 0)
  if (declaredBytes > MAX_DOWNLOAD_BYTES) {
    throw new Error(
      `Download declares ${(declaredBytes / 1024 / 1024).toFixed(1)}MB, above the ${MAX_DOWNLOAD_BYTES / 1024 / 1024}MB limit`
    )
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

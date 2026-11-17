import { unzipSync } from "fflate"

import { env } from "@/config/env"
import { MAGIC_BYTES_LENGTH, detectFileType, validateMagicBytes, type FileType } from "@/utils/file-validator"

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
 * How large a bare PDF may be before we stop downloading it (ASVS V5.2.1).
 *
 * The same figure as the model's inline budget: a PDF past it could not be sent
 * anyway, and the notices and tender documents e-GP serves this way are a few
 * megabytes at most.
 */
const MAX_PDF_DOWNLOAD_BYTES = MAX_TOTAL_BYTES

/**
 * How large a tender archive may be before we stop downloading it.
 *
 * Deliberately not 15MB. This is a memory guard on the compressed bytes, not a
 * judgement about the document: what the model is sent is capped by
 * MAX_TOTAL_BYTES regardless, because the archive is opened and only the files
 * worth reading are decompressed. A 15MB ceiling here, or the 40MB this used to
 * be, rejected eight of twenty-one announcements in a live run — tender
 * archives of 42MB to 182MB, every one holding a `doc_…` of a few megabytes
 * next to an enormous scan.
 */
const MAX_ARCHIVE_DOWNLOAD_BYTES = 256 * 1024 * 1024

/** A tender archive holds a handful of files; thousands is not a tender. */
const MAX_ARCHIVE_ENTRIES = 1000

const MB = 1024 * 1024

function describeBytes(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)}MB` : `${bytes} bytes`
}

/**
 * A refused document is logged as well as thrown: the caller may skip the link
 * and carry on, and without the log nobody would learn that a source is serving
 * oversized or mislabelled files.
 */
function refuse(message: string): never {
  console.warn(`[documents] refused: ${message}`)
  throw new Error(message)
}

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
  return validateMagicBytes(bytes, "pdf")
}

/**
 * Unpacks a tender archive into its PDFs, best first.
 *
 * Nothing is decompressed until it has been chosen. The archive's index is read
 * first, the candidates are ranked, and files are then expanded one at a time
 * until the inline-data budget is spent — so what is held in memory is bounded
 * by that budget, however many files the archive claims to hold or however well
 * they compress. (Capping each file alone is not enough: forty 14MB entries
 * pass a 15MB-per-file check and expand to 560MB from a 0.5MB download.)
 *
 * Sizes come from the archive's own index. An archive that under-states one is
 * cut off at the stated size rather than expanded past it, so it cannot be used
 * to get around the budget.
 */
export function unpackArchive(archive: Buffer): TorDocument[] {
  // A view, not a copy: archives run to hundreds of megabytes.
  const bytes = new Uint8Array(archive.buffer, archive.byteOffset, archive.byteLength)

  const candidates = new Map<string, number>()
  const oversized: string[] = []
  let entries = 0

  unzipSync(bytes, {
    filter: (file) => {
      entries += 1
      if (entries > MAX_ARCHIVE_ENTRIES) {
        refuse(`Archive holds more than ${MAX_ARCHIVE_ENTRIES} files`)
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) return false
      // `originalSize` is what we would have to hold in memory and send;
      // fflate's `size` is the compressed size, and a scan compresses well.
      if (file.originalSize > MAX_TOTAL_BYTES) {
        oversized.push(`${file.name} (${describeBytes(file.originalSize)})`)
        return false
      }
      candidates.set(file.name, file.originalSize)
      return false
    },
  })

  const ranked = [...candidates].sort(([a], [b]) => documentRank(a) - documentRank(b))

  const documents: TorDocument[] = []
  let total = 0
  for (const [name, size] of ranked) {
    if (total + size > MAX_TOTAL_BYTES) continue

    const entry = unzipSync(bytes, { filter: (file) => file.name === name })[name]
    // Judged by content, not by the extension: a file named .pdf that is not
    // one is dropped here, before it has used any of the budget.
    if (!entry || !isPdf(entry)) continue

    documents.push({ name, pdf: Buffer.from(entry) })
    total += entry.byteLength
  }

  // Saying "no readable PDF" about an archive that held three of them, each
  // too big to send, would send someone looking in the wrong place.
  if (!documents.length && oversized.length) {
    refuse(`Every PDF in the archive is above the ${MAX_TOTAL_BYTES / MB}MB per-request budget: ${oversized.join(", ")}`)
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

export type DownloadOptions = {
  /** Overrides the bare-PDF ceiling; exists so a test does not have to serve 15MB. */
  maxPdfBytes?: number
  /** Overrides the archive ceiling; exists so a test does not have to serve 256MB. */
  maxArchiveBytes?: number
}

type DownloadLimits = Required<DownloadOptions>

/**
 * Reads a response body, refusing it the moment it passes its ceiling or its
 * first bytes show it is neither a PDF nor a ZIP.
 *
 * Counted as it arrives rather than after `arrayBuffer()`: Content-Length is
 * optional (a chunked response has none) and a server can understate it, so
 * the header alone cannot bound what is pulled into memory.
 *
 * Which ceiling applies is not known until the first bytes arrive and say what
 * the file is, so the larger one governs until then.
 */
async function readBody(response: Response, limits: DownloadLimits, declaredBytes: number): Promise<{ buffer: Buffer; type: FileType }> {
  const reader = response.body?.getReader()
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer())
    const type = requireDocumentType(buffer)
    enforceLimit(type, buffer.byteLength, limits)
    return { buffer, type }
  }

  const chunks: Uint8Array[] = []
  let received = 0
  let type: FileType | null = null

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      received += value.byteLength

      if (!type && received >= MAGIC_BYTES_LENGTH) {
        type = requireDocumentType(Buffer.concat(chunks, received))
        // The header said how big the file is; now that its kind is known the
        // right ceiling can be applied to it without reading any further.
        if (declaredBytes > limitFor(type, limits)) {
          refuse(`Download declares ${describeBytes(declaredBytes)}, above the ${describeBytes(limitFor(type, limits))} limit for a ${type}`)
        }
      }
      enforceLimit(type, received, limits)
    }

    const buffer = Buffer.concat(chunks, received)
    // A body shorter than the signature never reached the check above.
    return { buffer, type: type ?? requireDocumentType(buffer) }
  } catch (error) {
    // Hang up rather than leave the rest of a refused file coming down the
    // line: an open stream keeps the connection, and the transfer, alive.
    await reader.cancel().catch(() => undefined)
    throw error
  }
}

const limitFor = (type: FileType, limits: DownloadLimits) => (type === "pdf" ? limits.maxPdfBytes : limits.maxArchiveBytes)

function enforceLimit(type: FileType | null, bytes: number, limits: DownloadLimits) {
  const limit = type ? limitFor(type, limits) : Math.max(limits.maxPdfBytes, limits.maxArchiveBytes)
  if (bytes > limit) refuse(`Download is above the ${describeBytes(limit)} limit${type ? ` for a ${type}` : ""}`)
}

function requireDocumentType(bytes: Uint8Array): FileType {
  const type = detectFileType(bytes)
  if (!type) {
    // A missing document often answers 200 with an HTML error page; extraction
    // would then bill a full request to read an error message.
    const head = Buffer.from(bytes.subarray(0, MAGIC_BYTES_LENGTH)).toString("latin1")
    refuse(`Downloaded file is neither a PDF nor a ZIP (starts with ${JSON.stringify(head)})`)
  }
  return type
}

export async function downloadTorDocuments(url: string, options: DownloadOptions = {}): Promise<TorDocument[]> {
  const limits: DownloadLimits = {
    maxPdfBytes: options.maxPdfBytes ?? MAX_PDF_DOWNLOAD_BYTES,
    maxArchiveBytes: options.maxArchiveBytes ?? MAX_ARCHIVE_DOWNLOAD_BYTES,
  }

  const response = await fetch(url, {
    headers: { "User-Agent": env.scraperUserAgent },
    redirect: "error",
    // Tender archives run to hundreds of megabytes over a government link.
    signal: AbortSignal.timeout(600_000),
  })
  if (!response.ok) {
    throw new Error(`Document download returned HTTP ${response.status}`)
  }

  // Refused from the header where the server states one, so an absurd file is
  // declined before it is pulled across the wire and into memory. Its kind is
  // not known yet, so only the larger ceiling can be applied here.
  const declaredBytes = Number(response.headers.get("content-length") ?? 0)
  const largest = Math.max(limits.maxPdfBytes, limits.maxArchiveBytes)
  if (declaredBytes > largest) {
    await response.body?.cancel().catch(() => undefined)
    refuse(`Download declares ${describeBytes(declaredBytes)}, above the ${describeBytes(largest)} limit`)
  }

  const { buffer, type } = await readBody(response, limits, declaredBytes)

  if (type === "pdf") {
    return [{ name: "announcement.pdf", pdf: buffer }]
  }

  const documents = withinBudget(unpackArchive(buffer))
  if (documents.length === 0) {
    refuse("Tender archive contained no readable PDF")
  }
  return documents
}

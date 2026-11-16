import test, { after, mock } from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { zipSync } from "fflate"

import { downloadTorDocuments, unpackArchive } from "../src/scraper/tor-documents"
import { detectFileType, validateMagicBytes } from "../src/utils/file-validator"

const MB = 1024 * 1024

// Refusals are logged on purpose; keep that out of the test report, but keep
// the calls so a test can check that one was made.
const warn = mock.method(console, "warn", () => undefined)
after(() => warn.mock.restore())

/** A PDF of `bytes` bytes: a valid header, then padding that compresses to nothing. */
function pdf(bytes = 1024): Uint8Array {
  const out = new Uint8Array(bytes)
  out.set(Buffer.from("%PDF-1.4\n/Type /Page\n"))
  return out
}

// ---- what a file is -------------------------------------------------------------

test("a PDF must begin with %PDF- (0x25 0x50 0x44 0x46 0x2d)", () => {
  assert.equal(validateMagicBytes(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]), "pdf"), true)
  assert.equal(validateMagicBytes(Buffer.from("%PDF-1.7\n"), "pdf"), true)
  assert.equal(validateMagicBytes(Buffer.from("%PDF"), "pdf"), false, "the dash is part of the signature")
  assert.equal(validateMagicBytes(Buffer.from("%pdf-1.4"), "pdf"), false, "case matters")
})

test("a ZIP must begin with PK\\x03\\x04 (0x50 0x4b 0x03 0x04)", () => {
  assert.equal(validateMagicBytes(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14]), "zip"), true)
  assert.equal(validateMagicBytes(zipSync({ "a.pdf": pdf() }), "zip"), true)
})

test("a file is only ever valid as the type it really is", () => {
  const aZip = zipSync({ "a.pdf": pdf() })
  assert.equal(validateMagicBytes(pdf(), "zip"), false)
  assert.equal(validateMagicBytes(aZip, "pdf"), false)
  assert.equal(detectFileType(pdf()), "pdf")
  assert.equal(detectFileType(aZip), "zip")
})

test("an empty archive is still a ZIP, so it is reported as empty rather than as garbage", () => {
  assert.equal(detectFileType(zipSync({})), "zip")
})

test("text that merely starts with PK is not a ZIP", () => {
  assert.equal(validateMagicBytes(Buffer.from("PKI infrastructure notice"), "zip"), false)
  assert.equal(validateMagicBytes(Buffer.from("PK"), "zip"), false)
})

test("an HTML error page, an empty buffer and a PDF with something in front of it are all refused", () => {
  assert.equal(detectFileType(Buffer.from("<!DOCTYPE html><title>Not found</title>")), null)
  assert.equal(detectFileType(Buffer.alloc(0)), null)
  assert.equal(detectFileType(Buffer.from("\n%PDF-1.4")), null)
})

// ---- inside an archive ------------------------------------------------------------

test("many files that are each under the per-file cap are not all expanded", () => {
  // Forty 14MB entries is 0.5MB on the wire and 560MB once expanded. Only the
  // budget's worth may be read.
  const files: Record<string, Uint8Array> = {}
  for (let i = 0; i < 40; i++) files[`sit_${i}.pdf`] = pdf(14 * MB)

  const documents = unpackArchive(Buffer.from(zipSync(files)))

  assert.equal(documents.length, 1)
  assert.ok(documents.reduce((sum, document) => sum + document.pdf.byteLength, 0) <= 15 * MB)
})

test("when the budget cannot hold everything, the tender document wins over a scan listed first", () => {
  const archive = Buffer.from(
    zipSync({
      "sit.pdf": pdf(10 * MB),
      "annoudoc_1.pdf": pdf(10 * MB),
      "doc_1.pdf": pdf(10 * MB),
    })
  )

  assert.deepEqual(unpackArchive(archive).map((document) => document.name), ["doc_1.pdf"])
})

test("a smaller file that still fits is kept after one that does not", () => {
  const archive = Buffer.from(zipSync({ "doc_1.pdf": pdf(12 * MB), "sit.pdf": pdf(8 * MB), "annoudoc_1.pdf": pdf(2 * MB) }))

  assert.deepEqual(unpackArchive(archive).map((document) => document.name), ["doc_1.pdf", "annoudoc_1.pdf"])
})

test("a file named .pdf that is not one is dropped and does not use up the budget", () => {
  const notAPdf = new Uint8Array(14 * MB)
  notAPdf.set(Buffer.from("<html>"))
  const archive = Buffer.from(zipSync({ "doc_fake.pdf": notAPdf, "annoudoc_real.pdf": pdf(5 * MB) }))

  assert.deepEqual(unpackArchive(archive).map((document) => document.name), ["annoudoc_real.pdf"])
})

test("files that are not PDFs by name are never expanded", () => {
  const archive = Buffer.from(zipSync({ "readme.txt": new Uint8Array(1024), "doc_1.PDF": pdf() }))

  assert.deepEqual(unpackArchive(archive).map((document) => document.name), ["doc_1.PDF"])
})

test("an archive claiming thousands of files is refused", () => {
  const files: Record<string, Uint8Array> = {}
  for (let i = 0; i < 1001; i++) files[`f${i}.pdf`] = pdf(64)

  assert.throws(() => unpackArchive(Buffer.from(zipSync(files))), /more than 1000 files/)
})

test("a name that tries to climb out of the folder is only ever a label", () => {
  const archive = Buffer.from(zipSync({ "../../etc/doc_x.pdf": pdf() }))

  const [document] = unpackArchive(archive)
  assert.equal(document.name, "../../etc/doc_x.pdf")
  assert.ok(document.pdf.byteLength > 0)
})

// ---- downloading ----------------------------------------------------------------------

const servers: Server[] = []
after(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

async function serve(handler: (request: IncomingMessage, response: ServerResponse) => void) {
  const server = createServer(handler)
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/file`
}

test("a PDF is downloaded and returned as one document", async () => {
  const url = await serve((_request, response) => response.end(pdf(2048)))

  const [document, ...rest] = await downloadTorDocuments(url)
  assert.equal(rest.length, 0)
  assert.equal(document.pdf.byteLength, 2048)
})

test("a ZIP is downloaded and unpacked, best document first", async () => {
  const archive = Buffer.from(zipSync({ "sit.pdf": pdf(), "doc_1.pdf": pdf() }))
  const url = await serve((_request, response) => response.end(archive))

  const documents = await downloadTorDocuments(url)
  assert.deepEqual(documents.map((document) => document.name), ["doc_1.pdf", "sit.pdf"])
})

test("a 200 that carries an HTML error page is refused as neither a PDF nor a ZIP", async () => {
  const url = await serve((_request, response) => response.end("<!DOCTYPE html><h1>Not found</h1>"))

  await assert.rejects(downloadTorDocuments(url), /neither a PDF nor a ZIP/)
})

test("an empty or very short body is refused rather than crashing", async () => {
  await assert.rejects(downloadTorDocuments(await serve((_request, response) => response.end())), /neither a PDF nor a ZIP/)
  await assert.rejects(downloadTorDocuments(await serve((_request, response) => response.end("%P"))), /neither a PDF nor a ZIP/)
})

test("an error status is reported with its code", async () => {
  const url = await serve((_request, response) => {
    response.statusCode = 404
    response.end("gone")
  })

  await assert.rejects(downloadTorDocuments(url), /HTTP 404/)
})

test("a file that declares itself too large is refused before its body is sent", async () => {
  let bodySent = false
  const url = await serve((_request, response) => {
    response.setHeader("content-length", String(5 * MB))
    response.flushHeaders()
    setTimeout(() => {
      bodySent = true
      response.destroy()
    }, 300)
  })

  await assert.rejects(downloadTorDocuments(url, { maxPdfBytes: 1 * MB, maxArchiveBytes: 1 * MB }), /declares 5\.0MB, above the 1\.0MB limit/)
  assert.equal(bodySent, false, "no time was spent waiting for the body")
})

test("a chunked file with no Content-Length is cut off at the limit instead of being read to the end", async () => {
  // The header cannot bound this download, because there is none. The server
  // keeps offering 64KB chunks until the client hangs up; if the client read
  // the whole body first it would drain every one of them.
  const chunk = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(64 * 1024)])
  const OFFERED = 2000 // 125MB
  let sent = 0
  const url = await serve((_request, response) => {
    let open = true
    response.on("close", () => (open = false))
    const next = () => {
      while (open && sent < OFFERED) {
        sent += 1
        if (!response.write(chunk)) return void response.once("drain", next)
      }
      response.end()
    }
    next()
  })

  await assert.rejects(downloadTorDocuments(url, { maxPdfBytes: 1 * MB }), /Download is above the 1\.0MB limit for a pdf/)
  assert.ok(sent < OFFERED / 2, `the client stopped early (server wrote ${sent} of ${OFFERED} chunks)`)
})

test("a download is refused as soon as its first bytes show it is not a document", async () => {
  const html = Buffer.from("<!DOCTYPE html><body>" + "x".repeat(64 * 1024))
  const OFFERED = 2000
  let sent = 0
  const url = await serve((_request, response) => {
    let open = true
    response.on("close", () => (open = false))
    const next = () => {
      while (open && sent < OFFERED) {
        sent += 1
        if (!response.write(html)) return void response.once("drain", next)
      }
      response.end()
    }
    next()
  })

  await assert.rejects(downloadTorDocuments(url), /neither a PDF nor a ZIP/)
  assert.ok(sent < OFFERED / 2, `the client stopped early (server wrote ${sent} of ${OFFERED} chunks)`)
})

test("a PDF is held to the PDF ceiling even where archives may be larger", async () => {
  const url = await serve((_request, response) => response.end(pdf(3 * MB)))

  await assert.rejects(
    downloadTorDocuments(url, { maxPdfBytes: 1 * MB, maxArchiveBytes: 10 * MB }),
    /declares 3\.0MB, above the 1\.0MB limit for a pdf/
  )
})

test("an archive may be larger than a PDF is allowed to be, because it is opened rather than read whole", async () => {
  // Incompressible content, so the archive really is bigger than the PDF ceiling.
  const body = new Uint8Array(randomBytes(1_500_000))
  body.set(Buffer.from("%PDF-1.4\n"))
  const archive = Buffer.from(zipSync({ "doc_1.pdf": body }, { level: 0 }))
  assert.ok(archive.byteLength > 1 * MB)
  const url = await serve((_request, response) => response.end(archive))

  const documents = await downloadTorDocuments(url, { maxPdfBytes: 1 * MB, maxArchiveBytes: 10 * MB })
  assert.deepEqual(documents.map((document) => document.name), ["doc_1.pdf"])
})

test("an archive is cut off at the archive ceiling when it keeps coming", async () => {
  const head = Buffer.from([0x50, 0x4b, 0x03, 0x04])
  const chunk = Buffer.concat([head, Buffer.alloc(64 * 1024)])
  const OFFERED = 2000
  let sent = 0
  const url = await serve((_request, response) => {
    let open = true
    response.on("close", () => (open = false))
    const next = () => {
      while (open && sent < OFFERED) {
        sent += 1
        if (!response.write(chunk)) return void response.once("drain", next)
      }
      response.end()
    }
    next()
  })

  await assert.rejects(downloadTorDocuments(url, { maxArchiveBytes: 1 * MB }), /Download is above the 1\.0MB limit for a zip/)
  assert.ok(sent < OFFERED / 2, `the client stopped early (server wrote ${sent} of ${OFFERED} chunks)`)
})

test("every refusal leaves a warning in the log", async () => {
  warn.mock.resetCalls()
  const html = await serve((_request, response) => response.end("<!DOCTYPE html><h1>Not found</h1>"))
  const huge = await serve((_request, response) => response.end(pdf(3 * MB)))

  await assert.rejects(downloadTorDocuments(html))
  await assert.rejects(downloadTorDocuments(huge, { maxPdfBytes: 1 * MB }))
  assert.throws(() => unpackArchive(Buffer.from(zipSync({ "sit.pdf": pdf(16 * MB) }))))

  const messages = warn.mock.calls.map((call) => String(call.arguments[0]))
  assert.equal(messages.length, 3)
  assert.ok(messages.every((message) => message.startsWith("[documents] refused:")))
  assert.match(messages[0], /neither a PDF nor a ZIP/)
  assert.match(messages[1], /above the 1\.0MB limit/)
  assert.match(messages[2], /per-request budget/)
})

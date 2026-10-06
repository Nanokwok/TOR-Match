import test from "node:test"
import assert from "node:assert/strict"
import { carriesFullTender, countPdfPages } from "../src/scraper/tor-documents"

/** A PDF carrying `pages` page objects, padded to `bytes`. */
function pdf(pages: number, bytes = 1024): Buffer {
  const header = "%PDF-1.4\n" + "/Type /Page\n".repeat(pages)
  return Buffer.from(header.padEnd(Math.max(bytes, header.length), " "), "latin1")
}

test("pages are counted from the page objects", () => {
  assert.equal(countPdfPages(pdf(2)), 2)
  assert.equal(countPdfPages(pdf(40)), 40)
})

test("a page tree that states its own count is read instead", () => {
  const withCount = Buffer.from("%PDF-1.4\n/Type /Pages /Count 37\n", "latin1")

  assert.equal(countPdfPages(withCount), 37)
})

test("a file with neither marker reports unknown rather than guessing", () => {
  assert.equal(countPdfPages(Buffer.from("%PDF-1.4\nnothing here", "latin1")), 0)
})

test("a two-page notice is not a tender", () => {
  assert.equal(carriesFullTender([{ name: "annoudoc.pdf", pdf: pdf(2, 150_000) }]), false)
})

test("a long document is a tender", () => {
  assert.equal(carriesFullTender([{ name: "doc_1.pdf", pdf: pdf(40) }]), true)
})

test("a short but heavy document is a tender — it is a scan", () => {
  assert.equal(carriesFullTender([{ name: "sit.pdf", pdf: pdf(2, 400_000) }]), true)
})

test("an archive of several files is always a tender", () => {
  assert.equal(
    carriesFullTender([
      { name: "doc_1.pdf", pdf: pdf(2, 1000) },
      { name: "annoudoc_1.pdf", pdf: pdf(2, 1000) },
    ]),
    true
  )
})

test("nothing downloaded is not a tender", () => {
  assert.equal(carriesFullTender([]), false)
})

import test from "node:test"
import assert from "node:assert/strict"
import { pickTorDocument, rankTorDocuments, type BmaDocument } from "../src/scraper/bma-client"

/** Shaped after the attachments on project 69109028092. */
function document(label: string): BmaDocument {
  return { label, url: `https://egp2.bangkok.go.th/api/file/${label}.pdf`, postedDate: "02/10/2569" }
}

const tender = document("ร่างขอบเขตของงาน (TOR)")
const invitation = document("ประกวดราคาจ้างบำรุงรักษาระบบกล้อง ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์")
const medianPrice = document("ประกาศราคากลาง")

test("the tender is read first and the median price sheet last", () => {
  const ranked = rankTorDocuments([medianPrice, invitation, tender])
  assert.deepEqual(
    ranked.map((doc) => doc.label),
    [tender.label, invitation.label, medianPrice.label]
  )
})

test("the invitation outranks the median price sheet when no tender is attached", () => {
  // This is the case that leaves a TOR without a deadline: only the invitation
  // states one, so it has to be among the documents the extractor reads.
  const ranked = rankTorDocuments([medianPrice, invitation])
  assert.equal(ranked[0].label, invitation.label)
})

test("ranking does not mutate the caller's array", () => {
  const documents = [medianPrice, tender]
  rankTorDocuments(documents)
  assert.deepEqual(documents.map((doc) => doc.label), [medianPrice.label, tender.label])
})

test("picking returns the best-ranked document, or null when there are none", () => {
  assert.equal(pickTorDocument([medianPrice, tender])?.label, tender.label)
  assert.equal(pickTorDocument([]), null)
})

import test from "node:test"
import assert from "node:assert/strict"
import {
  changedFields,
  groupByProject,
  needsInvitation,
  primary,
  primaryDocument,
  sourceUrlFor,
} from "../src/scraper/announcement-sources"
import { ANNOUNCE_TYPES, type EgpAnnouncement } from "../src/scraper/egp-rss"

const DRAFT_LINK = "https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFileTest?fileId=aed4"
const INVITE_LINK = "https://process5.gprocurement.go.th/egp-template-service/dwnt/view-pdf-file?templateId=5fff"

/** Shaped after the live feed entries for project 69079298848. */
function announcement(overrides: Partial<EgpAnnouncement> = {}): EgpAnnouncement {
  return {
    projectNo: "69079298848",
    title: "ประกวดราคาซื้อยา Empagliflozin ๑๐ mg",
    pdfUrl: DRAFT_LINK,
    methodLabel: "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
    announceLabel: "ร่างเอกสารประกวดราคา (e-Bidding)",
    publishedDate: "2026-09-25",
    ...overrides,
  }
}

const draft = announcement()
const invitation = announcement({
  pdfUrl: INVITE_LINK,
  announceLabel: "ประกาศเชิญชวน",
  publishedDate: "2026-10-01",
})

test("one project published under both types becomes a single entry holding both", () => {
  // The project number belongs to the project, not the announcement, so the
  // same number appears under each type as it moves through its stages.
  const sources = groupByProject(
    new Map([
      [ANNOUNCE_TYPES.draft, [draft]],
      [ANNOUNCE_TYPES.invitation, [invitation]],
    ])
  )
  assert.equal(sources.size, 1)
  const entry = sources.get("69079298848")!
  assert.equal(entry.draft?.pdfUrl, DRAFT_LINK)
  assert.equal(entry.invitation?.pdfUrl, INVITE_LINK)
})

test("the invitation describes the project, the draft supplies the document", () => {
  const entry = { projectNo: "69079298848", draft, invitation }
  // Metadata comes from the real announcement...
  assert.equal(primary(entry).publishedDate, "2026-10-01")
  // ...while the tender document is what carries the qualifications.
  assert.equal(primaryDocument(entry).pdfUrl, DRAFT_LINK)
})

test("either type alone still yields a document to read", () => {
  assert.equal(primaryDocument({ projectNo: "x", draft }).pdfUrl, DRAFT_LINK)
  assert.equal(primaryDocument({ projectNo: "x", invitation }).pdfUrl, INVITE_LINK)
  assert.equal(primary({ projectNo: "x", draft }).publishedDate, "2026-09-25")
})

test("a draft stored before its invitation existed is re-read once it appears", () => {
  // The case this whole pairing exists for: B0 runs one to two weeks ahead of
  // D0, so a TOR first seen as a draft has no closing date, and "known" would
  // otherwise mean it never gets one.
  const stored = { invitationUrl: "", deadline: "" }
  assert.equal(needsInvitation(stored, { projectNo: "x", draft, invitation }), true)
})

test("nothing is re-read when there is no new invitation to read", () => {
  const stored = { invitationUrl: "", deadline: "" }
  // Only a draft in this run — nothing new to learn.
  assert.equal(needsInvitation(stored, { projectNo: "x", draft }), false)
  // Already paired.
  assert.equal(
    needsInvitation({ invitationUrl: INVITE_LINK, deadline: "" }, { projectNo: "x", draft, invitation }),
    false
  )
  // Already has a deadline, so re-reading would buy nothing for a model call.
  assert.equal(
    needsInvitation({ invitationUrl: "", deadline: "2026-10-08T12:00:00+07:00" }, { projectNo: "x", invitation }),
    false
  )
})

test("a newly published invitation is recorded without becoming the TOR's link", () => {
  // The invitation earns its place by carrying the deadline. It is still a
  // file, so it must not become where the "view original" button sends a
  // person — that belongs to the announcement's page on the agency's site.
  const changes = changedFields({ pdfUrl: DRAFT_LINK, invitationUrl: "" }, {
    projectNo: "x",
    draft,
    invitation,
  })
  assert.equal(changes.invitationUrl, INVITE_LINK)
  assert.equal(changes.sourceUrl, undefined)
  assert.equal(changes.pdfUrl, undefined, "the document to extract from has not changed")
})

test("an unchanged announcement reports no changes at all", () => {
  const changes = changedFields(
    { pdfUrl: DRAFT_LINK, invitationUrl: INVITE_LINK },
    { projectNo: "x", draft, invitation }
  )
  assert.deepEqual(changes, {})
})

test("a re-published tender document is picked up without touching the invitation", () => {
  const moved = announcement({ pdfUrl: `${DRAFT_LINK}-v2` })
  const changes = changedFields(
    { pdfUrl: DRAFT_LINK, invitationUrl: INVITE_LINK },
    { projectNo: "x", draft: moved, invitation }
  )
  assert.equal(changes.pdfUrl, `${DRAFT_LINK}-v2`)
  assert.equal(changes.invitationUrl, undefined)
})

test("the link a person is sent to prefers the announcement page over the document", () => {
  // `sourceUrl` answers "where do I go to read this", which is a page on the
  // publishing agency's site. The document link is only a fallback so the
  // button still goes somewhere when no page could be resolved.
  const page = "https://egp2.bangkok.go.th/project-detail/67a7db0a-9f3f-4250-96c9-69c2f6adfb6a"
  assert.equal(sourceUrlFor({ detailUrl: page, pdfUrl: DRAFT_LINK }), page)
  assert.equal(sourceUrlFor({ detailUrl: "", pdfUrl: DRAFT_LINK }), DRAFT_LINK)
  assert.equal(sourceUrlFor({ pdfUrl: DRAFT_LINK }), DRAFT_LINK)
})

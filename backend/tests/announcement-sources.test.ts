import test from "node:test"
import assert from "node:assert/strict"
import {
  documentsToRead,
  groupByProject,
  latestOf,
  linksFor,
  mergeAnnouncementLinks,
  primary,
  sourceUrlFor,
  typesIn,
} from "../src/scraper/announcement-sources"
import { ANNOUNCE_TYPES, type AnnounceType, type EgpAnnouncement } from "../src/scraper/egp-rss"

const DRAFT_LINK = "https://process5.gprocurement.go.th/egp-upload-service/v1/downloadFileTest?fileId=aed4"
const INVITE_LINK = "https://process5.gprocurement.go.th/egp-template-service/dwnt/view-pdf-file?templateId=5fff"
const AMEND_LINK = "https://process5.gprocurement.go.th/egp-template-service/dwnt/view-pdf-file?templateId=6aaa"
const WINNER_LINK = "https://process5.gprocurement.go.th/egp-template-service/dwnt/view-pdf-file?templateId=7bbb"

/** Shaped after the live feed entries for project 69079298848. */
function announcement(overrides: Partial<EgpAnnouncement> = {}): EgpAnnouncement {
  return {
    projectNo: "69079298848",
    title: "ประกวดราคาซื้อยา Empagliflozin ๑๐ mg",
    pdfUrl: DRAFT_LINK,
    methodLabel: "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
    announceLabel: "ร่างเอกสารประกวดราคา (e-Bidding)",
    publishedDate: "2026-09-25",
    isDocument: true,
    ...overrides,
  }
}

const draft = announcement()
const invitation = announcement({
  pdfUrl: INVITE_LINK,
  announceLabel: "ประกาศเชิญชวน",
  publishedDate: "2026-10-01",
})
const amendment = announcement({
  pdfUrl: AMEND_LINK,
  title: "เปลี่ยนแปลงประกาศเชิญชวน ซื้อยา Empagliflozin ๑๐ mg",
  announceLabel: "เปลี่ยนแปลงประกาศเชิญชวน",
  publishedDate: "2026-10-04",
})
const winner = announcement({
  pdfUrl: WINNER_LINK,
  title: "ประกาศผู้ชนะการเสนอราคา ซื้อยา Empagliflozin ๑๐ mg",
  announceLabel: "ประกาศรายชื่อผู้ชนะการเสนอราคา",
  publishedDate: "2026-10-20",
})

function group(entries: [AnnounceType, EgpAnnouncement[]][]) {
  const byType = new Map<AnnounceType, EgpAnnouncement[]>(entries)
  return groupByProject(byType).get("69079298848")!
}

test("every type published for one project lands in the same entry", () => {
  const entry = group([
    [ANNOUNCE_TYPES.draft, [draft]],
    [ANNOUNCE_TYPES.invitation, [invitation]],
    [ANNOUNCE_TYPES.winner, [winner]],
  ])

  assert.equal(entry.all.length, 3)
  assert.deepEqual(
    [...typesIn(entry)].sort(),
    [ANNOUNCE_TYPES.draft, ANNOUNCE_TYPES.invitation, ANNOUNCE_TYPES.winner].sort()
  )
})

test("a winner notice never becomes the project's name", () => {
  const entry = group([
    [ANNOUNCE_TYPES.draft, [draft]],
    [ANNOUNCE_TYPES.winner, [winner]],
  ])

  assert.equal(primary(entry).title, draft.title)
})

test("an amendment supersedes the invitation it changes", () => {
  const entry = group([
    [ANNOUNCE_TYPES.invitation, [invitation]],
    [ANNOUNCE_TYPES.invitationChanged, [amendment]],
  ])

  assert.equal(primary(entry).title, amendment.title)
})

test("the newest of two amendments wins", () => {
  const later = announcement({ pdfUrl: "https://example.test/later.pdf", publishedDate: "2026-10-09" })
  const entry = group([[ANNOUNCE_TYPES.invitationChanged, [amendment, later]]])

  assert.equal(latestOf(entry, ANNOUNCE_TYPES.invitationChanged)?.pdfUrl, "https://example.test/later.pdf")
})

test("the tender is read first, then the notice and its amendment", () => {
  const entry = group([
    [ANNOUNCE_TYPES.draft, [draft]],
    [ANNOUNCE_TYPES.invitation, [invitation]],
    [ANNOUNCE_TYPES.invitationChanged, [amendment]],
  ])

  assert.deepEqual(documentsToRead(entry), [DRAFT_LINK, INVITE_LINK, AMEND_LINK])
})

test("a tender that has aged out of the feed is still read from storage", () => {
  const entry = group([[ANNOUNCE_TYPES.invitation, [invitation]]])

  assert.deepEqual(documentsToRead(entry, { pdfUrl: DRAFT_LINK }), [DRAFT_LINK, INVITE_LINK])
})

test("a notice is never written into pdfUrl, which means the tender", () => {
  const entry = group([[ANNOUNCE_TYPES.invitation, [invitation]]])

  assert.deepEqual(linksFor(entry), { pdfUrl: "", invitationUrl: INVITE_LINK })
  assert.deepEqual(linksFor(entry, { pdfUrl: DRAFT_LINK }), {
    pdfUrl: DRAFT_LINK,
    invitationUrl: INVITE_LINK,
  })
})

test("an amendment outranks the invitation as the notice link", () => {
  const entry = group([
    [ANNOUNCE_TYPES.invitation, [invitation]],
    [ANNOUNCE_TYPES.invitationChanged, [amendment]],
  ])

  assert.equal(linksFor(entry).invitationUrl, AMEND_LINK)
})

test("a second run of the same announcements adds nothing", () => {
  const entry = group([
    [ANNOUNCE_TYPES.draft, [draft]],
    [ANNOUNCE_TYPES.invitation, [invitation]],
  ])

  const first = mergeAnnouncementLinks([], entry)
  assert.equal(first.added.length, 2)

  const second = mergeAnnouncementLinks(first.rows, entry)
  assert.equal(second.added.length, 0)
  assert.equal(second.rows.length, 2)
})

test("a re-published amendment is kept as its own row, not a replacement", () => {
  const first = mergeAnnouncementLinks([], group([[ANNOUNCE_TYPES.invitationChanged, [amendment]]]))
  const reissued = announcement({ pdfUrl: "https://example.test/amend-2.pdf", publishedDate: "2026-10-09" })

  const second = mergeAnnouncementLinks(
    first.rows,
    group([[ANNOUNCE_TYPES.invitationChanged, [reissued]]])
  )

  assert.equal(second.rows.length, 2)
  assert.equal(second.added.length, 1)
  assert.equal(second.added[0].url, "https://example.test/amend-2.pdf")
})

test("sourceUrlFor prefers the agency's page over the file", () => {
  assert.equal(sourceUrlFor({ detailUrl: "https://egp2.bangkok.go.th/project-detail/x", pdfUrl: DRAFT_LINK }),
    "https://egp2.bangkok.go.th/project-detail/x")
  assert.equal(sourceUrlFor({ detailUrl: "", pdfUrl: DRAFT_LINK }), DRAFT_LINK)
  assert.equal(sourceUrlFor({}), "")
})

test("a cancellation published as a portal link is kept, but never read", () => {
  const cancellation = announcement({
    pdfUrl: "http://process.gprocurement.go.th/egp2procmainWeb/jsp/procsearch.sch?proc_id=ShowHTMLFile",
    announceLabel: "ยกเลิกประกาศเชิญชวน",
    isDocument: false,
  })
  const entry = group([
    [ANNOUNCE_TYPES.draft, [draft]],
    [ANNOUNCE_TYPES.invitationCancelled, [cancellation]],
  ])

  // It is in the history a bidder can see...
  assert.equal(mergeAnnouncementLinks([], entry).added.length, 2)
  // ...but it is a web page, so nothing tries to extract from it.
  assert.deepEqual(documentsToRead(entry), [DRAFT_LINK])
})

test("an invitation that is only a portal link does not become the stored link", () => {
  const portalOnly = announcement({
    pdfUrl: "http://process.gprocurement.go.th/egp2procmainWeb/jsp/procsearch.sch?proc_id=x",
    isDocument: false,
  })
  const entry = group([[ANNOUNCE_TYPES.invitation, [portalOnly]]])

  assert.equal(linksFor(entry).invitationUrl, "")
})

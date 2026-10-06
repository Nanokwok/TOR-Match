import test from "node:test"
import assert from "node:assert/strict"
import { planForProject, statusForTypes } from "../src/scraper/announcement-plan"
import { groupByProject, type AnnouncementLink } from "../src/scraper/announcement-sources"
import { ANNOUNCE_TYPES, type AnnounceType, type EgpAnnouncement } from "../src/scraper/egp-rss"

const PROJECT = "69079298848"

function announcement(pdfUrl: string, publishedDate = "2026-10-01"): EgpAnnouncement {
  return {
    projectNo: PROJECT,
    title: "ประกวดราคาจ้างพัฒนาระบบสารสนเทศ",
    pdfUrl,
    methodLabel: "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
    announceLabel: "-",
    publishedDate,
    isDocument: true,
  }
}

function entryOf(...types: [AnnounceType, string][]) {
  const byType = new Map<AnnounceType, EgpAnnouncement[]>()
  for (const [announceType, url] of types) {
    byType.set(announceType, [...(byType.get(announceType) ?? []), announcement(url)])
  }
  return groupByProject(byType).get(PROJECT)!
}

function storedRow(announceType: AnnounceType, url: string): AnnouncementLink {
  return { announceType, announceLabel: "", url, publishedDate: "2026-10-01", title: "" }
}

test("a project nobody has stored, announced only as an invitation, is left alone", () => {
  const action = planForProject({ entry: entryOf([ANNOUNCE_TYPES.invitation, "d0.pdf"]) })

  assert.equal(action.kind, "none")
  assert.match(action.kind === "none" ? action.reason : "", /tender/)
})

test("a winner notice alone never mints a TOR nobody can bid on", () => {
  const action = planForProject({ entry: entryOf([ANNOUNCE_TYPES.winner, "w0.pdf"]) })

  assert.equal(action.kind, "none")
})

test("a new tender document is extracted", () => {
  const action = planForProject({ entry: entryOf([ANNOUNCE_TYPES.draft, "b0.zip"]) })

  assert.equal(action.kind, "extract")
  assert.deepEqual(action.kind === "extract" ? action.urls : [], ["b0.zip"])
})

test("the invitation for a stored project is extracted — only it states the deadline", () => {
  const action = planForProject({
    entry: entryOf([ANNOUNCE_TYPES.invitation, "d0.pdf"]),
    stored: { pdfUrl: "b0.zip", announcements: [storedRow(ANNOUNCE_TYPES.draft, "b0.zip")] },
  })

  assert.equal(action.kind, "extract")
  // The stored tender is read alongside it, or the qualifications would be lost.
  assert.deepEqual(action.kind === "extract" ? action.urls : [], ["b0.zip", "d0.pdf"])
})

test("an amendment is extracted: it can change the budget and the dates", () => {
  const action = planForProject({
    entry: entryOf([ANNOUNCE_TYPES.invitationChanged, "d2.pdf"]),
    stored: { pdfUrl: "b0.zip", announcements: [storedRow(ANNOUNCE_TYPES.draft, "b0.zip")] },
  })

  assert.equal(action.kind, "extract")
  assert.equal(action.kind === "extract" ? action.from : "", ANNOUNCE_TYPES.invitationChanged)
})

test("a cancellation is recorded from its type alone — no document, no model call", () => {
  const action = planForProject({
    entry: entryOf([ANNOUNCE_TYPES.invitationCancelled, "d1.pdf"]),
    stored: { announcements: [storedRow(ANNOUNCE_TYPES.draft, "b0.zip")] },
  })

  assert.deepEqual(action, { kind: "status", status: "cancelled", from: ANNOUNCE_TYPES.invitationCancelled })
})

test("the award, its cancellation and its revision each have their own status", () => {
  const stored = { announcements: [storedRow(ANNOUNCE_TYPES.draft, "b0.zip")] }

  for (const [type, status] of [
    [ANNOUNCE_TYPES.winner, "awarded"],
    [ANNOUNCE_TYPES.winnerCancelled, "winner-cancelled"],
    [ANNOUNCE_TYPES.winnerChanged, "winner-revised"],
  ] as const) {
    const action = planForProject({ entry: entryOf([type, `${type}.pdf`]), stored })
    assert.equal(action.kind === "status" ? action.status : "", status)
  }
})

test("when one run brings both an award and its cancellation, the later wins", () => {
  const action = planForProject({
    entry: entryOf([ANNOUNCE_TYPES.winner, "w0.pdf"], [ANNOUNCE_TYPES.winnerCancelled, "w1.pdf"]),
    stored: { announcements: [storedRow(ANNOUNCE_TYPES.draft, "b0.zip")] },
  })

  assert.equal(action.kind === "status" ? action.status : "", "winner-cancelled")
})

test("an invitation still in the feed does not reopen a cancelled project", () => {
  assert.equal(statusForTypes([ANNOUNCE_TYPES.invitation], "cancelled"), null)
  assert.equal(statusForTypes([ANNOUNCE_TYPES.invitation], "open"), "open")
})

test("the official median price is read only for a project already stored", () => {
  const entry = entryOf([ANNOUNCE_TYPES.medianPrice, "15.pdf"])

  assert.equal(planForProject({ entry }).kind, "none")
  assert.equal(
    planForProject({ entry, stored: { announcements: [storedRow(ANNOUNCE_TYPES.draft, "b0.zip")] } }).kind,
    "median-price"
  )
})

test("a plan announcement is recorded and costs nothing else", () => {
  const action = planForProject({
    entry: entryOf([ANNOUNCE_TYPES.plan, "p0.pdf"]),
    stored: { announcements: [storedRow(ANNOUNCE_TYPES.draft, "b0.zip")] },
  })

  assert.equal(action.kind, "links")
})

test("announcements already stored are not paid for twice", () => {
  const action = planForProject({
    entry: entryOf([ANNOUNCE_TYPES.draft, "b0.zip"]),
    stored: { pdfUrl: "b0.zip", announcements: [storedRow(ANNOUNCE_TYPES.draft, "b0.zip")] },
  })

  assert.deepEqual(action, { kind: "none", reason: "nothing new" })
})

test("--force re-reads a stored project even with nothing new", () => {
  const action = planForProject({
    entry: entryOf([ANNOUNCE_TYPES.draft, "b0.zip"]),
    stored: { pdfUrl: "b0.zip", announcements: [storedRow(ANNOUNCE_TYPES.draft, "b0.zip")] },
    force: true,
  })

  assert.equal(action.kind, "extract")
})

test("a project we have never stored, already awarded, is not paid for", () => {
  // Both announcements are in the same run: the tender we never ingested, and
  // the award that ended it. Extracting it would buy a TOR nobody can bid on,
  // and setting a status would write to a draft that does not exist.
  const action = planForProject({
    entry: entryOf([ANNOUNCE_TYPES.draft, "b0.zip"], [ANNOUNCE_TYPES.winner, "w0.pdf"]),
  })

  assert.equal(action.kind, "none")
})

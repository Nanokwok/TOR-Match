import test from "node:test"
import assert from "node:assert/strict"
import { detailUrlFor, pickProject, type SearchRow } from "../src/scraper/bma-detail-link"

/** Shaped after a real response for project 69099312832. */
const row: SearchRow = {
  projectId: "67a7db0a-9f3f-4250-96c9-69c2f6adfb6a",
  projectNumber: "69099312832",
}

test("a project resolves to its page on the agency's site", () => {
  assert.equal(pickProject([row], "69099312832"), row.projectId)
  assert.equal(
    detailUrlFor(row.projectId!),
    "https://egp2.bangkok.go.th/project-detail/67a7db0a-9f3f-4250-96c9-69c2f6adfb6a"
  )
})

test("the first result is not assumed to be the right project", () => {
  // The endpoint is a free-text search, so a longer number containing ours, or
  // an unrelated project mentioning it, can come back ahead of the real one.
  // Linking a TOR to the wrong announcement would show a bidder the wrong
  // requirements, which is worse than showing them no link.
  const noise: SearchRow[] = [
    { projectId: "aaaaaaaa-0000-0000-0000-000000000000", projectNumber: "690993128321" },
    { projectId: "bbbbbbbb-0000-0000-0000-000000000000", projectNumber: "69099312000" },
    row,
  ]
  assert.equal(pickProject(noise, "69099312832"), row.projectId)
})

test("no match, an empty result, or a row missing its id resolves to nothing", () => {
  // Three of the stored announcements genuinely return totalCount 0 — they are
  // not on this site at all, and the caller falls back to the document link.
  assert.equal(pickProject([], "69099242843"), null)
  assert.equal(pickProject([row], "69099242843"), null)
  assert.equal(pickProject([{ projectNumber: "69099312832" }], "69099312832"), null)
  assert.equal(pickProject([{ projectId: "  ", projectNumber: "69099312832" }], "69099312832"), null)
})

test("surrounding whitespace does not stop a project matching", () => {
  assert.equal(pickProject([{ ...row, projectNumber: " 69099312832 " }], "69099312832"), row.projectId)
  assert.equal(pickProject([row], " 69099312832 "), row.projectId)
})

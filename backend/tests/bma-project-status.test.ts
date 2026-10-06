import test from "node:test"
import assert from "node:assert/strict"
import { statusFromDetail } from "../src/scraper/bma-project-status"

test("the site's cancellation is read as cancelled", () => {
  const report = statusFromDetail({
    masterContractAvailableCode: "S5",
    masterContractAvailableName: "ยกเลิกโครงการ",
  })

  assert.equal(report.status, "cancelled")
  assert.equal(report.label, "ยกเลิกโครงการ")
})

test('"in progress" says nothing we did not already know', () => {
  // S1 covers everything from a draft tender to a signed contract, so reading
  // a status off it would lose what the feed told us.
  const report = statusFromDetail({
    masterContractAvailableCode: "S1",
    masterContractAvailableName: "ระหว่างดำเนินการ",
  })

  assert.equal(report.status, null)
  assert.equal(report.code, "S1")
})

test("an unknown code is reported rather than guessed at", () => {
  const report = statusFromDetail({
    masterContractAvailableCode: "S9",
    masterContractAvailableName: "สถานะที่ยังไม่เคยเห็น",
  })

  assert.equal(report.status, null)
  assert.equal(report.label, "สถานะที่ยังไม่เคยเห็น")
})

test("a response with no status at all is handled", () => {
  assert.deepEqual(statusFromDetail({}), { code: "", label: "", status: null })
})

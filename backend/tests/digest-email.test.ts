import test from "node:test"
import assert from "node:assert/strict"
import { renderDailyDigest, renderWeeklySummary, type DigestTor } from "../src/domain/digest-email"

const tor = (n: number, overrides: Partial<DigestTor> = {}): DigestTor => ({
  id: `id${n}`,
  titleTh: `โครงการ ${n}`,
  titleEn: `Project ${n}`,
  department: "BMA",
  budgetBaht: 1_500_000,
  deadline: "20 Oct 2026, 12:00",
  ...overrides,
})

test("the daily digest counts and lists the TORs with links into the app", () => {
  const mail = renderDailyDigest([tor(1), tor(2)], "http://localhost:3000/")
  assert.ok(mail.subject.includes("2"))
  assert.ok(mail.text.includes("Project 1") && mail.text.includes("Project 2"))
  assert.ok(mail.text.includes("http://localhost:3000/browse?tor=id1"))
  assert.ok(mail.html.includes("฿1,500,000"))
})

test("a long list is cut and says how many were left out", () => {
  const mail = renderDailyDigest(Array.from({ length: 15 }, (_, i) => tor(i)), "http://x")
  assert.ok(mail.text.includes("อีก 3 รายการ"))
  assert.ok(!mail.text.includes("Project 14"))
})

test("scraped text is escaped in the HTML", () => {
  const mail = renderDailyDigest([tor(1, { titleEn: "<script>x</script>" })], "http://x")
  assert.ok(!mail.html.includes("<script>"))
  assert.ok(mail.html.includes("&lt;script&gt;"))
})

test("the weekly summary shows the board, what closes soon and new matches", () => {
  const mail = renderWeeklySummary(
    { columns: { bookmark: 3, "in-progress": 1, done: 0 }, closingSoon: [tor(7)], newMatches: 4 },
    "http://x"
  )
  assert.ok(mail.text.includes("4"))
  assert.ok(mail.text.includes("Bookmarked 3"))
  assert.ok(mail.text.includes("In progress 1"))
  assert.ok(!mail.text.includes("Done 0"))
  assert.ok(mail.text.includes("Project 7"))
})

test("the weekly summary leaves out the closing-soon section when nothing closes", () => {
  const mail = renderWeeklySummary({ columns: { todo: 2 }, closingSoon: [], newMatches: 0 }, "http://x")
  assert.ok(!mail.text.includes("Closing within 7 days"))
})

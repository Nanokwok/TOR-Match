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

const noTeam = { checklistDone: 0, checklistTotal: 0, highPriorityOpen: 0, unassigned: 0, assignees: [] }

test("the weekly summary shows the board, what closes soon and new matches", () => {
  const mail = renderWeeklySummary(
    { columns: { bookmark: 3, "in-progress": 1, done: 0 }, closingSoon: [tor(7)], newMatches: 4, team: noTeam },
    "http://x"
  )
  assert.ok(mail.text.includes("4"))
  assert.ok(mail.text.includes("Bookmarked 3"))
  assert.ok(mail.text.includes("In progress 1"))
  assert.ok(!mail.text.includes("Done 0"))
  assert.ok(mail.text.includes("Project 7"))
})

test("the weekly summary leaves out the closing-soon section when nothing closes", () => {
  const mail = renderWeeklySummary({ columns: { todo: 2 }, closingSoon: [], newMatches: 0, team: noTeam }, "http://x")
  assert.ok(!mail.text.includes("Closing within 7 days"))
})

test("the weekly summary reports team progress: checklist, high priority, unassigned and who has what", () => {
  const mail = renderWeeklySummary(
    {
      columns: { todo: 4 },
      closingSoon: [],
      newMatches: 0,
      team: {
        checklistDone: 3,
        checklistTotal: 8,
        highPriorityOpen: 2,
        unassigned: 1,
        assignees: [
          { name: "Mali", cards: 3 },
          { name: "Somchai", cards: 1 },
        ],
      },
    },
    "http://x"
  )
  assert.ok(mail.text.includes("Checklist items done: 3 of 8"))
  assert.ok(mail.text.includes("High-priority cards still open: 2"))
  assert.ok(mail.text.includes("Cards with nobody assigned: 1"))
  assert.ok(mail.text.includes("Mali: 3 cards"))
  assert.ok(mail.text.includes("Somchai: 1 card"))
  assert.ok(!mail.text.includes("Somchai: 1 cards"))
})

test("a team with nothing to report adds no team section", () => {
  const mail = renderWeeklySummary({ columns: { todo: 1 }, closingSoon: [], newMatches: 1, team: noTeam }, "http://x")
  assert.ok(!mail.text.includes("Team status"))
})

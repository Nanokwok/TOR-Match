import test from "node:test"
import assert from "node:assert/strict"

import {
  mergeAndSortActivities,
  toCompanyActivity,
  toDraftActivity,
} from "../src/controllers/admin-overview.controller"

test("toDraftActivity correctly labels auto-approved, approved, and need-review drafts", () => {
  const autoApproved = toDraftActivity({
    _id: "123",
    announcementNo: "ANN-001",
    title: { en: "Test project", th: "โครงการทดสอบ" },
    aiConfidence: 95,
    reviewStatus: "auto-approved",
    createdAt: new Date("2026-11-01T10:00:00Z"),
  })
  assert.equal(autoApproved.type, "review")
  assert.equal(autoApproved.title, "TOR auto-approved")
  assert.match(autoApproved.detail, /ANN-001/)
  assert.match(autoApproved.detail, /95%/)

  const needReview = toDraftActivity({
    _id: "456",
    announcementNo: "ANN-002",
    title: { en: "Low confidence TOR", th: "TOR ความมั่นใจต่ำ" },
    aiConfidence: 62,
    reviewStatus: "need-review",
    createdAt: new Date("2026-11-02T10:00:00Z"),
  })
  assert.equal(needReview.title, "TOR marked Need Review")
  assert.match(needReview.detail, /62%/)

  const approved = toDraftActivity({
    _id: "789",
    announcementNo: "ANN-003",
    title: { en: "Manually approved TOR", th: "" },
    aiConfidence: 80,
    reviewStatus: "approved",
    publishedAt: new Date("2026-11-03T10:00:00Z"),
  })
  assert.equal(approved.title, "TOR approved")
})

test("toCompanyActivity distinguishes pending signups from active companies", () => {
  const pending = toCompanyActivity({
    _id: "c1",
    companyNameEnglish: "Tech Corp",
    status: "pending",
    createdAt: new Date("2026-11-01T08:00:00Z"),
  })
  assert.equal(pending.type, "company")
  assert.equal(pending.title, "New company signup")
  assert.match(pending.detail, /awaiting approval/)

  const active = toCompanyActivity({
    _id: "c2",
    companyNameThai: "บริษัท นวัตกรรม จำกัด",
    status: "active",
    createdAt: new Date("2026-11-02T08:00:00Z"),
  })
  assert.equal(active.title, "Company registered")
  assert.match(active.detail, /active/)
})

test("mergeAndSortActivities sorts events newest first and limits result count", () => {
  const drafts = [
    {
      id: "d1",
      type: "review" as const,
      title: "Draft 1",
      detail: "Detail",
      at: "2026-11-01T12:00:00Z",
    },
    {
      id: "d2",
      type: "review" as const,
      title: "Draft 2",
      detail: "Detail",
      at: "2026-11-03T12:00:00Z",
    },
  ]
  const companies = [
    {
      id: "c1",
      type: "company" as const,
      title: "Company 1",
      detail: "Detail",
      at: "2026-11-02T12:00:00Z",
    },
    {
      id: "c2",
      type: "company" as const,
      title: "Company 2",
      detail: "Detail",
      at: "2026-11-04T12:00:00Z",
    },
  ]

  const merged = mergeAndSortActivities(drafts, companies, 3)
  assert.equal(merged.length, 3)
  assert.equal(merged[0].id, "c2") // Nov 4
  assert.equal(merged[1].id, "d2") // Nov 3
  assert.equal(merged[2].id, "c1") // Nov 2
})

export type OverviewActivityType =
  | "ocr"
  | "review"
  | "company"
  | "subscription"

export type OverviewActivity = {
  id: string
  type: OverviewActivityType
  title: string
  detail: string
  at: string
}

export const overviewStats = {
  activeCompanies: "104",
  torsNeedReview: "18",
  ocrPending: "14",
  // mrr: "฿248,000",
} as const

export const overviewTrend = [
  { label: "Mon", tors: 12, matches: 34 },
  { label: "Tue", tors: 18, matches: 41 },
  { label: "Wed", tors: 15, matches: 38 },
  { label: "Thu", tors: 22, matches: 52 },
  { label: "Fri", tors: 19, matches: 47 },
  { label: "Sat", tors: 8, matches: 21 },
  { label: "Sun", tors: 6, matches: 16 },
] as const

export const overviewQueue = [
  { label: "OCR queue", value: 14, href: "/admin/scraper-ocr" },
  { label: "Need TOR review", value: 18, href: "/admin/tor-review" },
  { label: "Pending companies", value: 11, href: "/admin/companies" },
  // { label: "Past-due invoices", value: 3, href: "/admin/subscriptions" },
] as const

export const overviewActivity: OverviewActivity[] = [
  {
    id: "act-1",
    type: "ocr",
    title: "OCR job 0341 failed",
    detail: "BMA-PW-69-07-2210.pdf — parse error on page 12",
    at: "2026-08-11T09:42:00+07:00",
  },
  {
    id: "act-2",
    type: "review",
    title: "TOR auto-approved",
    detail: "BMA-DED-69-08-0110 · AI confidence 94%",
    at: "2026-08-11T09:18:00+07:00",
  },
  {
    id: "act-3",
    type: "company",
    title: "New company signup",
    detail: "Pixel Lab Co., Ltd. awaiting approval",
    at: "2026-08-11T08:55:00+07:00",
  },
  // {
  //   id: "act-4",
  //   type: "subscription",
  //   title: "Plan upgraded to Pro",
  //   detail: "CloudBridge Co., Ltd.",
  //   at: "2026-08-11T08:10:00+07:00",
  // },
  {
    id: "act-5",
    type: "review",
    title: "TOR marked Need Review",
    detail: "BMA-SED-69-08-0142 · AI confidence 72%",
    at: "2026-08-10T17:30:00+07:00",
  },
]

import type { TorStepCode } from "@/types/tor"

/**
 * What each e-GP announcement type is called, and what its document is.
 *
 * Shared by the real timeline (lib/tor-timeline.ts), which builds the stepper
 * from the announcements the ingest stored, and by the mock rows that still
 * back the sample data — so the two cannot label the same announcement
 * differently.
 */
export const STEP_METADATA: Record<
  TorStepCode,
  {
    code: TorStepCode
    title: { th: string; en: string }
    docTitle: { th: string; en: string }
    description: { th: string; en: string }
    defaultDocPrefix: string
    branchType?: "none" | "amendment" | "cancellation"
    branchFrom?: "D0" | "W0"
  }
> = {
  P0: {
    code: "P0",
    title: { th: "แผนงาน", en: "Procurement Plan" },
    docTitle: {
      th: "ประกาศแผนการจัดซื้อจัดจ้างประจำปี",
      en: "Annual Procurement Plan Announcement",
    },
    description: {
      th: "ประกาศแผนการจัดซื้อจัดจ้างประจำปีของหน่วยงาน",
      en: "Annual Procurement Plan Announcement",
    },
    defaultDocPrefix: "Procurement_Plan",
  },
  "15": {
    code: "15",
    title: { th: "ราคากลาง", en: "Median Price" },
    docTitle: {
      th: "ตารางแสดงวงเงินงบประมาณและราคากลาง (บก.01)",
      en: "Median Price Calculation Form (Bor.Kor.01)",
    },
    description: {
      th: "เผยแพร่ตารางแสดงวงเงินงบประมาณและราคากลาง (บก.01)",
      en: "Median Price Calculation & Budget Approval (Bor.Kor.01)",
    },
    defaultDocPrefix: "Median_Price",
  },
  B0: {
    code: "B0",
    title: { th: "ร่าง TOR", en: "Draft TOR" },
    docTitle: {
      th: "ร่างประกาศและร่างเอกสารประกวดราคา (TOR)",
      en: "Draft Terms of Reference & Public Hearing Document",
    },
    description: {
      th: "เผยแพร่ร่างเอกสารประกวดราคาและรับฟังคำวิจารณ์/ข้อเสนอแนะ",
      en: "Draft Terms of Reference & Public Hearing for Comments",
    },
    defaultDocPrefix: "Draft_TOR",
  },
  D0: {
    code: "D0",
    title: { th: "ประกาศเชิญชวน", en: "Tender Announcement" },
    docTitle: {
      th: "ประกาศเชิญชวนประกวดราคาอิเล็กทรอนิกส์",
      en: "Electronic Bidding Tender Announcement & Specifications",
    },
    description: {
      th: "ประกาศเชิญชวนประกวดราคาอิเล็กทรอนิกส์และเปิดรับซองข้อเสนอ",
      en: "Electronic Bidding Tender Announcement & Proposal Submission",
    },
    defaultDocPrefix: "Tender_Notice",
  },
  D2: {
    code: "D2",
    title: { th: "แก้ไขประกาศเชิญชวน", en: "Tender Amendment" },
    docTitle: {
      th: "ประกาศแก้ไขเปลี่ยนแปลงเงื่อนไขหรือขยายเวลายื่นข้อเสนอ",
      en: "Amendment to Tender Notice & Deadline Extension",
    },
    description: {
      th: "ประกาศแก้ไขเปลี่ยนแปลงเงื่อนไขหรือขยายเวลายื่นข้อเสนอ",
      en: "Amendment to Tender Notice & Deadline Extension",
    },
    defaultDocPrefix: "Tender_Amendment",
    branchType: "amendment",
    branchFrom: "D0",
  },
  D1: {
    code: "D1",
    title: { th: "ยกเลิกประกาศเชิญชวน", en: "Tender Cancellation" },
    docTitle: {
      th: "ประกาศยกเลิกการประกวดราคาอิเล็กทรอนิกส์",
      en: "Cancellation of Tender Announcement",
    },
    description: {
      th: "ประกาศยกเลิกการประกวดราคาอิเล็กทรอนิกส์",
      en: "Cancellation of Tender Announcement",
    },
    defaultDocPrefix: "Tender_Cancellation",
    branchType: "cancellation",
    branchFrom: "D0",
  },
  W0: {
    code: "W0",
    title: { th: "ประกาศผู้ชนะ", en: "Winner Announcement" },
    docTitle: {
      th: "ประกาศผลผู้ชนะการเสนอราคาอย่างเป็นทางการ",
      en: "Official Announcement of Winning Bidder",
    },
    description: {
      th: "ประกาศผลผู้ชนะการเสนอราคาหรือผู้ได้รับการคัดเลือกอย่างเป็นทางการ",
      en: "Official Announcement of Winning Bidder / Award of Contract",
    },
    defaultDocPrefix: "Winner_Award",
  },
  W2: {
    code: "W2",
    title: { th: "แก้ไขประกาศผู้ชนะ", en: "Award Amendment" },
    docTitle: {
      th: "ประกาศแก้ไขเปลี่ยนแปลงผลการพิจารณาผู้ชนะ",
      en: "Amendment to Winning Bidder Announcement",
    },
    description: {
      th: "ประกาศแก้ไขเปลี่ยนแปลงผลการพิจารณาผู้ชนะการเสนอราคา",
      en: "Amendment to Winning Bidder Announcement",
    },
    defaultDocPrefix: "Award_Amendment",
    branchType: "amendment",
    branchFrom: "W0",
  },
  W1: {
    code: "W1",
    title: { th: "ยกเลิกประกาศผู้ชนะ", en: "Award Cancellation" },
    docTitle: {
      th: "ประกาศยกเลิกผลการคัดเลือกผู้ชนะการเสนอราคา",
      en: "Cancellation of Winning Bidder Award",
    },
    description: {
      th: "ประกาศยกเลิกผลการคัดเลือกผู้ชนะการเสนอราคา",
      en: "Cancellation of Winning Bidder Award",
    },
    defaultDocPrefix: "Award_Cancellation",
    branchType: "cancellation",
    branchFrom: "W0",
  },
}

/** Standard sequential main trunk order */
export const MAIN_STEP_CODES: TorStepCode[] = ["P0", "15", "B0", "D0", "W0"]


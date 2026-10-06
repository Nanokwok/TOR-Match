import type {
  TorStepCode,
  TorStepStatus,
  TorTimeline,
  TorTimelineStep,
} from "@/types/tor"

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

type TorTimelineInput = {
  id: string
  announcementNo?: string
  status?: string
  deadline?: string
  announcementDate?: string
}

export function buildTorTimeline(input: TorTimelineInput): TorTimeline {
  const { id, announcementNo = "BMA-69-0001", deadline } = input
  const safeNo = announcementNo.replace(/[^a-zA-Z0-9-_]/g, "_")

  let currentStepCode: TorStepCode = "B0"
  let branchActive: TorStepCode | null = null

  if (id === "tor-001") {
    // Specifically mandated example: Tor1 is in B0 step (latest file is B0)
    currentStepCode = "B0"
  } else if (id === "tor-002" || id === "tor-009" || id === "tor-012") {
    currentStepCode = "D0"
  } else if (id === "tor-003" || id === "tor-013") {
    currentStepCode = "D0"
    branchActive = "D2"
  } else if (id === "tor-004" || id === "tor-010") {
    currentStepCode = "15"
  } else if (id === "tor-005" || id === "tor-014") {
    currentStepCode = "W0"
  } else if (id === "tor-006") {
    currentStepCode = "D0"
    branchActive = "D1"
  } else if (id === "tor-007") {
    currentStepCode = "W0"
    branchActive = "W2"
  } else if (id === "tor-008") {
    currentStepCode = "W0"
    branchActive = "W1"
  } else {
    if (input.status === "draft") {
      currentStepCode = "B0"
    } else if (input.status === "open" || input.status === "closing-soon") {
      currentStepCode = "D0"
    } else if (input.status === "awarded" || input.status === "closed") {
      currentStepCode = "W0"
    } else {
      currentStepCode = "B0"
    }
  }

  // Calculate days remaining for the active step
  const daysRemaining = (() => {
    if (deadline) {
      const parsed = new Date(deadline).getTime()
      if (!Number.isNaN(parsed)) {
        const diffDays = Math.ceil((parsed - Date.now()) / (1000 * 60 * 60 * 24))
        return Math.max(1, diffDays)
      }
    }
    if (id === "tor-001") return 14
    if (currentStepCode === "B0") return 14
    if (currentStepCode === "15") return 5
    if (currentStepCode === "D0") return 7
    if (branchActive === "D2") return 12
    return null
  })()

  const currentIndex = MAIN_STEP_CODES.indexOf(currentStepCode)

  const steps: TorTimelineStep[] = []

  const getFileSize = (code: TorStepCode) => {
    switch (code) {
      case "P0":
        return "1.2 MB"
      case "15":
        return "850 KB"
      case "B0":
        return "3.4 MB"
      case "D0":
        return "4.1 MB"
      case "D2":
        return "1.8 MB"
      case "D1":
        return "920 KB"
      case "W0":
        return "1.5 MB"
      case "W2":
        return "1.1 MB"
      case "W1":
        return "880 KB"
      default:
        return "2.0 MB"
    }
  }

  for (let i = 0; i < MAIN_STEP_CODES.length; i++) {
    const code = MAIN_STEP_CODES[i]
    const meta = STEP_METADATA[code]

    let status: TorStepStatus = "upcoming"
    let stepDays: number | null = null
    let stepDeadline: string | undefined

    if (i < currentIndex) {
      status = "completed"
    } else if (i === currentIndex) {
      if (branchActive) {
        status = branchActive === "D1" || branchActive === "W1" ? "cancelled" : "amended"
      } else {
        status = "current"
        stepDays = daysRemaining
        stepDeadline = deadline ?? "2026-10-20T16:30:00+07:00"
      }
    } else {
      status = "upcoming"
    }

    const stepDate = (() => {
      if (code === "P0") return "2026-08-15"
      if (code === "15") return "2026-09-02"
      if (code === "B0") return "2026-09-20"
      if (code === "D0") return "2026-10-01"
      if (code === "W0") return "2026-11-15"
      return undefined
    })()

    const hasDocument = i <= currentIndex
    const fileName = `${meta.defaultDocPrefix}_${safeNo}.pdf`

    const mainStep: TorTimelineStep = {
      code,
      title: meta.title,
      status,
      date: hasDocument ? stepDate : undefined,
      deadline: stepDeadline,
      daysRemaining: stepDays,
      description: meta.description,
      branchType: "none",
      document: hasDocument
        ? {
            id: `doc-${id}-${code}`,
            fileName,
            name: meta.docTitle,
            fileSize: getFileSize(code),
            fileUrl: `/api/mock-document/${encodeURIComponent(id)}/${code}`,
            publishDate: stepDate,
            docType: "pdf",
          }
        : undefined,
    }

    steps.push(mainStep)

    // Branching under D0
    if (code === "D0") {
      if (branchActive === "D2") {
        const d2Meta = STEP_METADATA.D2
        steps.push({
          code: "D2",
          title: d2Meta.title,
          status: "current",
          date: "2026-10-08",
          deadline: "2026-10-28T16:30:00+07:00",
          daysRemaining: daysRemaining ?? 12,
          description: d2Meta.description,
          branchType: "amendment",
          branchFrom: "D0",
          document: {
            id: `doc-${id}-D2`,
            fileName: `Amendment_Notice_${safeNo}.pdf`,
            name: d2Meta.docTitle,
            fileSize: getFileSize("D2"),
            fileUrl: `/api/mock-document/${encodeURIComponent(id)}/D2`,
            publishDate: "2026-10-08",
            docType: "pdf",
          },
        })
      } else if (branchActive === "D1") {
        const d1Meta = STEP_METADATA.D1
        steps.push({
          code: "D1",
          title: d1Meta.title,
          status: "cancelled",
          date: "2026-10-05",
          daysRemaining: null,
          description: d1Meta.description,
          branchType: "cancellation",
          branchFrom: "D0",
          document: {
            id: `doc-${id}-D1`,
            fileName: `Cancellation_Notice_${safeNo}.pdf`,
            name: d1Meta.docTitle,
            fileSize: getFileSize("D1"),
            fileUrl: `/api/mock-document/${encodeURIComponent(id)}/D1`,
            publishDate: "2026-10-05",
            docType: "pdf",
          },
        })
      }
    }

    // Branching under W0
    if (code === "W0") {
      if (branchActive === "W2") {
        const w2Meta = STEP_METADATA.W2
        steps.push({
          code: "W2",
          title: w2Meta.title,
          status: "current",
          date: "2026-11-20",
          daysRemaining: null,
          description: w2Meta.description,
          branchType: "amendment",
          branchFrom: "W0",
          document: {
            id: `doc-${id}-W2`,
            fileName: `Award_Amendment_${safeNo}.pdf`,
            name: w2Meta.docTitle,
            fileSize: getFileSize("W2"),
            fileUrl: `/api/mock-document/${encodeURIComponent(id)}/W2`,
            publishDate: "2026-11-20",
            docType: "pdf",
          },
        })
      } else if (branchActive === "W1") {
        const w1Meta = STEP_METADATA.W1
        steps.push({
          code: "W1",
          title: w1Meta.title,
          status: "cancelled",
          date: "2026-11-18",
          daysRemaining: null,
          description: w1Meta.description,
          branchType: "cancellation",
          branchFrom: "W0",
          document: {
            id: `doc-${id}-W1`,
            fileName: `Award_Cancellation_${safeNo}.pdf`,
            name: w1Meta.docTitle,
            fileSize: getFileSize("W1"),
            fileUrl: `/api/mock-document/${encodeURIComponent(id)}/W1`,
            publishDate: "2026-11-18",
            docType: "pdf",
          },
        })
      }
    }
  }

  const effectiveCurrentCode = branchActive ?? currentStepCode
  const latestStep = steps.find((s) => s.code === effectiveCurrentCode)
  const latestFileName = latestStep?.document?.fileName ?? `Draft_TOR_${safeNo}.pdf`

  return {
    currentStepCode: effectiveCurrentCode,
    latestFileName,
    steps,
  }
}

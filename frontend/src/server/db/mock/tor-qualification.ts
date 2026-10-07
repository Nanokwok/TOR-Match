import type {
  Tor,
  TorQualificationCheck,
  TorQualificationRow,
  QualificationStatus,
} from "@/types/tor"

export function buildMockQualificationCheck(tor: Tor): TorQualificationCheck {
  const rows: TorQualificationRow[] = tor.qualificationRequirements.map((req, idx) => {
    const isAuto = req.autoCheckable
    const status: QualificationStatus = isAuto ? "passed" : "manual-review"

    return {
      requirementId: req.id,
      key: req.key ?? "manual",
      keyLabel: req.requirement,
      requirement: req.requirement,
      torCriteria: req.torCriteria,
      companyValue: isAuto ? "Verified / ตรงตามเกณฑ์" : null,
      passed: isAuto ? true : null,
      status,
      reason: {
        th: isAuto ? "ตรงตามเกณฑ์ที่กำหนดใน TOR" : "ต้องให้ผู้เสนอราคาตรวจสอบและยืนยันด้วยตนเอง",
        en: isAuto ? "Meets specified TOR criteria" : "Requires bidder self-verification",
      },
      autoCheckable: isAuto,
      selfCheckable: !isAuto,
      selfCheckAnswer: !isAuto ? true : null,
      selfCheckStale: false,
      criteriaFingerprint: `fp-${tor.id}-${req.id}-${idx}`,
      profileField: null,
    }
  })

  return {
    profileSetup: true,
    eligible: true,
    readyToBid: true,
    status: "passed",
    requiresManualReview: rows.some((r) => r.status === "manual-review"),
    missingProfileFields: 0,
    evaluatedAt: new Date().toISOString(),
    rows,
  }
}

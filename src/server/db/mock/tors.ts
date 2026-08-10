import type { CompanyProfile, Tor } from "@/types/tor"

function milestonesForBudget(totalBudgetBaht: number) {
  const schedule = [
    {
      day: 30,
      milestoneNumber: 1,
      percent: 15,
      deliverable:
        "Project Charter & System Architecture Specification delivery",
    },
    {
      day: 90,
      milestoneNumber: 2,
      percent: 35,
      deliverable:
        "OCR Extraction System, Database Schema, and Frontend UI/UX delivery",
    },
    {
      day: 120,
      milestoneNumber: 3,
      percent: 30,
      deliverable: "API Development and Integration Testing",
    },
    {
      day: 150,
      milestoneNumber: 4,
      percent: 20,
      deliverable: "Final System Testing and User Acceptance Testing (UAT)",
    },
    {
      day: 180,
      milestoneNumber: 5,
      percent: 10,
      deliverable: "Project Handover and Documentation Completion",
    },
  ] as const

  return schedule.map((item) => ({
    ...item,
    amountBaht: Math.round((totalBudgetBaht * item.percent) / 100),
  }))
}

function defaultQualifications(
  minCapital: number,
  pastContractMin: number
): Tor["qualificationRequirements"] {
  return [
    {
      id: "registered-capital",
      requirement: "Registered Capital",
      torCriteria: `≥ ${minCapital.toLocaleString("en-US")} THB`,
    },
    {
      id: "past-performance",
      requirement: "Past Performance",
      torCriteria: `Web App Contract ≥ ${pastContractMin.toLocaleString("en-US")} THB`,
    },
    {
      id: "certifications",
      requirement: "Certifications",
      torCriteria: "ISO/IEC 29110 or CMMI Level 2+",
    },
    {
      id: "deal-breaker",
      requirement: "Deal-Breaker Clauses",
      torCriteria: "Must be registered e-GP Vendor",
    },
  ]
}

/**
 * Mock TOR dataset. Swap this function's body (or replace callers)
 * when wiring a real database / API.
 */
export function getMockTors(): Tor[] {
  return [
    {
      id: "tor-001",
      announcementNo: "BMA-SED-69-08-0142",
      title:
        "BMA Procurement & Budget Tracking Information System Development (BMA Procurement Tracker)",
      department: "Strategy and Evaluation Department",
      budgetBaht: 4_500_000,
      projectScale: "MEDIUM",
      durationDays: 180,
      durationLabel: "180 Days (6 Months)",
      method: "e-bidding",
      status: "open",
      eligible: true,
      bookmarked: false,
      deadline: "2026-08-20T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Develop a web application for BMA procurement & budget tracking, including an OCR system for PDF invoices, a real-time analytics dashboard, and a data pipeline for automatic budget reconciliation.",
      deliverables: [
        "PDF Parsing & OCR System",
        "Real-time Analytics Dashboard",
        "Automated Budget Reconciliation Pipeline",
        "Role-based Access Control Module",
        "Admin & Reporting Portal",
      ],
      techTags: ["React", "OCR", "Dashboard", "Data Pipeline", "API"],
      listTags: ["e-bidding", "MEDIUM"],
      financials: {
        totalBudgetBaht: 4_500_000,
        medianPriceBaht: 4_450_000,
        method: "e-bidding",
        milestones: milestonesForBudget(4_500_000),
      },
      qualificationRequirements: defaultQualifications(2_000_000, 1_500_000),
    },
    {
      id: "tor-002",
      announcementNo: "BMA-ITD-69-07-0098",
      title:
        "Smart City Traffic Analytics Platform for Bangkok Metropolitan Area",
      department: "Traffic and Transportation Department",
      budgetBaht: 12_800_000,
      projectScale: "LARGE",
      durationDays: 365,
      durationLabel: "365 Days (12 Months)",
      method: "e-bidding",
      status: "open",
      eligible: true,
      bookmarked: true,
      deadline: "2026-09-05T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Build a city-wide traffic analytics platform that ingests IoT sensor data, predicts congestion, and provides operational dashboards for district offices.",
      deliverables: [
        "IoT Data Ingestion Layer",
        "Congestion Prediction Models",
        "District Operations Dashboard",
        "Alert & Notification Service",
        "Public Open Data API",
      ],
      techTags: ["Python", "IoT", "ML", "Dashboard", "API"],
      listTags: ["e-bidding", "LARGE"],
      financials: {
        totalBudgetBaht: 12_800_000,
        medianPriceBaht: 12_100_000,
        method: "e-bidding",
        milestones: milestonesForBudget(12_800_000),
      },
      qualificationRequirements: defaultQualifications(5_000_000, 3_000_000),
    },
    {
      id: "tor-003",
      announcementNo: "BMA-PHD-69-08-0211",
      title: "Digital Health Records Integration System for BMA Hospitals",
      department: "Public Health Department",
      budgetBaht: 8_200_000,
      projectScale: "LARGE",
      durationDays: 270,
      durationLabel: "270 Days (9 Months)",
      method: "selective",
      status: "closing-soon",
      eligible: false,
      bookmarked: false,
      deadline: "2026-08-15T12:00:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Integrate fragmented hospital record systems into a unified digital health platform with HL7/FHIR interoperability and secure patient consent workflows.",
      deliverables: [
        "FHIR Integration Gateway",
        "Unified Patient Index",
        "Consent Management Module",
        "Clinical Viewer UI",
        "Audit & Compliance Reporting",
      ],
      techTags: ["FHIR", "HL7", "Java", "React", "Security"],
      listTags: ["selective", "LARGE"],
      financials: {
        totalBudgetBaht: 8_200_000,
        medianPriceBaht: 7_950_000,
        method: "selective",
        milestones: milestonesForBudget(8_200_000),
      },
      qualificationRequirements: defaultQualifications(4_000_000, 2_500_000),
    },
    {
      id: "tor-004",
      announcementNo: "BMA-EDD-69-06-0044",
      title: "E-Learning Content Management System for BMA Schools",
      department: "Education Department",
      budgetBaht: 2_100_000,
      projectScale: "SMALL",
      durationDays: 120,
      durationLabel: "120 Days (4 Months)",
      method: "e-market",
      status: "open",
      eligible: true,
      bookmarked: false,
      deadline: "2026-08-28T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Deliver a lightweight CMS for teachers to publish, version, and distribute digital learning materials across BMA schools.",
      deliverables: [
        "Content Authoring Workspace",
        "Media Asset Library",
        "School Distribution Portal",
        "Usage Analytics Reports",
      ],
      techTags: ["Next.js", "CMS", "S3", "Analytics"],
      listTags: ["e-market", "SMALL"],
      financials: {
        totalBudgetBaht: 2_100_000,
        medianPriceBaht: 2_050_000,
        method: "e-market",
        milestones: milestonesForBudget(2_100_000).slice(0, 4),
      },
      qualificationRequirements: defaultQualifications(1_000_000, 800_000),
    },
    {
      id: "tor-005",
      announcementNo: "BMA-ENV-69-08-0177",
      title: "Environmental Sensor Dashboard & Alert System",
      department: "Environment Department",
      budgetBaht: 3_650_000,
      projectScale: "MEDIUM",
      durationDays: 150,
      durationLabel: "150 Days (5 Months)",
      method: "e-bidding",
      status: "open",
      eligible: true,
      bookmarked: false,
      deadline: "2026-09-12T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Create a real-time dashboard for air and water quality sensors with threshold-based LINE and email alerts for district officers.",
      deliverables: [
        "Sensor Ingestion API",
        "Realtime Dashboard",
        "Threshold Alert Engine",
        "LINE Notify Integration",
      ],
      techTags: ["React", "WebSocket", "LINE", "API", "Maps"],
      listTags: ["e-bidding", "MEDIUM"],
      financials: {
        totalBudgetBaht: 3_650_000,
        medianPriceBaht: 3_500_000,
        method: "e-bidding",
        milestones: milestonesForBudget(3_650_000),
      },
      qualificationRequirements: defaultQualifications(1_500_000, 1_000_000),
    },
    {
      id: "tor-006",
      announcementNo: "BMA-FIN-69-05-0031",
      title: "Municipal Tax Payment Mobile Application Redesign",
      department: "Finance Department",
      budgetBaht: 5_900_000,
      projectScale: "MEDIUM",
      durationDays: 210,
      durationLabel: "210 Days (7 Months)",
      method: "e-bidding",
      status: "closed",
      eligible: false,
      bookmarked: false,
      deadline: "2026-07-01T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Redesign the municipal tax payment mobile app with improved UX, multi-bank payment rails, and receipt OCR verification.",
      deliverables: [
        "Mobile App Redesign (iOS/Android)",
        "Payment Gateway Integration",
        "Receipt OCR Verification",
        "Admin Backoffice",
      ],
      techTags: ["Flutter", "OCR", "Payments", "API"],
      listTags: ["e-bidding", "MEDIUM"],
      financials: {
        totalBudgetBaht: 5_900_000,
        medianPriceBaht: 5_750_000,
        method: "e-bidding",
        milestones: milestonesForBudget(5_900_000),
      },
      qualificationRequirements: defaultQualifications(2_500_000, 2_000_000),
    },
  ]
}

/**
 * Toggle to `null` to preview the "not yet setup" qualification empty state.
 * Replace with a real company-profile fetch later.
 */
export function getMockCompanyProfile(): CompanyProfile | null {
  return {
    id: "company-001",
    name: "NanoTalBoss Company",
    matches: [
      {
        requirementId: "registered-capital",
        displayValue: "5,000,000 THB",
        passed: true,
      },
      {
        requirementId: "past-performance",
        displayValue: "Contract #2024-A (2,000,000 THB)",
        passed: true,
      },
      {
        requirementId: "certifications",
        displayValue: "ISO/IEC 29110 (Exp: 2027)",
        passed: true,
      },
      {
        requirementId: "deal-breaker",
        displayValue: "e-GP Registered Vendor",
        passed: true,
      },
    ],
  }
}

import type { CompanyProfile, Tor } from "@/types/tor";

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
  ] as const;

  return schedule.map((item) => ({
    ...item,
    amountBaht: Math.round((totalBudgetBaht * item.percent) / 100),
  }));
}

function defaultQualifications(
  minCapital: number,
  pastContractMin: number,
): Tor["qualificationRequirements"] {
  return [
    {
      id: "registered-capital",
      requirement: "Registered Capital",
      torCriteria: `≥ ${minCapital.toLocaleString("en-US")} THB`,
      autoCheckable: true,
    },
    {
      id: "past-performance",
      requirement: "Past Performance",
      torCriteria: `Web App Contract ≥ ${pastContractMin.toLocaleString("en-US")} THB`,
      autoCheckable: true,
    },
    {
      id: "certifications",
      requirement: "Certifications",
      torCriteria: "ISO/IEC 29110 or CMMI Level 2+",
      autoCheckable: true,
    },
    {
      id: "deal-breaker",
      requirement: "Deal-Breaker Clauses",
      torCriteria: "Must be registered e-GP Vendor",
      autoCheckable: true,
    },
  ]
}

function manualQualifications(): Tor["qualificationRequirements"] {
  return [
    {
      id: "manual-experience",
      requirement: "Government System Experience",
      torCriteria:
        "Must have prior experience delivering procurement or budget systems for government agencies",
      autoCheckable: false,
    },
    {
      id: "manual-team",
      requirement: "Dedicated Project Team",
      torCriteria:
        "Must assign a full-time project manager and at least 2 senior developers for the contract duration",
      autoCheckable: false,
    },
  ]
}

/**
 * Mock TOR dataset. Swap this function's body (or replace callers)
 * when wiring a real database / API.
 */
const LOCAL_OFFICES = [
  "Phra Nakhon District",
  "Chatuchak District",
  "Traffic & Transportation Dept",
  "Bang Kapi District",
  "Pathum Wan District",
  "Huai Khwang District",
  "Lat Phrao District",
  "Din Daeng District",
  "Ratchathewi District",
  "Khlong Toei District",
  "Sathon District",
  "Bang Rak District",
  "Watthana District",
  "Bang Sue District",
  "Public Works District Office",
] as const

type TorSeed = Omit<Tor, "localOffice" | "announcementDate">

function withBrowseMeta(tors: TorSeed[]): Tor[] {
  return tors.map((tor, index) => {
    const deadline = new Date(tor.deadline)
    const announced = new Date(deadline)
    announced.setDate(announced.getDate() - (21 + (index % 40)))
    const method =
      tor.method === "e-market" ? ("price-agreement" as const) : tor.method

    return {
      ...tor,
      localOffice: LOCAL_OFFICES[index % LOCAL_OFFICES.length],
      announcementDate: announced.toISOString(),
      projectScale:
        tor.budgetBaht >= 50_000_000 ? ("ENTERPRISE" as const) : tor.projectScale,
      method,
      financials: {
        ...tor.financials,
        method:
          tor.financials.method === "e-market"
            ? ("price-agreement" as const)
            : tor.financials.method,
      },
    }
  })
}

export function listMockLocalOffices() {
  return [...LOCAL_OFFICES]
}

export function getMockTors(): Tor[] {
  return withBrowseMeta([
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
      qualificationRequirements: [
        ...defaultQualifications(2_000_000, 1_500_000),
        ...manualQualifications(),
      ],
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
    {
      id: "tor-007",
      announcementNo: "BMA-DRD-69-09-0105",
      title: "Smart Drainage & Flood Early Warning System",
      department: "Drainage and Sewerage Department",
      budgetBaht: 9_400_000,
      projectScale: "LARGE",
      durationDays: 300,
      durationLabel: "300 Days (10 Months)",
      method: "e-bidding",
      status: "open",
      eligible: true,
      bookmarked: false,
      deadline: "2026-09-30T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Deploy a flood early-warning platform combining canal sensor telemetry, rainfall forecasts, and district response playbooks.",
      deliverables: [
        "Canal Sensor Network Integration",
        "Flood Risk Prediction Engine",
        "District Command Dashboard",
        "Citizen Alert Channels",
      ],
      techTags: ["IoT", "Python", "Maps", "Alerts", "API"],
      listTags: ["e-bidding", "LARGE"],
      financials: {
        totalBudgetBaht: 9_400_000,
        medianPriceBaht: 9_100_000,
        method: "e-bidding",
        milestones: milestonesForBudget(9_400_000),
      },
      qualificationRequirements: defaultQualifications(3_500_000, 2_200_000),
    },
    {
      id: "tor-008",
      announcementNo: "BMA-SSD-69-08-0330",
      title: "Social Welfare Case Management Web Application",
      department: "Social Development Department",
      budgetBaht: 3_200_000,
      projectScale: "MEDIUM",
      durationDays: 180,
      durationLabel: "180 Days (6 Months)",
      method: "e-market",
      status: "open",
      eligible: true,
      bookmarked: false,
      deadline: "2026-10-08T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Build a case-management web app for social welfare officers to track beneficiary intake, visits, and benefit disbursement.",
      deliverables: [
        "Case Intake Workflow",
        "Field Visit Mobile Forms",
        "Benefit Disbursement Tracker",
        "Supervisor Reporting Suite",
      ],
      techTags: ["Next.js", "Postgres", "Workflow", "Reports"],
      listTags: ["e-market", "MEDIUM"],
      financials: {
        totalBudgetBaht: 3_200_000,
        medianPriceBaht: 3_050_000,
        method: "e-market",
        milestones: milestonesForBudget(3_200_000),
      },
      qualificationRequirements: defaultQualifications(1_200_000, 900_000),
    },
    {
      id: "tor-009",
      announcementNo: "BMA-CUL-69-07-0188",
      title: "Cultural Heritage Digital Archive & Virtual Tour Platform",
      department: "Culture, Sports and Tourism Department",
      budgetBaht: 6_750_000,
      projectScale: "MEDIUM",
      durationDays: 240,
      durationLabel: "240 Days (8 Months)",
      method: "selective",
      status: "open",
      eligible: false,
      bookmarked: false,
      deadline: "2026-09-18T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Digitize heritage assets into a searchable archive with 3D/virtual tour experiences for public museums and schools.",
      deliverables: [
        "Digital Asset Repository",
        "3D / Virtual Tour Viewer",
        "Curator CMS",
        "Public Discovery Portal",
      ],
      techTags: ["Three.js", "CMS", "CDN", "Search"],
      listTags: ["selective", "MEDIUM"],
      financials: {
        totalBudgetBaht: 6_750_000,
        medianPriceBaht: 6_400_000,
        method: "selective",
        milestones: milestonesForBudget(6_750_000),
      },
      qualificationRequirements: defaultQualifications(3_000_000, 2_000_000),
    },
    {
      id: "tor-010",
      announcementNo: "BMA-LAW-69-08-0275",
      title: "Legal Document Automation & e-Signature Portal",
      department: "Law and Litigation Office",
      budgetBaht: 2_850_000,
      projectScale: "SMALL",
      durationDays: 150,
      durationLabel: "150 Days (5 Months)",
      method: "e-bidding",
      status: "closing-soon",
      eligible: true,
      bookmarked: false,
      deadline: "2026-08-22T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Automate drafting of common legal templates with approval workflows and Thai e-signature integration.",
      deliverables: [
        "Template Authoring Engine",
        "Multi-step Approval Workflow",
        "e-Signature Integration",
        "Document Audit Trail",
      ],
      techTags: ["React", "PDF", "Workflow", "e-Signature"],
      listTags: ["e-bidding", "SMALL"],
      financials: {
        totalBudgetBaht: 2_850_000,
        medianPriceBaht: 2_700_000,
        method: "e-bidding",
        milestones: milestonesForBudget(2_850_000),
      },
      qualificationRequirements: defaultQualifications(1_200_000, 1_000_000),
    },
    {
      id: "tor-011",
      announcementNo: "BMA-HRD-69-09-0042",
      title: "HR Self-Service Portal & Leave Management System",
      department: "Human Resource Development Department",
      budgetBaht: 1_950_000,
      projectScale: "SMALL",
      durationDays: 120,
      durationLabel: "120 Days (4 Months)",
      method: "e-market",
      status: "open",
      eligible: true,
      bookmarked: false,
      deadline: "2026-10-15T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Provide employees with self-service leave requests, attendance views, and HR policy knowledge base.",
      deliverables: [
        "Employee Self-Service Portal",
        "Leave & Attendance Module",
        "Manager Approval Console",
        "Policy Knowledge Base",
      ],
      techTags: ["Next.js", "Auth", "Notifications", "API"],
      listTags: ["e-market", "SMALL"],
      financials: {
        totalBudgetBaht: 1_950_000,
        medianPriceBaht: 1_880_000,
        method: "e-market",
        milestones: milestonesForBudget(1_950_000).slice(0, 4),
      },
      qualificationRequirements: defaultQualifications(800_000, 600_000),
    },
    {
      id: "tor-012",
      announcementNo: "BMA-PWD-69-06-0199",
      title: "Public Works Asset Maintenance Mobile Platform",
      department: "Public Works Department",
      budgetBaht: 7_100_000,
      projectScale: "LARGE",
      durationDays: 270,
      durationLabel: "270 Days (9 Months)",
      method: "e-bidding",
      status: "open",
      eligible: false,
      bookmarked: false,
      deadline: "2026-09-25T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Enable field crews to log asset defects, schedule maintenance, and sync offline work orders across districts.",
      deliverables: [
        "Offline-capable Mobile App",
        "Asset Registry Sync",
        "Work Order Scheduling",
        "Spare Parts Inventory Link",
      ],
      techTags: ["Flutter", "Offline Sync", "GIS", "API"],
      listTags: ["e-bidding", "LARGE"],
      financials: {
        totalBudgetBaht: 7_100_000,
        medianPriceBaht: 6_850_000,
        method: "e-bidding",
        milestones: milestonesForBudget(7_100_000),
      },
      qualificationRequirements: defaultQualifications(3_500_000, 2_500_000),
    },
    {
      id: "tor-013",
      announcementNo: "BMA-ITD-69-09-0411",
      title: "BMA Citizen Chatbot & Service Desk Automation",
      department: "Information Technology Department",
      budgetBaht: 4_050_000,
      projectScale: "MEDIUM",
      durationDays: 180,
      durationLabel: "180 Days (6 Months)",
      method: "e-bidding",
      status: "open",
      eligible: true,
      bookmarked: true,
      deadline: "2026-10-20T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Launch a Thai/English citizen chatbot that triages service requests and creates tickets in the existing service desk.",
      deliverables: [
        "Multilingual Chatbot",
        "Intent Classification Models",
        "Service Desk Integration",
        "Agent Handoff Console",
      ],
      techTags: ["NLP", "Python", "React", "API", "LINE"],
      listTags: ["e-bidding", "MEDIUM"],
      financials: {
        totalBudgetBaht: 4_050_000,
        medianPriceBaht: 3_900_000,
        method: "e-bidding",
        milestones: milestonesForBudget(4_050_000),
      },
      qualificationRequirements: defaultQualifications(1_800_000, 1_200_000),
    },
    {
      id: "tor-014",
      announcementNo: "BMA-SEC-69-08-0087",
      title: "CCTV Video Analytics & Incident Detection System",
      department: "City Law Enforcement Department",
      budgetBaht: 15_600_000,
      projectScale: "LARGE",
      durationDays: 365,
      durationLabel: "365 Days (12 Months)",
      method: "specific",
      status: "awarded",
      eligible: false,
      bookmarked: false,
      deadline: "2026-08-05T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Implement AI video analytics across selected CCTV corridors for crowd, vehicle, and incident detection with operator workflows.",
      deliverables: [
        "Video Analytics Pipeline",
        "Incident Operator Console",
        "Model Training Toolkit",
        "Privacy & Retention Controls",
      ],
      techTags: ["Computer Vision", "GPU", "Python", "Dashboard"],
      listTags: ["specific", "LARGE"],
      financials: {
        totalBudgetBaht: 15_600_000,
        medianPriceBaht: 15_000_000,
        method: "specific",
        milestones: milestonesForBudget(15_600_000),
      },
      qualificationRequirements: defaultQualifications(8_000_000, 5_000_000),
    },
    {
      id: "tor-015",
      announcementNo: "BMA-PLN-69-09-0220",
      title: "Urban Planning GIS Collaboration Workspace",
      department: "City Planning Department",
      budgetBaht: 5_250_000,
      projectScale: "MEDIUM",
      durationDays: 210,
      durationLabel: "210 Days (7 Months)",
      method: "e-bidding",
      status: "open",
      eligible: true,
      bookmarked: false,
      deadline: "2026-11-02T16:30:00+07:00",
      sourceUrl: "https://www.gprocurement.go.th",
      summary:
        "Deliver a collaborative GIS workspace for planners to annotate zoning layers, share reviews, and publish public maps.",
      deliverables: [
        "Web GIS Editor",
        "Layer Version Control",
        "Review Commenting Tools",
        "Public Map Publishing",
      ],
      techTags: ["GIS", "Mapbox", "React", "Collaboration"],
      listTags: ["e-bidding", "MEDIUM"],
      financials: {
        totalBudgetBaht: 5_250_000,
        medianPriceBaht: 5_050_000,
        method: "e-bidding",
        milestones: milestonesForBudget(5_250_000),
      },
      qualificationRequirements: defaultQualifications(2_000_000, 1_500_000),
    },
  ])
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
  };
}

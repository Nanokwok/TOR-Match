import type { TeamMember, WorkspaceCard } from "@/types/workspace"

const DEPARTMENTS: Record<string, string> = {
  "BMA-SED": "Strategy and Evaluation Department (SED)",
  "BMA-ENV": "Environment Department (ENV)",
  "BMA-ITD": "Information Technology Department (ITD)",
  "BMA-PHD": "Public Health Department (PHD)",
  "BMA-FIN": "Finance Department (FIN)",
  "BMA-EDD": "Education Department (EDD)",
}

function departmentFromAnnouncement(announcementNo: string) {
  const prefix = announcementNo.split("-").slice(0, 2).join("-")
  return (
    DEPARTMENTS[prefix] ??
    "Strategy and Evaluation Department (SED)"
  )
}

const INITIAL_WORKSPACE_CARDS: WorkspaceCard[] = [
  {
    torId: "ws-001",
    announcementNo: "BMA-SED-69-08-0142",
    title: "Smart Drainage & Flood Early Warning System",
    department: departmentFromAnnouncement("BMA-SED-69-08-0142"),
    budgetBaht: 4_500_000,
    deadline: "2026-08-20T16:30:00+07:00",
    priority: "HIGH",
    column: "bookmark",
    assigneeIds: ["member-1", "member-2"],
  },
  {
    torId: "ws-002",
    announcementNo: "BMA-ENV-69-08-0177",
    title: "Smart School Management System for BMA Schools",
    department: departmentFromAnnouncement("BMA-ENV-69-08-0177"),
    budgetBaht: 2_800_000,
    deadline: "2026-08-11T16:30:00+07:00",
    priority: "MEDIUM",
    column: "bookmark",
    assigneeIds: ["member-3"],
  },
  {
    torId: "ws-003",
    announcementNo: "BMA-ITD-69-07-0098",
    title: "AI-Powered Traffic Monitoring & Smart Signal Control",
    department: departmentFromAnnouncement("BMA-ITD-69-07-0098"),
    budgetBaht: 12_800_000,
    deadline: "2026-09-05T16:30:00+07:00",
    priority: "MEDIUM",
    column: "bookmark",
    assigneeIds: ["member-1", "member-4"],
  },
  {
    torId: "ws-004",
    announcementNo: "BMA-PHD-69-08-0211",
    title: "Digital Health Records Integration System for BMA Hospitals",
    department: departmentFromAnnouncement("BMA-PHD-69-08-0211"),
    budgetBaht: 8_200_000,
    deadline: "2026-08-15T12:00:00+07:00",
    priority: "HIGH",
    column: "todo",
    assigneeIds: ["member-2"],
  },
  {
    torId: "ws-005",
    announcementNo: "BMA-ITD-69-07-0098",
    title: "Smart City Traffic Analytics Platform for Bangkok",
    department: departmentFromAnnouncement("BMA-ITD-69-07-0098"),
    budgetBaht: 12_800_000,
    deadline: "2026-09-05T16:30:00+07:00",
    priority: "HIGH",
    column: "in-progress",
    assigneeIds: ["member-1", "member-3"],
  },
  {
    torId: "ws-006",
    announcementNo: "BMA-ENV-69-08-0177",
    title: "Environmental Sensor Dashboard & Alert System",
    department: departmentFromAnnouncement("BMA-ENV-69-08-0177"),
    budgetBaht: 3_650_000,
    deadline: "2026-09-12T16:30:00+07:00",
    priority: "MEDIUM",
    column: "in-progress",
    assigneeIds: ["member-4"],
  },
  {
    torId: "ws-007",
    announcementNo: "BMA-FIN-69-05-0031",
    title: "Municipal Tax Payment Mobile Application Redesign",
    department: departmentFromAnnouncement("BMA-FIN-69-05-0031"),
    budgetBaht: 5_900_000,
    deadline: "2026-07-01T16:30:00+07:00",
    priority: "LOW",
    column: "done",
    assigneeIds: ["member-2", "member-3"],
  },
  {
    torId: "ws-008",
    announcementNo: "BMA-EDD-69-06-0044",
    title: "E-Learning Content Management System for BMA Schools",
    department: departmentFromAnnouncement("BMA-EDD-69-06-0044"),
    budgetBaht: 2_100_000,
    deadline: "2026-08-28T16:30:00+07:00",
    priority: "MEDIUM",
    column: "done",
    assigneeIds: ["member-1"],
  },
  {
    torId: "ws-009",
    announcementNo: "BMA-SED-69-08-0142",
    title: "BMA Procurement & Budget Tracking Information System",
    department: departmentFromAnnouncement("BMA-SED-69-08-0142"),
    budgetBaht: 4_500_000,
    deadline: "2026-08-20T16:30:00+07:00",
    priority: "MEDIUM",
    column: "done",
    assigneeIds: ["member-1", "member-2"],
  },
]

let workspaceCards = [...INITIAL_WORKSPACE_CARDS]

/**
 * Mock workspace board data. Replace getMockWorkspaceCards() body
 * when wiring a real database / API.
 */
export function getMockTeamMembers(): TeamMember[] {
  return [
    { id: "member-1", name: "Atikarn Kruaykriangkrai", initials: "AK" },
    { id: "member-2", name: "Thitirat Somsupangsri", initials: "TS" },
    { id: "member-3", name: "Pattadon Udompaipeuk", initials: "PU" },
    { id: "member-4", name: "Nattapong Wichaiya", initials: "NW" },
  ]
}

export function getMockWorkspaceCards(): WorkspaceCard[] {
  return workspaceCards
}

export function setMockWorkspaceCards(cards: WorkspaceCard[]) {
  workspaceCards = cards
}

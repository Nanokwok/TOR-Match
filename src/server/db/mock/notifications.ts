import type { AppNotification } from "@/types/notification"

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    category: "match",
    title: "New high-fit TOR match",
    description:
      "BMA Procurement & Budget Tracking System scored 92% against your company profile.",
    createdAt: hoursAgo(1),
    isRead: false,
    matchScore: 92,
    link: "/browse",
    actionLabel: "View TOR →",
  },
  {
    id: "n-2",
    category: "deadline",
    title: "Deadline approaching",
    description:
      "BMA Procurement & Budget Tracking System is closing in 3 days. Confirm eligibility and assign owners.",
    createdAt: hoursAgo(3),
    isRead: false,
    link: "/browse",
    actionLabel: "View TOR →",
  },
  {
    id: "n-4",
    category: "match",
    title: "Suggested TOR for review",
    description:
      "Provincial Hospital Network Upgrade matches your ICT and systems-integration capabilities.",
    createdAt: daysAgo(1),
    isRead: true,
    matchScore: 81,
    link: "/browse",
    actionLabel: "View TOR →",
  },
  {
    id: "n-5",
    category: "deadline",
    title: "Submission window closing soon",
    description:
      "Smart City Traffic Analytics RFP closes tomorrow at 16:00. Checklist items remain incomplete.",
    createdAt: daysAgo(1),
    isRead: false,
    link: "/workspace",
    actionLabel: "Open Workspace",
  },
  {
    id: "n-7",
    category: "system",
    title: "Notification preferences updated",
    description:
      "Deadline alerts are now enabled for all tracked TORs in your workspace.",
    createdAt: daysAgo(3),
    isRead: true,
  },
  {
    id: "n-8",
    category: "match",
    title: "Weekly match digest",
    description:
      "4 new TORs published this week aligned with your registered capabilities and budget range.",
    createdAt: daysAgo(4),
    isRead: true,
    matchScore: 76,
    link: "/browse",
    actionLabel: "View TOR →",
  },
]

import { localizedText } from "@/types/localized"
import type { AppNotification } from "@/types/notification"

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    category: "match",
    title: localizedText(
      "New high-fit TOR match",
      "พบ TOR ที่ตรงคุณสมบัติสูง"
    ),
    description: localizedText(
      "BMA Procurement & Budget Tracking System matches your automatically verified qualifications.",
      "ระบบติดตามการจัดซื้อจัดจ้างและงบประมาณ กทม. ตรงกับคุณสมบัติที่ตรวจสอบอัตโนมัติแล้ว"
    ),
    createdAt: hoursAgo(1),
    isRead: false,
    autoVerifiedMatch: true,
    torId: "tor-001",
    link: "/browse?tor=tor-001",
    action: "view-tor",
  },
  {
    id: "n-2",
    category: "deadline",
    title: localizedText("Deadline approaching", "ใกล้ครบกำหนดยื่นข้อเสนอ"),
    description: localizedText(
      "BMA Procurement & Budget Tracking System is closing in 3 days. Confirm eligibility and assign owners.",
      "ระบบติดตามการจัดซื้อจัดจ้างและงบประมาณ กทม. ปิดรับใน 3 วัน โปรดยืนยันคุณสมบัติและมอบหมายผู้รับผิดชอบ"
    ),
    createdAt: hoursAgo(3),
    isRead: false,
    torId: "ws-009",
    link: "/workspace?tor=ws-009",
    action: "open-workspace",
  },
  {
    id: "n-4",
    category: "match",
    title: localizedText("Suggested TOR for review", "TOR แนะนำให้ตรวจสอบ"),
    description: localizedText(
      "Digital Health Records Integration System for BMA Hospitals matches your automatically verified qualifications.",
      "ระบบบูรณาการเวชระเบียนดิจิทัล สำหรับโรงพยาบาล กทม. ตรงกับคุณสมบัติที่ตรวจสอบอัตโนมัติแล้ว"
    ),
    createdAt: daysAgo(1),
    isRead: true,
    autoVerifiedMatch: true,
    torId: "tor-003",
    link: "/browse?tor=tor-003",
    action: "view-tor",
  },
  {
    id: "n-5",
    category: "deadline",
    title: localizedText(
      "Submission window closing soon",
      "ใกล้ปิดรับยื่นข้อเสนอ"
    ),
    description: localizedText(
      "Smart City Traffic Analytics RFP closes tomorrow at 16:00. Checklist items remain incomplete.",
      "RFP วิเคราะห์การจราจร Smart City ปิดรับพรุ่งนี้ 16:00 น. ยังมีรายการเช็คลิสต์ค้างอยู่"
    ),
    createdAt: daysAgo(1),
    isRead: false,
    torId: "ws-005",
    link: "/workspace?tor=ws-005&tab=checklist",
    action: "open-workspace",
  },
  {
    id: "n-7",
    category: "system",
    title: localizedText(
      "Notification preferences updated",
      "อัปเดตการตั้งค่าการแจ้งเตือนแล้ว"
    ),
    description: localizedText(
      "Deadline alerts are now enabled for all tracked TORs in your workspace.",
      "เปิดการแจ้งเตือนกำหนดเวลาสำหรับ TOR ที่ติดตามทั้งหมดใน workspace แล้ว"
    ),
    createdAt: daysAgo(3),
    isRead: true,
    link: "/settings/notifications",
  },
  {
    id: "n-8",
    category: "match",
    title: localizedText("Weekly match digest", "สรุปการจับคู่รายสัปดาห์"),
    description: localizedText(
      "4 new TORs published this week match your automatically verified qualifications.",
      "TOR ใหม่ 4 รายการที่ประกาศสัปดาห์นี้ ตรงกับคุณสมบัติที่ตรวจสอบอัตโนมัติแล้ว"
    ),
    createdAt: daysAgo(4),
    isRead: true,
    autoVerifiedMatch: true,
    link: "/browse",
    action: "view-tor",
  },
]

let mockNotificationsState = [...MOCK_NOTIFICATIONS]

export function getMockNotifications(): AppNotification[] {
  return [...mockNotificationsState]
}

export function markMockNotificationRead(id: string): void {
  mockNotificationsState = mockNotificationsState.map((n) =>
    n.id === id ? { ...n, isRead: true } : n
  )
}

export function markAllMockNotificationsRead(): void {
  mockNotificationsState = mockNotificationsState.map((n) => ({ ...n, isRead: true }))
}

export function deleteMockNotification(id: string): void {
  mockNotificationsState = mockNotificationsState.filter((n) => n.id !== id)
}

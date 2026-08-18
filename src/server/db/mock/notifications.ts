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
    titleTh: "พบ TOR ที่ตรงคุณสมบัติสูง",
    description:
      "BMA Procurement & Budget Tracking System matches your automatically verified qualifications.",
    descriptionTh:
      "ระบบติดตามการจัดซื้อจัดจ้างและงบประมาณ กทม. ตรงกับคุณสมบัติที่ตรวจสอบอัตโนมัติแล้ว",
    createdAt: hoursAgo(1),
    isRead: false,
    autoVerifiedMatch: true,
    link: "/browse",
    actionLabel: "View TOR →",
    actionLabelTh: "ดู TOR →",
  },
  {
    id: "n-2",
    category: "deadline",
    title: "Deadline approaching",
    titleTh: "ใกล้ครบกำหนดยื่นข้อเสนอ",
    description:
      "BMA Procurement & Budget Tracking System is closing in 3 days. Confirm eligibility and assign owners.",
    descriptionTh:
      "ระบบติดตามการจัดซื้อจัดจ้างและงบประมาณ กทม. ปิดรับใน 3 วัน โปรดยืนยันคุณสมบัติและมอบหมายผู้รับผิดชอบ",
    createdAt: hoursAgo(3),
    isRead: false,
    link: "/browse",
    actionLabel: "View TOR →",
    actionLabelTh: "ดู TOR →",
  },
  {
    id: "n-4",
    category: "match",
    title: "Suggested TOR for review",
    titleTh: "TOR แนะนำให้ตรวจสอบ",
    description:
      "Provincial Hospital Network Upgrade matches your automatically verified qualifications.",
    descriptionTh:
      "โครงการอัปเกรดเครือข่ายโรงพยาบาลจังหวัด ตรงกับคุณสมบัติที่ตรวจสอบอัตโนมัติแล้ว",
    createdAt: daysAgo(1),
    isRead: true,
    autoVerifiedMatch: true,
    link: "/browse",
    actionLabel: "View TOR →",
    actionLabelTh: "ดู TOR →",
  },
  {
    id: "n-5",
    category: "deadline",
    title: "Submission window closing soon",
    titleTh: "ใกล้ปิดรับยื่นข้อเสนอ",
    description:
      "Smart City Traffic Analytics RFP closes tomorrow at 16:00. Checklist items remain incomplete.",
    descriptionTh:
      "RFP วิเคราะห์การจราจร Smart City ปิดรับพรุ่งนี้ 16:00 น. ยังมีรายการเช็คลิสต์ค้างอยู่",
    createdAt: daysAgo(1),
    isRead: false,
    link: "/workspace",
    actionLabel: "Open Workspace",
    actionLabelTh: "เปิด Workspace",
  },
  {
    id: "n-7",
    category: "system",
    title: "Notification preferences updated",
    titleTh: "อัปเดตการตั้งค่าการแจ้งเตือนแล้ว",
    description:
      "Deadline alerts are now enabled for all tracked TORs in your workspace.",
    descriptionTh:
      "เปิดการแจ้งเตือนกำหนดเวลาสำหรับ TOR ที่ติดตามทั้งหมดใน workspace แล้ว",
    createdAt: daysAgo(3),
    isRead: true,
  },
  {
    id: "n-8",
    category: "match",
    title: "Weekly match digest",
    titleTh: "สรุปการจับคู่รายสัปดาห์",
    description:
      "4 new TORs published this week match your automatically verified qualifications.",
    descriptionTh:
      "TOR ใหม่ 4 รายการที่ประกาศสัปดาห์นี้ ตรงกับคุณสมบัติที่ตรวจสอบอัตโนมัติแล้ว",
    createdAt: daysAgo(4),
    isRead: true,
    autoVerifiedMatch: true,
    link: "/browse",
    actionLabel: "View TOR →",
    actionLabelTh: "ดู TOR →",
  },
]

export function localizeNotification(
  notification: AppNotification,
  locale: "en" | "th"
): AppNotification {
  if (locale === "en") return notification

  return {
    ...notification,
    title: notification.titleTh ?? notification.title,
    description: notification.descriptionTh ?? notification.description,
    actionLabel: (notification.actionLabelTh ??
      notification.actionLabel) as AppNotification["actionLabel"],
  }
}

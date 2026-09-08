import { localizedText } from "@/types/localized"
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
    link: "/browse",
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
    link: "/browse",
    action: "view-tor",
  },
  {
    id: "n-4",
    category: "match",
    title: localizedText("Suggested TOR for review", "TOR แนะนำให้ตรวจสอบ"),
    description: localizedText(
      "Provincial Hospital Network Upgrade matches your automatically verified qualifications.",
      "โครงการอัปเกรดเครือข่ายโรงพยาบาลจังหวัด ตรงกับคุณสมบัติที่ตรวจสอบอัตโนมัติแล้ว"
    ),
    createdAt: daysAgo(1),
    isRead: true,
    autoVerifiedMatch: true,
    link: "/browse",
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
    link: "/workspace",
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
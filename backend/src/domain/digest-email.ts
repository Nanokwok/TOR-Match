import { EMAIL_COLORS, emailLayout, emailSectionTitle } from "@/domain/email-layout"
import { escapeHtml } from "@/utils/html"

/** What a digest says about one TOR; plain data so the emails can be built and tested without a database. */
export type DigestTor = {
  id: string
  titleTh: string
  titleEn: string
  department: string
  budgetBaht: number
  /** Pre-formatted, Bangkok time; empty when the TOR states none. */
  deadline: string
}

const MAX_LISTED = 12
const { primary, ink, muted, border } = EMAIL_COLORS

const baht = (value: number) => `฿${value.toLocaleString("en-US")}`
const base = (appUrl: string) => appUrl.replace(/\/$/, "")

/** One TOR as a row: Thai title linking into the app, English title, then budget, department and deadline. */
export function torRowHtml(tor: DigestTor, appUrl: string, last = false): string {
  const url = `${base(appUrl)}/browse?tor=${tor.id}`
  return (
    `<div style="padding:12px 0;${last ? "" : `border-bottom:1px solid ${border}`}">` +
    `<a href="${escapeHtml(url)}" style="font-size:15px;font-weight:600;color:${ink};text-decoration:none">${escapeHtml(tor.titleTh)}</a>` +
    `<div style="font-size:13px;color:${muted};margin-top:2px">${escapeHtml(tor.titleEn)}</div>` +
    `<div style="font-size:13px;margin-top:6px">` +
    `<span style="color:${ink};font-weight:600">${escapeHtml(baht(tor.budgetBaht))}</span>` +
    `<span style="color:${muted}"> · ${escapeHtml(tor.department)}${tor.deadline ? ` · ปิดรับ ${escapeHtml(tor.deadline)}` : ""}</span></div></div>`
  )
}

/** The same details as plain text, for the text part of an email. */
export function torRowText(tor: DigestTor, appUrl: string): string {
  return `- ${tor.titleTh} / ${tor.titleEn} (${tor.department}, ${baht(tor.budgetBaht)}${tor.deadline ? `, ${tor.deadline}` : ""})\n  ${base(appUrl)}/browse?tor=${tor.id}`
}

function torLines(tors: DigestTor[], appUrl: string) {
  const shown = tors.slice(0, MAX_LISTED)
  const more = tors.length - shown.length

  const text =
    shown.map((tor) => torRowText(tor, appUrl)).join("\n") + (more > 0 ? `\n…และอีก ${more} รายการ / and ${more} more\n` : "")

  const rows = shown.map((tor) => torRowHtml(tor, appUrl)).join("")
  const html =
    rows +
    (more > 0 ? `<p style="margin:12px 0 0;font-size:13px;color:${muted}">…และอีก ${more} รายการ / and ${more} more</p>` : "")
  return { text, html }
}

/** Pure: the daily email of new TORs that fit the company's profile. */
export function renderDailyDigest(tors: DigestTor[], appUrl: string) {
  const { text, html } = torLines(tors, appUrl)
  const headingTh = `TOR ใหม่ที่เหมาะกับคุณ ${tors.length} รายการ`
  const headingEn = `${tors.length} new TOR${tors.length === 1 ? "" : "s"} that fit your company`
  return {
    subject: `${headingTh} / ${headingEn}`,
    text:
      `${headingTh}\n${headingEn}\n\n${text}\n${base(appUrl)}/browse\n\n` +
      `จัดการการแจ้งเตือน / Manage notifications: ${base(appUrl)}/settings/notifications\n`,
    html: emailLayout({
      headingTh,
      headingEn,
      bodyHtml: html,
      cta: { label: "ดู TOR ทั้งหมด / Browse TORs", url: `${base(appUrl)}/browse` },
      appUrl,
    }),
  }
}

export type WeeklySummary = {
  /** Cards on the workspace board by column name. */
  columns: Record<string, number>
  /** Workspace TORs whose bid deadline falls in the next 7 days, soonest first. */
  closingSoon: DigestTor[]
  /** New TORs this week that fit the company's profile. */
  newMatches: number
  /** How the team is getting through the work on the board. */
  team: {
    /** Checklist items ticked off / in total, across cards that are not done. */
    checklistDone: number
    checklistTotal: number
    /** Cards marked high priority that are not done yet. */
    highPriorityOpen: number
    /** Cards that are not done and nobody is assigned to. */
    unassigned: number
    /** Who is carrying how many unfinished cards, most first. */
    assignees: { name: string; cards: number }[]
  }
}

const COLUMN_LABELS: Record<string, { th: string; en: string }> = {
  bookmark: { th: "บุ๊กมาร์ก", en: "Bookmarked" },
  todo: { th: "รอทำ", en: "To do" },
  "in-progress": { th: "กำลังทำ", en: "In progress" },
  done: { th: "เสร็จแล้ว", en: "Done" },
}

/** A row of figures, like the stat tiles on the website. */
function statTiles(tiles: { value: number; th: string; en: string }[]): string {
  const width = Math.floor(100 / tiles.length)
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:10px;border-collapse:separate"><tr>` +
    tiles
      .map(
        (tile, index) =>
          `<td width="${width}%" align="center" style="padding:14px 6px;${index > 0 ? `border-left:1px solid ${border};` : ""}">` +
          `<div style="font-size:24px;font-weight:700;color:${primary};line-height:1.1">${tile.value}</div>` +
          `<div style="font-size:12px;color:${ink};margin-top:4px">${escapeHtml(tile.th)}</div>` +
          `<div style="font-size:11px;color:${muted}">${escapeHtml(tile.en)}</div></td>`
      )
      .join("") +
    `</tr></table>`
  )
}

/** Pure: the weekly look at the workspace board. */
export function renderWeeklySummary(summary: WeeklySummary, appUrl: string) {
  const counts = Object.entries(COLUMN_LABELS)
    .filter(([key]) => (summary.columns[key] ?? 0) > 0)
    .map(([key, label]) => ({ ...label, count: summary.columns[key] }))
  const { text: soonText, html: soonHtml } = torLines(summary.closingSoon, appUrl)
  const headingTh = "สรุปประจำสัปดาห์ของคุณ"
  const headingEn = "Your week in TOR Match"
  const lineTh = `TOR ใหม่ที่เหมาะกับคุณสัปดาห์นี้: ${summary.newMatches} รายการ`
  const lineEn = `New TORs that fit you this week: ${summary.newMatches}`

  const { team } = summary
  const teamLines: { th: string; en: string }[] = []
  if (team.checklistTotal > 0) {
    teamLines.push({
      th: `งานย่อยเสร็จแล้ว ${team.checklistDone} จาก ${team.checklistTotal}`,
      en: `Checklist items done: ${team.checklistDone} of ${team.checklistTotal}`,
    })
  }
  if (team.highPriorityOpen > 0) {
    teamLines.push({
      th: `การ์ดสำคัญสูงที่ยังไม่เสร็จ ${team.highPriorityOpen} ใบ`,
      en: `High-priority cards still open: ${team.highPriorityOpen}`,
    })
  }
  if (team.unassigned > 0) {
    teamLines.push({
      th: `ยังไม่มีผู้รับผิดชอบ ${team.unassigned} ใบ`,
      en: `Cards with nobody assigned: ${team.unassigned}`,
    })
  }
  // Always say something: a section that vanishes when the board is quiet looks like a feature that is missing.
  if (teamLines.length === 0) {
    teamLines.push({
      th: "ยังไม่มีการ์ดที่กำลังดำเนินการในบอร์ดของคุณ",
      en: "No active cards on your board yet",
    })
  }
  for (const person of team.assignees.slice(0, 5)) {
    teamLines.push({ th: `${person.name}: ${person.cards} ใบ`, en: `${person.name}: ${person.cards} card${person.cards === 1 ? "" : "s"}` })
  }

  const text =
    `${headingTh}\n${headingEn}\n\n${lineTh}\n${lineEn}\n\n` +
    (counts.length ? `Workspace: ${counts.map((c) => `${c.th} / ${c.en} ${c.count}`).join(", ")}\n\n` : "") +
    `สถานะทีม / Team status\n${teamLines.map((line) => `- ${line.th} / ${line.en}`).join("\n")}\n\n` +
    (summary.closingSoon.length ? `ปิดรับภายใน 7 วัน / Closing within 7 days\n${soonText}\n` : "") +
    `${base(appUrl)}/workspace\n\n` +
    `จัดการการแจ้งเตือน / Manage notifications: ${base(appUrl)}/settings/notifications\n`

  const bodyHtml =
    `<p style="margin:0 0 16px">${escapeHtml(lineTh)}<br><span style="color:${muted}">${escapeHtml(lineEn)}</span></p>` +
    (counts.length
      ? statTiles(counts.map((c) => ({ value: c.count, th: c.th, en: c.en })))
      : "") +
    emailSectionTitle("สถานะทีม", "Team status") +
    teamLines
      .map(
        (line) =>
          `<div style="padding:7px 0;border-bottom:1px solid ${border}">${escapeHtml(line.th)}<br><span style="font-size:12px;color:${muted}">${escapeHtml(line.en)}</span></div>`
      )
      .join("") +
    (summary.closingSoon.length ? emailSectionTitle("ปิดรับภายใน 7 วัน", "Closing within 7 days") + soonHtml : "")

  return {
    subject: `${headingTh} / ${headingEn}`,
    text,
    html: emailLayout({
      headingTh,
      headingEn,
      bodyHtml,
      cta: { label: "เปิดพื้นที่ทำงานทีม / Open workspace", url: `${base(appUrl)}/workspace` },
      appUrl,
    }),
  }
}

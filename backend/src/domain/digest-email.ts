import { escapeHtml } from "@/services/match-notification.service"

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

const baht = (value: number) => `฿${value.toLocaleString("en-US")}`
const base = (appUrl: string) => appUrl.replace(/\/$/, "")

function torLines(tors: DigestTor[], appUrl: string) {
  const shown = tors.slice(0, MAX_LISTED)
  const text = shown
    .map((tor) => `- ${tor.titleTh} / ${tor.titleEn} (${tor.department}, ${baht(tor.budgetBaht)}${tor.deadline ? `, ${tor.deadline}` : ""})\n  ${base(appUrl)}/browse?tor=${tor.id}`)
    .join("\n")
  const html = shown
    .map((tor) => {
      const url = `${base(appUrl)}/browse?tor=${tor.id}`
      return (
        `<li style="margin-bottom:10px"><a href="${escapeHtml(url)}"><strong>${escapeHtml(tor.titleTh)}</strong></a><br>` +
        `${escapeHtml(tor.titleEn)}<br>` +
        `<small>${escapeHtml(tor.department)} · ${escapeHtml(baht(tor.budgetBaht))}${tor.deadline ? ` · ${escapeHtml(tor.deadline)}` : ""}</small></li>`
      )
    })
    .join("")
  const more = tors.length - shown.length
  return {
    text: text + (more > 0 ? `\n…และอีก ${more} รายการ / and ${more} more\n` : ""),
    html: `<ul style="padding-left:18px">${html}</ul>` + (more > 0 ? `<p>…และอีก ${more} รายการ / and ${more} more</p>` : ""),
  }
}

/** Pure: the daily email of new TORs that fit the company's profile. */
export function renderDailyDigest(tors: DigestTor[], appUrl: string) {
  const { text, html } = torLines(tors, appUrl)
  const headingTh = `TOR ใหม่ที่เหมาะกับคุณ ${tors.length} รายการ`
  const headingEn = `${tors.length} new TOR${tors.length === 1 ? "" : "s"} that fit your company`
  return {
    subject: `${headingTh} / ${headingEn}`,
    text: `${headingTh}\n${headingEn}\n\n${text}\n${base(appUrl)}/browse\n`,
    html: `<h2>${escapeHtml(headingTh)}</h2><p>${escapeHtml(headingEn)}</p>${html}<p><a href="${escapeHtml(base(appUrl))}/browse">${escapeHtml(base(appUrl))}/browse</a></p>`,
  }
}

export type WeeklySummary = {
  /** Cards on the workspace board by column name. */
  columns: Record<string, number>
  /** Workspace TORs whose bid deadline falls in the next 7 days, soonest first. */
  closingSoon: DigestTor[]
  /** New TORs this week that fit the company's profile. */
  newMatches: number
}

const COLUMN_LABELS: Record<string, { th: string; en: string }> = {
  bookmark: { th: "บุ๊กมาร์ก", en: "Bookmarked" },
  todo: { th: "รอทำ", en: "To do" },
  "in-progress": { th: "กำลังทำ", en: "In progress" },
  done: { th: "เสร็จแล้ว", en: "Done" },
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

  const text =
    `${headingTh}\n${headingEn}\n\n${lineTh}\n${lineEn}\n\n` +
    (counts.length ? `Workspace: ${counts.map((c) => `${c.th} / ${c.en} ${c.count}`).join(", ")}\n\n` : "") +
    (summary.closingSoon.length ? `ปิดรับภายใน 7 วัน / Closing within 7 days\n${soonText}\n` : "") +
    `${base(appUrl)}/workspace\n`
  const html =
    `<h2>${escapeHtml(headingTh)}</h2><p>${escapeHtml(headingEn)}</p>` +
    `<p>${escapeHtml(lineTh)}<br>${escapeHtml(lineEn)}</p>` +
    (counts.length
      ? `<p><strong>Workspace</strong><br>${counts.map((c) => `${escapeHtml(c.th)} / ${escapeHtml(c.en)}: ${c.count}`).join("<br>")}</p>`
      : "") +
    (summary.closingSoon.length ? `<h3>ปิดรับภายใน 7 วัน / Closing within 7 days</h3>${soonHtml}` : "") +
    `<p><a href="${escapeHtml(base(appUrl))}/workspace">${escapeHtml(base(appUrl))}/workspace</a></p>`
  return { subject: `${headingTh} / ${headingEn}`, text, html }
}

import { escapeHtml } from "@/utils/html"

/**
 * The look shared by every email the app sends, kept in line with the website:
 * the black header bar with the TOR Match wordmark, the blue primary button,
 * the same grey text and borders. Email clients ignore stylesheets and most
 * modern CSS, so it is built from tables with inline styles, and the wordmark
 * is text because Gmail will not show an SVG.
 */

export const EMAIL_COLORS = {
  primary: "#0088c9",
  ink: "#0a0a0a",
  muted: "#737373",
  border: "#d4d4d4",
  page: "#f5f5f5",
  white: "#ffffff",
} as const

export const EMAIL_FONT = "'Prompt','Noto Sans Thai','Sarabun',Tahoma,'Helvetica Neue',Arial,sans-serif"

const base = (appUrl: string) => appUrl.replace(/\/$/, "")

export function emailButton(label: string, url: string): string {
  return (
    `<a href="${escapeHtml(url)}" style="display:inline-block;background:${EMAIL_COLORS.primary};color:${EMAIL_COLORS.white};` +
    `padding:11px 22px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">${escapeHtml(label)}</a>`
  )
}

export function emailSectionTitle(th: string, en: string): string {
  return (
    `<p style="margin:26px 0 10px;font-size:13px;font-weight:600;color:${EMAIL_COLORS.ink};` +
    `border-bottom:1px solid ${EMAIL_COLORS.border};padding-bottom:6px">${escapeHtml(th)} ` +
    `<span style="color:${EMAIL_COLORS.muted};font-weight:400">/ ${escapeHtml(en)}</span></p>`
  )
}

export function emailLayout(params: {
  /** Thai heading, then the English line under it. */
  headingTh: string
  headingEn: string
  bodyHtml: string
  cta?: { label: string; url: string }
  appUrl: string
}): string {
  const { headingTh, headingEn, bodyHtml, cta, appUrl } = params
  const { primary, ink, muted, border, page, white } = EMAIL_COLORS

  return (
    `<!doctype html><html><body style="margin:0;padding:0;background:${page}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${page};padding:24px 12px"><tr><td align="center">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;font-family:${EMAIL_FONT};color:${ink}">` +
    // header bar
    `<tr><td style="background:#0a0a0a;padding:16px 24px;border-radius:12px 12px 0 0;border-bottom:3px solid ${primary}">` +
    `<span style="color:${white};font-size:22px;font-weight:700;letter-spacing:.2px">TOR</span>` +
    `<span style="color:${white};font-size:22px;font-weight:300">Match</span></td></tr>` +
    // card
    `<tr><td style="background:${white};padding:28px 24px;border:1px solid ${border};border-top:0;border-radius:0 0 12px 12px">` +
    `<h1 style="margin:0 0 4px;font-size:20px;line-height:1.35;font-weight:600;color:${ink}">${escapeHtml(headingTh)}</h1>` +
    `<p style="margin:0 0 18px;font-size:14px;color:${muted}">${escapeHtml(headingEn)}</p>` +
    `<div style="font-size:14px;line-height:1.6">${bodyHtml}</div>` +
    (cta ? `<p style="margin:24px 0 0">${emailButton(cta.label, cta.url)}</p>` : "") +
    `</td></tr>` +
    // footer
    `<tr><td style="padding:16px 8px;font-size:12px;line-height:1.6;color:${muted};text-align:center">` +
    `คุณได้รับอีเมลนี้ตามการตั้งค่าแจ้งเตือนของคุณ · You are receiving this because of your notification settings.<br>` +
    `<a href="${escapeHtml(base(appUrl))}/settings/notifications" style="color:${primary};text-decoration:underline">จัดการการแจ้งเตือน / Manage notifications</a>` +
    `</td></tr></table></td></tr></table></body></html>`
  )
}

/**
 * The agencies the ingest reads, and the e-GP code each is queried by.
 *
 * `deptId` is the agency's standard government code with the middle zero
 * removed: the published table lists กรมบัญชีกลาง as 03004 and the feed answers
 * to 0304. Verified against the feed for 0303, 0304, 0305, 0307 and 0703 —
 * the last returns announcements whose titles name กรมชลประทาน outright.
 *
 * Source of the codes: "Government_Agency_code_2569.xlsx", Bank of Thailand,
 * registered on data.go.th as รหัสหน่วยงานราชการ (ds-1003) under Creative
 * Commons Attribution.
 *
 * **A wrong code returns an empty feed, not an error.** Nothing downstream can
 * tell that apart from an agency with nothing to announce, so codes belong here
 * only once they have answered with real announcements.
 *
 * State enterprises are deliberately absent: their table codes run past 99
 * (50101 องค์การตลาดเพื่อเกษตรกร, 50201 การนิคมอุตสาหกรรม) and both fold to
 * 5001, so the rule above cannot derive them. They need codes from a source
 * that states them directly.
 */

export type EgpAgency = {
  /** What the feed is queried with. */
  deptId: string
  /** Official name, as the code table writes it. Thai only — it has no English. */
  name: string
}

/**
 * Chosen from a survey of 219 agencies taken on 2026-10-21: one D0 request
 * each, titles read through the same software heuristic the ingest uses. These
 * published the most IT work that day.
 *
 * It is one day's snapshot, and most agencies scored 1-3, so the ordering below
 * is a starting point rather than a ranking. Re-survey once the ingest has run
 * for a while and the real rate is visible (`npm run report:announcements`).
 */
export const EGP_AGENCIES: EgpAgency[] = [
  // The original target, and still by far the largest single source: every BMA
  // bureau and district office files under one code, where a ministry is split
  // across a code per department.
  { deptId: "3100001", name: "กรุงเทพมหานคร" },
  { deptId: "1107", name: "สำนักงานพัฒนาธุรกรรมทางอิเล็กทรอนิกส์ (องค์การมหาชน)" },
  { deptId: "0903", name: "กรมควบคุมมลพิษ" },
  { deptId: "1308", name: "กรมพัฒนาธุรกิจการค้า" },
  { deptId: "1602", name: "สำนักงานปลัดกระทรวงยุติธรรม" },
  { deptId: "1905", name: "สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ" },
  { deptId: "2108", name: "กรมสุขภาพจิต" },
  { deptId: "2113", name: "สำนักงานหลักประกันสุขภาพแห่งชาติ" },
  { deptId: "2601", name: "สำนักงานคณะกรรมการการเลือกตั้ง" },
]

/**
 * Left out on purpose: their work is upcountry.
 *
 * This board is for suppliers who take Bangkok work, and a central agency's
 * code covers its offices nationwide — one announcement under 1508 was for
 * สำนักงานท้องถิ่นจังหวัดสงขลา. The feed has no geography parameter, so the
 * only cheap signal is whether the title names a province. Over 14 days of D0:
 *
 *   0906 กรมทรัพยากรน้ำ              20 of 36 titles named a province
 *   1508 กรมส่งเสริมการปกครองท้องถิ่น  3 of 18
 *   every agency above                0
 *   3100001 กรุงเทพมหานคร             0 of 116, as a local authority should be
 *
 * The signal is one-sided: a title naming no province is not proof of Bangkok,
 * only that it did not say. Most head-office purchases do not. So this filters
 * out the clearly-upcountry rather than proving the rest are local, and an
 * agency that turns out to buy for its regions belongs here too.
 */
export const EXCLUDED_FOR_GEOGRAPHY = ["0906", "1508"] as const

const BY_DEPT_ID = new Map(EGP_AGENCIES.map((agency) => [agency.deptId, agency]))

/** The agency for a code, or undefined when it is not one we ingest. */
export function agencyFor(deptId: string): EgpAgency | undefined {
  return BY_DEPT_ID.get(deptId)
}

/**
 * The agencies named by a comma-separated list of codes, or all of them when
 * the list is empty. An unknown code is an error rather than an empty feed
 * nobody notices.
 */
export function agenciesFrom(list: string | undefined): EgpAgency[] {
  const wanted = (list ?? "").split(",").map((part) => part.trim()).filter(Boolean)
  if (!wanted.length) return EGP_AGENCIES

  const unknown = wanted.filter((deptId) => !BY_DEPT_ID.has(deptId))
  if (unknown.length) {
    throw new Error(
      `Unknown agency code(s): ${unknown.join(", ")}. Known: ${EGP_AGENCIES.map((a) => a.deptId).join(", ")}`
    )
  }
  return wanted.map((deptId) => BY_DEPT_ID.get(deptId)!)
}

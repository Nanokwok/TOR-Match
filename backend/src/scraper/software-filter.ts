import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk"
import * as z from "zod/v4"

import { env } from "@/config/env"
import type { BmaListing, BmaProjectDetail } from "@/scraper/bma-client"

/**
 * Keeps the scraper on software work.
 *
 * BMA publishes ~273k announcements and almost none of them are software: a
 * run without this filter spends its extraction budget reading PDFs about
 * cleaning contracts and rubbish trucks. Filtering happens in three stages,
 * cheapest first, so the expensive one only ever sees plausible candidates:
 *
 *   1. `titleSuggestsSoftware`  — listing title, free
 *   2. `metadataRejects`        — detail page fields, free (one page load we
 *                                 already make)
 *   3. `classifyProject`        — Claude on title + metadata, ~$0.0001/project
 *
 * Only after all three does a PDF get downloaded and sent for full extraction.
 */

/**
 * Boilerplate that appears in most announcement titles regardless of subject.
 *
 * "ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์" is the *procurement method* (e-bidding),
 * not the work — leaving it in made every title containing it look like IT.
 */
const TITLE_BOILERPLATE = [
  /ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์/g,
  /วิธีประกวดราคาอิเล็กทรอนิกส์/g,
  /ประกวดราคาอิเล็กทรอนิกส์/g,
  /\(e-?bidding\)/gi,
  /e-?bidding/gi,
  /ด้วยวิธีเฉพาะเจาะจง/g,
  /โดยวิธีเฉพาะเจาะจง/g,
  /ด้วยวิธีคัดเลือก/g,
  /โดยวิธีคัดเลือก/g,
  /ด้วยวิธีตลาดอิเล็กทรอนิกส์/g,
  /วิธีตลาดอิเล็กทรอนิกส์/g,
  /\(e-?market\)/gi,
]

function withoutBoilerplate(title: string): string {
  return TITLE_BOILERPLATE.reduce((text, pattern) => text.replace(pattern, " "), title)
}

/**
 * Subjects that are never software, however the title is worded.
 *
 * Checked before the terms below because procurement titles routinely pair a
 * physical product with a system-sounding word — "เครื่องเอกซเรย์ระบบดิจิตอล"
 * is an X-ray machine, not a digital system.
 */
const EXCLUDED_SUBJECTS = [
  "ซื้อยา", "รายการยา", "เวชภัณฑ์", "ถุงมือ", "ถุงพลาสติก",
  "เอกซเรย์", "เอ็กซเรย์", "ผ่าตัด", "ผู้ป่วย", "โลหิต",
  "อาหาร", "ไม้ดอก", "ไม้ประดับ", "ภูมิทัศน์",
  "รักษาความปลอดภัย", "ทำความสะอาด", "ซักฟอก",
  "ก่อสร้าง", "ปรับปรุงอาคาร", "ระบายน้ำ", "ประปา",
  "เครื่องปรับอากาศ", "ลิฟต์", "รถยนต์", "ยานพาหนะ", "มูลฝอย",
]

/**
 * Terms that on their own make a title worth a detail-page visit.
 *
 * Each names software as the deliverable, not a component of something
 * physical, so one hit is enough.
 */
const STRONG_TERMS = [
  "ซอฟต์แวร์", "software", "โปรแกรม", "program",
  "แอปพลิเคชัน", "แอปพลิเคชั่น", "application",
  "เว็บไซต์", "website", "พอร์ทัล", "portal",
  "แพลตฟอร์ม", "platform", "สารสนเทศ", "ฐานข้อมูล", "database",
  "พัฒนาระบบ", "จัดทำระบบ", "ปรับปรุงระบบ", "บำรุงรักษาระบบ",
  "เทคโนโลยีสารสนเทศ", "คอมพิวเตอร์", "computer", "ไอที",
  "api", "ocr", "cloud", "คลาวด์",
]

/**
 * Terms too broad to decide on alone.
 *
 * "ระบบ" is the clearest case: BMA buys an X-ray machine "พร้อมระบบวัดแรงดัน"
 * and solar panels sold as "80 ระบบ". Real software work always pairs it with
 * something from STRONG_TERMS, so a lone weak hit is not enough.
 */
const WEAK_TERMS = [
  "ระบบ", "system", "ดิจิทัล", "ดิจิตอล", "digital",
  "ออนไลน์", "online", "เว็บ", "web", "แอป", "app", "ai",
]

/** Stage 1: does this listing title deserve a detail-page visit? */
export function titleSuggestsSoftware(listing: BmaListing): boolean {
  const title = withoutBoilerplate(listing.title)
  if (EXCLUDED_SUBJECTS.some((term) => title.includes(term))) return false

  const haystack = title.toLowerCase()
  if (STRONG_TERMS.some((term) => haystack.includes(term))) return true

  // Two weak signals together still count: "ระบบออนไลน์", "ระบบดิจิทัล".
  return WEAK_TERMS.filter((term) => haystack.includes(term)).length >= 2
}

/**
 * Categories the BMA site itself assigns that can never be a software build.
 *
 * Matching is on the detail page's own wording, so this rejects with certainty
 * rather than guessing — anything not listed here falls through to the model.
 */
const REJECTED_CATEGORY_TERMS = [
  "ทำความสะอาด",
  "รักษาความปลอดภัย",
  "ซักฟอก",
  "กำจัดขยะ",
  "เก็บขนมูลฝอย",
  "ยานพาหนะ",
  "รถยนต์",
  "ก่อสร้าง",
  "ปรับปรุงอาคาร",
  "วิทยาศาสตร์และการแพทย์",
  "เครื่องปรับอากาศ",
  "วัสดุครุภัณฑ์สำนักงาน",
  "อาหาร",
  "เครื่องแต่งกาย",
]

/** Stage 2: reject on the detail page's own category labels. Free. */
export function metadataRejects(detail: BmaProjectDetail): string | null {
  const fields = [
    detail.workType,
    detail.procurementItem,
    detail.procurementCategory,
  ]
    .filter(Boolean)
    .join(" ")

  const hit = REJECTED_CATEGORY_TERMS.find((term) => fields.includes(term))
  return hit ? `category "${hit}"` : null
}

const classificationSchema = z.object({
  isSoftwareProject: z
    .boolean()
    .describe("True only for software development or software services work."),
  reason: z.string().describe("One short sentence, in English, explaining the call."),
})

export type SoftwareClassification = z.infer<typeof classificationSchema>

const CLASSIFIER_PROMPT = `You screen Bangkok Metropolitan Administration procurement announcements for a platform that matches software companies to government work.

Answer one question: is this a project a software development company would bid on?

Count as software (isSoftwareProject: true):
- Building, customising or replacing an information system, web application, mobile app, portal, dashboard, or API
- Software maintenance, support, or enhancement contracts for an existing system
- Data platform, data migration, OCR/AI/analytics development work
- System integration where the deliverable is working software

Do NOT count as software (isSoftwareProject: false):
- Buying hardware off the shelf: computers, servers, tablets, printers, CCTV cameras, network equipment
- Cabling, electrical work, network or CCTV *installation* with no software deliverable
- Licences or subscriptions bought as a product, with no development work
- Anything physical or facilities-related: cleaning, security guards, laundry, food, vehicles, construction, air conditioning, medical equipment, office supplies
- Training, seminars, or consulting with no software deliverable

The line to hold: the contract must produce or maintain *software*. A project that mentions a "ระบบ" (system) but delivers drainage, air conditioning, or electrical work is not software. When a project mixes hardware purchase with system development, judge it by the main deliverable.

Titles are Thai. Judge only what the title and metadata state — do not assume unstated scope.`

let client: AnthropicVertex | null = null

function getClient(): AnthropicVertex {
  if (!env.vertexProjectId) {
    throw new Error(
      "VERTEX_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) must be set to classify projects.\n" +
        "Add it to backend/.env, and authenticate with:\n" +
        "  gcloud auth application-default login"
    )
  }
  client ??= new AnthropicVertex({
    projectId: env.vertexProjectId,
    region: env.vertexRegion,
  })
  return client
}

/**
 * Stage 3: Claude judges from the title and metadata only — never the PDF.
 *
 * That is the whole point: a few hundred tokens decides whether the tens of
 * thousands of tokens a PDF costs are worth spending.
 */
export async function classifyProject(
  detail: BmaProjectDetail
): Promise<SoftwareClassification> {
  const summary = [
    `ชื่อโครงการ: ${detail.title}`,
    `หน่วยงาน: ${detail.department}`,
    `ประเภทการจัดซื้อจัดจ้าง: ${detail.procurementType || "-"}`,
    `ด้านตามลักษณะงาน: ${detail.workType || "-"}`,
    `ประเภทพัสดุ: ${detail.procurementCategory || "-"}`,
    `พัสดุจัดหา: ${detail.procurementItem || "-"}`,
    `งบประมาณ (บาท): ${detail.budgetBaht ?? "-"}`,
  ].join("\n")

  const response = await getClient().messages.parse({
    model: env.classifierModel,
    max_tokens: 256,
    system: CLASSIFIER_PROMPT,
    output_config: { format: zodOutputFormat(classificationSchema) },
    messages: [{ role: "user", content: summary }],
  })

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error("Classification returned no parseable output")
  }
  return parsed
}

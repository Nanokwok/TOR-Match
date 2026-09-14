import { createHash } from "node:crypto"

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk"
// The SDK's zod helper is built against zod v4, which the installed zod 3.25
// ships alongside v3 under this subpath. The rest of the backend validates
// with the v3 API (`import { z } from "zod"`); only this schema needs v4.
import * as z from "zod/v4"

import { env } from "@/config/env"
import {
  PROCUREMENT_METHODS,
  PROCUREMENT_STATUSES,
  PROJECT_SCALES,
} from "@/models/tor-fields.schema"
import type { BmaProjectDetail } from "@/scraper/bma-client"

/**
 * Turns an announcement PDF into the structured TOR shape the app stores.
 *
 * Claude reads the PDF natively (document content block), which covers both
 * text-layer and scanned documents — that is why this pipeline has no separate
 * OCR pass.
 */

/** The API caps a request at 32MB and base64 inflates by ~4/3. */
const MAX_PDF_BYTES = 20 * 1024 * 1024

const localizedText = z.object({
  en: z.string().describe("English. Translate from the Thai source."),
  th: z.string().describe("Thai, as written in the document."),
})

const localizedList = z.object({
  en: z.array(z.string()),
  th: z.array(z.string()),
})

const extractionSchema = z.object({
  title: localizedText,
  department: localizedText,
  localOffice: localizedText,
  summary: localizedText.describe("2-4 sentences on what is being procured."),
  deliverables: localizedList,
  projectScale: z.enum(PROJECT_SCALES),
  durationDays: z.number().describe("Contract length in days. 0 if not stated."),
  method: z.enum(PROCUREMENT_METHODS),
  status: z.enum(PROCUREMENT_STATUSES),
  deadline: z.string().describe('Bid submission deadline, "YYYY-MM-DDTHH:mm:ss+07:00". Empty string if absent.'),
  announcementDate: z.string().describe('Same format as deadline.'),
  budgetBaht: z.number(),
  medianPriceBaht: z.number().describe("ราคากลาง. 0 if not stated."),
  techTags: z.array(z.string()).describe("Technologies named in the TOR, e.g. React, Oracle, CCTV."),
  listTags: z.array(z.string()).describe("Short English category labels for browse filters."),
  milestones: z.array(
    z.object({
      day: z.number(),
      milestoneNumber: z.number(),
      percent: z.number(),
      amountBaht: z.number(),
      deliverable: localizedText,
    })
  ),
  qualificationRequirements: z.array(
    z.object({
      requirement: localizedText.describe("What the bidder must have, e.g. registered capital."),
      torCriteria: localizedText.describe("The threshold the TOR sets for it."),
      autoCheckable: z
        .boolean()
        .describe("True only if a company profile field could verify this without human judgement."),
    })
  ),
  aiConfidence: z
    .number()
    .describe("0-100: how completely and reliably this TOR was extracted. Be honest; low means a reviewer must check it."),
})

export type TorExtraction = z.infer<typeof extractionSchema>

const SYSTEM_PROMPT = `You extract structured data from Thai government procurement announcements (TOR) for Bangkok Metropolitan Administration.

Rules:
- Populate BOTH locales on every localized field. The source is Thai: copy the Thai into "th" and write a faithful English translation into "en". Never leave "en" empty — downstream filtering keys on it.
- Extract only what the document and the supplied page metadata actually state. Do not invent budgets, dates, or requirements. If something is absent, use an empty string, an empty array, or 0.
- Convert Buddhist-era years to CE (2569 -> 2026) and emit dates as YYYY-MM-DDTHH:mm:ss+07:00.
- "method" must reflect the stated procurement method: ประกวดราคาอิเล็กทรอนิกส์/e-bidding -> "e-bidding", ตลาดอิเล็กทรอนิกส์/e-market -> "e-market", คัดเลือก -> "selective", เฉพาะเจาะจง -> "specific", ตกลงราคา/ราคาคงที่ -> "price-agreement".
- "projectScale" follows the budget: under 5M baht SMALL, 5-20M MEDIUM, 20-100M LARGE, above 100M ENTERPRISE.
- Payment milestone amounts should reconcile with percent x total budget.
- Set aiConfidence honestly. A scanned document you struggled to read, or one missing the qualification section, deserves a low score — it routes the draft to a human.`

let client: AnthropicVertex | null = null

/**
 * Claude via Google Vertex AI.
 *
 * There is no API key: the SDK authenticates with GCP Application Default
 * Credentials, so a developer runs `gcloud auth application-default login`
 * once (or sets GOOGLE_APPLICATION_CREDENTIALS to a service-account file).
 * The model must also be enabled for the project in Vertex Model Garden.
 */
function getClient(): AnthropicVertex {
  if (!env.vertexProjectId) {
    throw new Error(
      "VERTEX_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) must be set to run extraction.\n" +
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
 * A stable id for a qualification row.
 *
 * Company profile matches reference these (CompanyProfileMatch.requirementId),
 * so they must not change when the same announcement is scraped again — which
 * rules out asking the model to invent them.
 */
function qualificationId(announcementNo: string, requirementEn: string): string {
  const digest = createHash("sha1")
    .update(`${announcementNo}::${requirementEn.trim().toLowerCase()}`)
    .digest("hex")
  return `req-${digest.slice(0, 10)}`
}

export async function extractTorFromPdf(
  detail: BmaProjectDetail,
  pdf: Buffer
): Promise<TorExtraction & { qualificationIds: string[] }> {
  if (pdf.byteLength > MAX_PDF_BYTES) {
    throw new Error(`PDF is ${(pdf.byteLength / 1024 / 1024).toFixed(1)}MB, above the ${MAX_PDF_BYTES / 1024 / 1024}MB limit`)
  }

  // Page metadata is more reliable than the PDF for these fields, so hand it
  // over as ground truth rather than making the model re-read them.
  const pageContext = [
    `เลขที่โครงการ: ${detail.projectNo}`,
    `ชื่อโครงการ: ${detail.title}`,
    `หน่วยงาน: ${detail.department}`,
    `ส่วนราชการ: ${detail.government || "-"}`,
    `ส่วนราชการย่อย: ${detail.subGovernment || "-"}`,
    `ประเภทการจัดซื้อจัดจ้าง: ${detail.procurementType || "-"}`,
    `ด้านตามลักษณะงาน: ${detail.workType || "-"}`,
    `งบประมาณ (บาท): ${detail.budgetBaht ?? "-"}`,
    `ราคากลาง (บาท): ${detail.medianPriceBaht ?? "-"}`,
    `สถานะโครงการ: ${detail.projectStatus || "-"}`,
  ].join("\n")

  const response = await getClient().messages.parse({
    model: env.extractionModel,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(extractionSchema) },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdf.toString("base64"),
            },
          },
          {
            type: "text",
            text: `Announcement page metadata (authoritative — prefer it over the PDF where they disagree):\n\n${pageContext}\n\nExtract this TOR.`,
          },
        ],
      },
    ],
  })

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error("Extraction returned no parseable output")
  }

  return {
    ...parsed,
    qualificationIds: parsed.qualificationRequirements.map((row) =>
      qualificationId(detail.projectNo, row.requirement.en)
    ),
  }
}

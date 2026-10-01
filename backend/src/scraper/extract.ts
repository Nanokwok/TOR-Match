// `resolution-mode` because @google/genai is ESM-only: under CommonJS
// resolution TypeScript would otherwise refuse the type-only import.
import type { GoogleGenAI } from "@google/genai" with { "resolution-mode": "import" }
// zod 3.25 ships v4 alongside v3 under this subpath. The rest of the backend
// validates with the v3 API (`import { z } from "zod"`); this file needs v4
// for `toJSONSchema`, which renders the schema Gemini is constrained to.
import * as z from "zod/v4"

import { env } from "@/config/env"
import { CERTIFICATION_IDS, QUALIFICATION_KEYS } from "@/domain/qualification-taxonomy"
import {
  PROCUREMENT_METHODS,
  PROCUREMENT_STATUSES,
  PROJECT_SCALES,
} from "@/models/tor-fields.schema"
import type { BmaProjectDetail } from "@/scraper/bma-client"
import {
  repairQualifications,
  type StoredQualification,
} from "@/scraper/qualification-repair"
import type { TorDocument } from "@/scraper/tor-documents"

/**
 * What the announcement source already knows, handed to the model as ground
 * truth so it does not have to re-read those fields out of the PDF.
 *
 * Kept source-agnostic: the BMA site supplies a rich detail page, while the
 * CGD RSS feed supplies only a title and a project number. Either way the
 * project number is required — it keys the draft in the database.
 */
export type ExtractionContext = {
  projectNo: string
  /** Rendered into the prompt as "label: value"; empty values become "-". */
  metadata: Record<string, string | number | null | undefined>
}

/** Builds the context from a BMA detail page. */
export function contextFromBmaDetail(detail: BmaProjectDetail): ExtractionContext {
  return {
    projectNo: detail.projectNo,
    metadata: {
      "ชื่อโครงการ": detail.title,
      "หน่วยงาน": detail.department,
      "ส่วนราชการ": detail.government,
      "ส่วนราชการย่อย": detail.subGovernment,
      "ประเภทการจัดซื้อจัดจ้าง": detail.procurementType,
      "ด้านตามลักษณะงาน": detail.workType,
      "งบประมาณ (บาท)": detail.budgetBaht,
      "ราคากลาง (บาท)": detail.medianPriceBaht,
      "สถานะโครงการ": detail.projectStatus,
    },
  }
}

/**
 * Turns an announcement PDF into the structured TOR shape the app stores.
 *
 * Gemini reads the PDF natively (inline document part), which covers both
 * text-layer and scanned documents — that is why this pipeline has no separate
 * OCR pass.
 *
 * Gemini rather than Claude because Vertex serves Anthropic models at a zero
 * quota that Google only lifts for accounts with a corporate domain and an
 * assigned sales representative; Google's own models need no such approval.
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
      key: z
        .enum(QUALIFICATION_KEYS)
        .describe('Which shared requirement type this is. Use "manual" when none fits.'),
      requirement: localizedText.describe("What the bidder must have, e.g. registered capital."),
      torCriteria: localizedText.describe("The threshold the TOR sets for it, quoted from the document."),
      thresholdThb: z
        .number()
        .describe("The baht figure this clause states, exactly as written. 0 if it states none."),
      certificationIds: z
        .array(z.enum(CERTIFICATION_IDS))
        .describe('Empty unless key is "certification".'),
      certificationMode: z
        .enum(["any", "all"])
        .describe('Whether all listed certificates are required or any one. "any" if unclear.'),
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
- Set aiConfidence honestly. A scanned document you struggled to read, or one missing the qualification section, deserves a low score — it routes the draft to a human.

Qualifications — one row per distinct clause. Never merge two certificates, or two past-performance clauses, into one row.
Pick "key" from this list by what the clause is asking for:
- "registered-capital" — ทุนจดทะเบียน. Put the baht figure in thresholdThb.
- "past-contract" — ผลงาน/ประสบการณ์ with a contract value. Put the baht figure in thresholdThb. A ผลงาน clause about the TYPE of work with no figure is "manual".
- "certification" — a certificate the company holds: ISO, IEC, CMMI, ใบรับรองระบบ. List them in certificationIds; a standard not on the allowed list goes in torCriteria text with certificationIds left empty.
- "egp-registered" — ลงทะเบียนในระบบ e-GP / ผู้ค้าอิเล็กทรอนิกส์.
- "not-blacklisted" — ไม่เป็นผู้ทิ้งงาน.
- "company-size" — ขนาดกิจการ / วิสาหกิจขนาดกลางและขนาดย่อม.
- "specialization" — a named field of expertise the bidder must work in.
- "manual" — everything else. Use it for มูลค่าสุทธิของกิจการ, ระยะเวลาการประกอบธุรกิจ, ผู้มีอาชีพขาย/รับจ้าง, นิติบุคคล, ไม่เป็นบุคคลล้มละลาย, มีความสามารถตามกฎหมาย. These are real requirements — still fill requirement and torCriteria; the bidder confirms them.
- thresholdThb is the figure the clause states, with no unit conversion and no inference from the project budget. If the clause states no figure, use 0 — never guess one.`

let client: GoogleGenAI | null = null

/**
 * Gemini through Vertex AI.
 *
 * There is no API key: the SDK authenticates with GCP Application Default
 * Credentials, so a developer runs `gcloud auth application-default login`
 * once (or sets GOOGLE_APPLICATION_CREDENTIALS to a service-account file).
 */
async function getClient(): Promise<GoogleGenAI> {
  if (!env.vertexProjectId) {
    throw new Error(
      "VERTEX_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) must be set to run extraction.\n" +
        "Add it to backend/.env, and authenticate with:\n" +
        "  gcloud auth application-default login"
    )
  }
  if (!client) {
    // Imported dynamically: @google/genai ships as ESM, and this backend
    // compiles to CommonJS, where a static import would not resolve.
    const { GoogleGenAI } = await import("@google/genai")
    client = new GoogleGenAI({
      vertexai: true,
      project: env.vertexProjectId,
      location: env.vertexRegion,
    })
  }
  return client
}

export async function extractTorFromPdf(
  context: ExtractionContext,
  documents: TorDocument[]
): Promise<Omit<TorExtraction, "qualificationRequirements"> & {
  qualificationRequirements: StoredQualification[]
}> {
  if (documents.length === 0) {
    throw new Error("No documents to extract from")
  }

  const totalBytes = documents.reduce((sum, d) => sum + d.pdf.byteLength, 0)
  if (totalBytes > MAX_PDF_BYTES) {
    throw new Error(
      `Documents total ${(totalBytes / 1024 / 1024).toFixed(1)}MB, above the ${MAX_PDF_BYTES / 1024 / 1024}MB limit`
    )
  }

  // Source metadata is more reliable than the PDF for these fields, so hand it
  // over as ground truth rather than making the model re-read them.
  const pageContext = [
    `เลขที่โครงการ: ${context.projectNo}`,
    ...Object.entries(context.metadata).map(([label, value]) => {
      const printable =
        value === null || value === undefined || value === "" ? "-" : value
      return `${label}: ${printable}`
    }),
  ].join("\n")

  const ai = await getClient()
  const response = await ai.models.generateContent({
    model: env.extractionModel,
    contents: [
      {
        role: "user",
        parts: [
          // Ranked best-first by the caller, so the tender document — the only
          // one carrying real bidder qualifications — is read before the
          // announcement that merely refers to it.
          ...documents.map((document) => ({
            inlineData: {
              mimeType: "application/pdf",
              data: document.pdf.toString("base64"),
            },
          })),
          {
            text:
              `Announcement metadata (authoritative — prefer it over the documents where they disagree):\n\n${pageContext}\n\n` +
              `Documents attached, in order: ${documents.map((d) => d.name).join(", ")}.\n\n` +
              `Extract this TOR.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      // A full tender document runs to 25-30 qualification clauses, each
      // carrying both locales of two sentences plus its rule — which overran
      // the previous 16000 and truncated the JSON mid-object.
      maxOutputTokens: 40000,
      responseMimeType: "application/json",
      // The same zod schema the result is validated against, so the constraint
      // the model is given and the contract the caller relies on cannot drift.
      responseJsonSchema: z.toJSONSchema(extractionSchema),
    },
  })

  // A response cut short by maxOutputTokens leaves truncated JSON, which would
  // otherwise surface as a confusing parse error deep in the pipeline.
  if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new Error("Extraction hit the output token limit before finishing")
  }

  const text = response.text
  if (!text) {
    throw new Error("Extraction returned no output")
  }

  // Validated rather than cast: `responseJsonSchema` constrains the model but
  // the SDK does not check the result, and a draft built from an unvalidated
  // shape would fail later against the Mongoose schema instead of here.
  const parsed = extractionSchema.parse(JSON.parse(text))

  return {
    ...parsed,
    // Verified against the document before it is trusted: the model's key is
    // second-guessed by the Thai term lists, and its threshold is re-read out
    // of the clause. Anything the two disagree on becomes a manual row.
    qualificationRequirements: repairQualifications(parsed.qualificationRequirements),
  }
}

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

/**
 * One announcement's trip through the ingestion pipeline, surfaced in
 * /admin/scraper-ocr.
 *
 * The stage names match the admin UI's existing OcrJobStage union. "ocr" is
 * currently never produced — Claude reads the announcement PDF directly, so
 * there is no separate OCR pass — but the value is kept so the UI's exhaustive
 * stage-label map stays valid if an OCR fallback is added later.
 */

export const SCRAPE_JOB_STAGES = ["scrape", "ocr", "parse", "index"] as const
export const SCRAPE_JOB_STATUSES = ["running", "success", "failure"] as const

const scrapeJobSchema = new Schema(
  {
    /** Announcement number when known, else the source file name. Shown as "Document Source". */
    documentSource: { type: String, required: true },
    sourceUrl: { type: String, default: "" },
    stage: { type: String, enum: SCRAPE_JOB_STAGES, default: "scrape" },
    status: { type: String, enum: SCRAPE_JOB_STATUSES, default: "running", index: true },
    pages: { type: Number, default: 0 },
    attempts: { type: Number, default: 1 },
    errorMessage: { type: String, default: "" },
    draftId: { type: Schema.Types.ObjectId, ref: "TorDraft", default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export type ScrapeJobDoc = HydratedDocument<InferSchemaType<typeof scrapeJobSchema>>

export const ScrapeJob = model("ScrapeJob", scrapeJobSchema)

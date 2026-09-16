/**
 * Ingests BMA procurement announcements into the TorDraft review queue.
 *
 *   npm run scrape                                  # defaults below
 *   npm run scrape -- --pages 3 --limit 5
 *   npm run scrape -- --min-budget 5000000 --keyword ระบบ
 *   npm run scrape -- --dry-run                     # discover + filter only, no PDF, no LLM
 *   npm run scrape -- --no-extract                  # metadata-only drafts, no PDF, no LLM
 *
 * --no-extract builds drafts from the announcement page alone (Thai title,
 * department, budget, median price, method, TOR link). Everything that lives
 * only inside the PDF — English, summary, deliverables, milestones,
 * qualifications — plus the deadline stays empty. The draft can be approved
 * as-is: browse renders missing fields as "not specified".
 *
 * Nothing here writes to the published `tors` collection — drafts land in
 * `tordrafts` and a human publishes them from /admin/tor-review.
 *
 * Unless --dry-run, extraction runs through Vertex AI and needs
 * VERTEX_PROJECT_ID plus GCP credentials (`gcloud auth application-default
 * login`). Also a one-time `npx playwright install chromium`.
 */
import type { BrowserContext, Page } from "playwright"

import { connectDB, disconnectDB } from "@/config/db"
import { ScrapeJob } from "@/models/ScrapeJob.model"
import { Tor } from "@/models/Tor.model"
import { AUTO_APPROVE_CONFIDENCE_THRESHOLD, TorDraft } from "@/models/TorDraft.model"
import { PROCUREMENT_METHODS, PROJECT_SCALES } from "@/models/tor-fields.schema"
import {
  discoverListings,
  downloadDocument,
  fetchProjectDetail,
  launchBrowser,
  parseThaiDate,
  pickTorDocument,
  type BmaListing,
} from "@/scraper/bma-client"
import { extractTorFromPdf } from "@/scraper/extract"

type Options = {
  pages: number
  limit: number
  minBudget: number
  keyword: string
  dryRun: boolean
  noExtract: boolean
}

function parseArgs(argv: string[]): Options {
  const read = (flag: string): string | undefined => {
    const index = argv.indexOf(flag)
    return index >= 0 ? argv[index + 1] : undefined
  }

  return {
    pages: Number(read("--pages") ?? 2),
    limit: Number(read("--limit") ?? 10),
    // The site carries ~273k announcements, the vast majority of them small
    // non-IT purchases. Without a floor a run would spend its budget on tent
    // rentals, so filter before paying for detail pages and extraction.
    minBudget: Number(read("--min-budget") ?? 1_000_000),
    keyword: read("--keyword") ?? "",
    dryRun: argv.includes("--dry-run"),
    noExtract: argv.includes("--no-extract"),
  }
}

/** Same bands the extraction prompt gives the model. */
function scaleForBudget(budgetBaht: number): (typeof PROJECT_SCALES)[number] {
  if (budgetBaht < 5_000_000) return "SMALL"
  if (budgetBaht < 20_000_000) return "MEDIUM"
  if (budgetBaht <= 100_000_000) return "LARGE"
  return "ENTERPRISE"
}

/**
 * District offices name themselves "สำนักงานเขตX"; the local-office filter
 * lists districts as "เขตX" (matching the seeded TORs), so strip the prefix.
 */
function localOfficeFrom(detail: { department: string; government: string; subGovernment: string }): string {
  const district = detail.department.match(/^สำนักงาน(เขต.+)$/)
  if (district) return district[1].trim()
  return detail.subGovernment || detail.government || detail.department
}

/** "ประเภทการจัดซื้อจัดจ้าง" as the page renders it -> our method enum. */
function methodFromProcurementType(raw: string): (typeof PROCUREMENT_METHODS)[number] | null {
  if (/e-bidding|ประกวดราคา/i.test(raw)) return "e-bidding"
  if (/e-market|ตลาดอิเล็กทรอนิกส์/i.test(raw)) return "e-market"
  if (/คัดเลือก/.test(raw)) return "selective"
  if (/เฉพาะเจาะจง/.test(raw)) return "specific"
  if (/ตกลงราคา|ราคาคงที่/.test(raw)) return "price-agreement"
  return null
}

async function ingestMetadataOnly(listing: BmaListing, page: Page): Promise<void> {
  const job = await ScrapeJob.create({
    documentSource: listing.projectNo,
    sourceUrl: listing.detailUrl,
    stage: "scrape",
    status: "running",
  })

  try {
    const detail = await fetchProjectDetail(page, listing)
    const document = pickTorDocument(detail.documents)
    const budgetBaht = detail.budgetBaht ?? 0

    let method = methodFromProcurementType(detail.procurementType)
    if (!method) {
      console.warn(
        `[scrape] ${detail.projectNo}: unknown procurement type "${detail.procurementType}", defaulting to e-bidding for the reviewer to correct`
      )
      method = "e-bidding"
    }

    job.set({ stage: "index" })
    await job.save()

    // $setOnInsert only: an existing draft may hold AI extraction or a
    // reviewer's edits, and page metadata is strictly less than either.
    const result = await TorDraft.updateOne(
      { announcementNo: detail.projectNo },
      {
        $setOnInsert: {
          announcementNo: detail.projectNo,
          title: { en: "", th: detail.title },
          department: { en: "", th: detail.department },
          localOffice: { en: "", th: localOfficeFrom(detail) },
          summary: { en: "", th: "" },
          deliverables: { en: [], th: [] },
          budgetBaht,
          projectScale: scaleForBudget(budgetBaht),
          durationDays: 0,
          method,
          status: "open",
          deadline: "",
          announcementDate: (document && parseThaiDate(document.postedDate)) || "",
          sourceUrl: detail.detailUrl,
          pdfUrl: document?.url ?? "",
          techTags: [],
          listTags: [],
          financials: {
            totalBudgetBaht: budgetBaht,
            medianPriceBaht: detail.medianPriceBaht ?? budgetBaht,
            method,
            milestones: [],
          },
          qualificationRequirements: [],
          aiConfidence: 0,
          reviewStatus: "need-review",
          sourceJobId: job._id,
        },
      },
      { upsert: true, runValidators: true }
    )

    const draft = await TorDraft.findOne({ announcementNo: detail.projectNo }).select("_id")
    job.set({ status: "success", draftId: draft?._id ?? null, finishedAt: new Date() })
    await job.save()

    console.log(
      `[scrape] ${detail.projectNo} -> ${result.upsertedCount ? "metadata draft" : "draft already exists, left untouched"} ${detail.title.slice(0, 60)}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    job.set({ status: "failure", errorMessage: message, finishedAt: new Date() })
    await job.save()
    console.error(`[scrape] ${listing.projectNo} failed: ${message}`)
  }
}

/** Approximate page count, for the admin job table only. */
function countPdfPages(pdf: Buffer): number {
  const matches = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g)
  return matches?.length ?? 0
}

function matchesFilters(listing: BmaListing, options: Options): boolean {
  if ((listing.budgetBaht ?? 0) < options.minBudget) return false
  if (options.keyword && !listing.title.includes(options.keyword)) return false
  return true
}

async function ingest(
  listing: BmaListing,
  page: Page,
  context: BrowserContext
): Promise<void> {
  const job = await ScrapeJob.create({
    documentSource: listing.projectNo,
    sourceUrl: listing.detailUrl,
    stage: "scrape",
    status: "running",
  })

  try {
    const detail = await fetchProjectDetail(page, listing)

    const document = pickTorDocument(detail.documents)
    if (!document) {
      throw new Error("No TOR document attached to this announcement")
    }

    job.set({ stage: "parse" })
    await job.save()

    const pdf = await downloadDocument(context, document.url)
    if (!pdf) throw new Error(`Could not download ${document.url}`)

    const extraction = await extractTorFromPdf(detail, pdf)

    job.set({ stage: "index", pages: countPdfPages(pdf) })
    await job.save()

    const announcementDate =
      extraction.announcementDate || parseThaiDate(document.postedDate) || ""

    await TorDraft.findOneAndUpdate(
      { announcementNo: detail.projectNo },
      {
        $set: {
          announcementNo: detail.projectNo,
          title: extraction.title,
          department: extraction.department,
          localOffice: extraction.localOffice,
          summary: extraction.summary,
          deliverables: extraction.deliverables,
          budgetBaht: extraction.budgetBaht,
          projectScale: extraction.projectScale,
          durationDays: extraction.durationDays,
          method: extraction.method,
          status: extraction.status,
          deadline: extraction.deadline,
          announcementDate,
          sourceUrl: detail.detailUrl,
          pdfUrl: document.url,
          techTags: extraction.techTags,
          listTags: extraction.listTags,
          financials: {
            totalBudgetBaht: extraction.budgetBaht,
            medianPriceBaht: extraction.medianPriceBaht,
            method: extraction.method,
            milestones: extraction.milestones,
          },
          qualificationRequirements: extraction.qualificationRequirements.map(
            (row, index) => ({
              id: extraction.qualificationIds[index],
              requirement: row.requirement,
              torCriteria: row.torCriteria,
              autoCheckable: row.autoCheckable,
            })
          ),
          aiConfidence: extraction.aiConfidence,
          reviewStatus:
            extraction.aiConfidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD
              ? "auto-approved"
              : "need-review",
          sourceJobId: job._id,
        },
      },
      { new: true, upsert: true, runValidators: true }
    )

    const draft = await TorDraft.findOne({ announcementNo: detail.projectNo })
    job.set({
      status: "success",
      draftId: draft?._id ?? null,
      finishedAt: new Date(),
    })
    await job.save()

    console.log(
      `[scrape] ${detail.projectNo} -> draft (confidence ${extraction.aiConfidence}) ${detail.title.slice(0, 60)}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    job.set({ status: "failure", errorMessage: message, finishedAt: new Date() })
    await job.save()
    console.error(`[scrape] ${listing.projectNo} failed: ${message}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  console.log("[scrape] options:", options)

  await connectDB()
  const { browser, context } = await launchBrowser()
  const page = await context.newPage()

  try {
    const listings = await discoverListings(page, { pages: options.pages })
    console.log(`[scrape] discovered ${listings.length} announcements`)

    const candidates = listings.filter((listing) => matchesFilters(listing, options))
    console.log(
      `[scrape] ${candidates.length} pass filters (min budget ${options.minBudget.toLocaleString()} baht${options.keyword ? `, keyword "${options.keyword}"` : ""})`
    )

    // Anything already published has been through a human; re-extracting it
    // would spend API budget to produce a draft nobody needs.
    const publishedNos = new Set(
      (await Tor.find({ announcementNo: { $in: candidates.map((c) => c.projectNo) } })
        .select("announcementNo")
        .lean()).map((tor) => tor.announcementNo)
    )

    const queue = candidates
      .filter((listing) => !publishedNos.has(listing.projectNo))
      .slice(0, options.limit)

    console.log(`[scrape] ingesting ${queue.length} (skipped ${publishedNos.size} already published)`)

    if (options.dryRun) {
      for (const listing of queue) {
        console.log(
          `  [dry-run] ${listing.projectNo}  ${(listing.budgetBaht ?? 0).toLocaleString()} baht  ${listing.title.slice(0, 70)}`
        )
      }
      return
    }

    for (const listing of queue) {
      if (options.noExtract) {
        await ingestMetadataOnly(listing, page)
      } else {
        await ingest(listing, page, context)
      }
    }
  } finally {
    await browser.close()
    await disconnectDB()
  }
}

main().catch(async (error) => {
  console.error("[scrape] failed:", error)
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})

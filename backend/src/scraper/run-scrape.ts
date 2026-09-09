/**
 * Ingests BMA procurement announcements into the TorDraft review queue.
 *
 *   npm run scrape                                  # defaults below
 *   npm run scrape -- --pages 3 --limit 5
 *   npm run scrape -- --min-budget 5000000 --keyword ระบบ
 *   npm run scrape -- --dry-run                     # discover + filter only, no PDF, no LLM
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
      await ingest(listing, page, context)
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

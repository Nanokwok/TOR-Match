/**
 * Ingests BMA procurement announcements into the TorDraft review queue.
 *
 *   npm run scrape                                  # defaults below
 *   npm run scrape -- --pages 3 --limit 5
 *   npm run scrape -- --min-budget 5000000 --keyword ระบบ
 *   npm run scrape -- --dry-run                     # discover + filter only, no PDF, no LLM
 *   npm run scrape -- --no-extract                  # metadata-only drafts, no PDF, no LLM
 *   npm run scrape -- --refresh                     # re-read pages of published TORs
 *   npm run scrape -- --re-extract                  # redo drafts that already exist
 *
 * --no-extract builds drafts from the announcement page alone (Thai title,
 * department, budget, median price, method, TOR link). Everything that lives
 * only inside the PDF — English, summary, deliverables, milestones,
 * qualifications — plus the deadline stays empty. The draft can be approved
 * as-is: browse renders missing fields as "not specified".
 *
 * --refresh re-reads the announcement page of every published TOR and updates
 * the fields the page decides — status, bid date, category tags, contract
 * length — on both the TOR and its draft. Announcements move on (bidding
 * opens, contracts get signed, projects get cancelled); nothing else would
 * ever update a published TOR.
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
import { PROCUREMENT_METHODS, PROCUREMENT_STATUSES, PROJECT_SCALES } from "@/models/tor-fields.schema"
import {
  discoverListings,
  downloadDocument,
  fetchProjectDetail,
  launchBrowser,
  parseThaiDate,
  pickTorDocument,
  rankTorDocuments,
  type BmaListing,
  type BmaProjectDetail,
} from "@/scraper/bma-client"
import { contextFromBmaDetail, extractTorFromPdf } from "@/scraper/extract"
import {
  classifyProject,
  metadataRejects,
  titleSuggestsSoftware,
} from "@/scraper/software-filter"

type Options = {
  pages: number
  limit: number
  minBudget: number
  keyword: string
  dryRun: boolean
  noExtract: boolean
  refresh: boolean
  reExtract: boolean
  allCategories: boolean
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
    refresh: argv.includes("--refresh"),
    reExtract: argv.includes("--re-extract"),
    // The platform exists to match software companies to government work, so
    // non-software announcements are filtered out by default. --all keeps them.
    allCategories: argv.includes("--all"),
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

const CLOSING_SOON_DAYS = 7

/**
 * The TOR fields an announcement page decides, derived from what it shows.
 *
 * Only values the page actually states are returned; callers leave everything
 * else alone. Status follows the page's project status first, then the bid
 * date: a cancelled project is closed even if its date is in the future.
 */
/** What the site prints when a field has no value — never a useful tag. */
const PLACEHOLDER_TAGS = new Set(["ไม่ระบุ", "-", "—", "n/a", "N/A"])

/**
 * Browse filter chips built from the announcement's own categories.
 *
 * De-duplicated because the two source fields often repeat each other (and are
 * both "ไม่ระบุ" when the announcement states neither), and a repeated tag
 * renders as a duplicate React key in the browse list.
 */
function browseTags(...values: (string | undefined)[]): string[] {
  const tags = values
    .map((value) => value?.trim() ?? "")
    .filter((value) => value && !PLACEHOLDER_TAGS.has(value))
  return [...new Set(tags)]
}

function pageDerivedFields(detail: BmaProjectDetail, now = new Date()) {
  const bidDateMatch = detail.bidDate.match(/\d{1,2}\/\d{1,2}\/\d{4}/)
  const deadline = bidDateMatch ? parseThaiDate(bidDateMatch[0]) ?? "" : ""

  let status: (typeof PROCUREMENT_STATUSES)[number] = "open"
  if (/ยกเลิก/.test(detail.projectStatus)) {
    status = "closed"
  } else if (/สัญญา|ประกาศผู้ชนะ|ประกาศผล/.test(detail.projectStatus)) {
    status = "awarded"
  } else if (deadline) {
    const msLeft = new Date(deadline).getTime() - now.getTime()
    if (msLeft < 0) status = "closed"
    else if (msLeft < CLOSING_SOON_DAYS * 24 * 60 * 60 * 1000) status = "closing-soon"
  }

  return {
    status,
    deadline,
    // "ประเภทการจัดหา" and "พัสดุจัดหา", e.g. "เช่า" / "เช่ารถยนต์ที่ใช้ในราชการ".
    listTags: browseTags(detail.procurementCategory, detail.procurementItem),
    durationDays: detail.contractDurationDays ?? 0,
  }
}

/** Re-reads each published TOR's page and applies {@link pageDerivedFields}. */
async function refreshPublished(page: Page): Promise<void> {
  const tors = await Tor.find({ sourceUrl: { $regex: "/project-detail/" } })
    .select("announcementNo sourceUrl title budgetBaht department status deadline listTags durationDays")
  console.log(`[refresh] ${tors.length} published TORs`)

  for (const tor of tors) {
    try {
      const detail = await fetchProjectDetail(page, {
        detailUrl: tor.sourceUrl,
        projectNo: tor.announcementNo,
        title: tor.title.th,
        department: tor.department.th,
        budgetBaht: tor.budgetBaht,
      })
      const derived = pageDerivedFields(detail)

      // Page-stated values win; an empty page value never erases stored data
      // (e.g. a deadline an admin or the AI filled in from the PDF).
      const update: Record<string, unknown> = { status: derived.status }
      if (derived.deadline) update.deadline = derived.deadline
      if (derived.listTags.length) update.listTags = derived.listTags
      if (derived.durationDays) update.durationDays = derived.durationDays

      await Tor.updateOne({ _id: tor._id }, { $set: update }, { runValidators: true })
      await TorDraft.updateOne({ announcementNo: tor.announcementNo }, { $set: update }, { runValidators: true })

      const changed = Object.keys(update).filter(
        (key) => JSON.stringify(update[key]) !== JSON.stringify(tor.get(key))
      )
      console.log(
        `[refresh] ${tor.announcementNo} ${changed.length ? `updated ${changed.map((k) => `${k}=${JSON.stringify(update[k])}`).join(", ")}` : "unchanged"} (page status: ${detail.projectStatus || "-"})`
      )
    } catch (error) {
      console.error(`[refresh] ${tor.announcementNo} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
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

    const derived = pageDerivedFields(detail)

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
          durationDays: derived.durationDays,
          method,
          status: derived.status,
          deadline: derived.deadline,
          announcementDate: (document && parseThaiDate(document.postedDate)) || "",
          sourceUrl: detail.detailUrl,
          pdfUrl: document?.url ?? "",
          techTags: [],
          listTags: derived.listTags,
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

/**
 * How many attached documents one extraction reads, and their combined size.
 *
 * Two covers the split the site publishes to — tender plus invitation — and
 * the cap stays under the 20MB the extractor enforces.
 */
const MAX_EXTRACTION_DOCUMENTS = 2
const MAX_EXTRACTION_BYTES = 18 * 1024 * 1024

/** Approximate page count, for the admin job table only. */
function countPdfPages(pdf: Buffer): number {
  const matches = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g)
  return matches?.length ?? 0
}

function matchesFilters(listing: BmaListing, options: Options): boolean {
  if ((listing.budgetBaht ?? 0) < options.minBudget) return false
  if (options.keyword && !listing.title.includes(options.keyword)) return false
  // Stage 1 of the software filter: free, and keeps the detail-page fetches
  // below down to plausible candidates.
  if (!options.allCategories && !titleSuggestsSoftware(listing)) return false
  return true
}

async function ingest(
  listing: BmaListing,
  page: Page,
  context: BrowserContext,
  options: Options
): Promise<void> {
  const job = await ScrapeJob.create({
    documentSource: listing.projectNo,
    sourceUrl: listing.detailUrl,
    stage: "scrape",
    status: "running",
  })

  try {
    const detail = await fetchProjectDetail(page, listing)

    // Stages 2 and 3 of the software filter. Both run before the PDF is
    // downloaded, so a rejected announcement never costs an extraction.
    if (!options.allCategories) {
      const rejected = metadataRejects(detail)
      if (rejected) {
        job.set({ status: "skipped", message: `Not software: ${rejected}` })
        await job.save()
        console.log(`[scrape] skip ${listing.projectNo} — not software (${rejected})`)
        return
      }

      const verdict = await classifyProject(detail)
      if (!verdict.isSoftwareProject) {
        job.set({ status: "skipped", message: `Not software: ${verdict.reason}` })
        await job.save()
        console.log(`[scrape] skip ${listing.projectNo} — not software (${verdict.reason})`)
        return
      }
    }

    const ranked = rankTorDocuments(detail.documents)
    const document = ranked[0]
    if (!document) {
      throw new Error("No TOR document attached to this announcement")
    }

    job.set({ stage: "parse" })
    await job.save()

    // Both of the top documents, not just the tender: the deadline is stated
    // only in the invitation, so reading one document alone leaves every
    // extracted TOR without the date bidders most need.
    const documents: { name: string; pdf: Buffer }[] = []
    let totalBytes = 0
    for (const candidate of ranked.slice(0, MAX_EXTRACTION_DOCUMENTS)) {
      const pdf = await downloadDocument(context, candidate.url)
      if (!pdf) continue
      // Dropping an extra document costs a field or two; exceeding the request
      // cap costs the whole extraction.
      if (documents.length > 0 && totalBytes + pdf.byteLength > MAX_EXTRACTION_BYTES) break
      documents.push({ name: candidate.label || "announcement.pdf", pdf })
      totalBytes += pdf.byteLength
    }
    if (documents.length === 0) throw new Error(`Could not download ${document.url}`)

    const extraction = await extractTorFromPdf(contextFromBmaDetail(detail), documents)

    job.set({
      stage: "index",
      pages: documents.reduce((sum, item) => sum + countPdfPages(item.pdf), 0),
    })
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
          // Already carries id, key and criteria — assigned together during
          // repair so no call site can zip parallel arrays differently.
          qualificationRequirements: extraction.qualificationRequirements,
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
    if (options.refresh) {
      await refreshPublished(page)
      return
    }

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

    // An announcement that already has a draft is skipped for two reasons:
    // re-extracting it pays for the same PDF twice, and the write below is a
    // $set that would overwrite whatever a reviewer has since corrected.
    // --re-extract is the deliberate way to redo one.
    const draftedNos = options.reExtract
      ? new Set<string>()
      : new Set(
          (await TorDraft.find({ announcementNo: { $in: candidates.map((c) => c.projectNo) } })
            .select("announcementNo")
            .lean()).map((draft) => draft.announcementNo)
        )

    const queue = candidates
      .filter((listing) => !publishedNos.has(listing.projectNo) && !draftedNos.has(listing.projectNo))
      .slice(0, options.limit)

    console.log(
      `[scrape] ingesting ${queue.length} (skipped ${publishedNos.size} already published, ${draftedNos.size} already drafted)`
    )

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
        await ingest(listing, page, context, options)
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

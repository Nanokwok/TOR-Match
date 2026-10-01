import { ScrapeJob } from "@/models/ScrapeJob.model"
import { SystemSettings, SYSTEM_SETTINGS_SINGLETON_KEY } from "@/models/SystemSettings.model"
import { TorDraft } from "@/models/TorDraft.model"
import { extractTorFromPdf, type ExtractionContext } from "@/scraper/extract"
import { downloadTorDocuments } from "@/scraper/tor-documents"
import { publishBlocker, publishDraft } from "@/services/tor-publish.service"

/**
 * Reading an announcement's documents and storing what comes back.
 *
 * Shared by the RSS ingest, which meets an announcement for the first time, and
 * by the re-extract script, which re-reads documents already on file after the
 * pipeline changes. Both write the same fields, so a draft cannot end up
 * shaped differently depending on which one produced it.
 */

export type AutoApprove = { enabled: boolean; threshold: number }

/** The admin-configurable confidence threshold, or the shipped default. */
export async function autoApproveSettings(): Promise<AutoApprove> {
  const settings = await SystemSettings.findOne({
    singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY,
  })
  return {
    enabled: settings?.autoApproveEnabled ?? true,
    threshold: settings?.autoApproveThreshold ?? 90,
  }
}

export type ExtractionOutcome = {
  announcementNo: string
  documents: number
  aiConfidence: number
  /** Human-readable result, for the script's log line. */
  outcome: string
}

/**
 * Downloads, extracts, stores, and publishes if the confidence clears the bar.
 *
 * Progress is recorded on a ScrapeJob throughout so a run that dies halfway is
 * visible in /admin rather than silently absent.
 */
export async function extractAndStore(params: {
  announcementNo: string
  pdfUrl: string
  /** Falls back to this when the documents state no announcement date. */
  publishedDate: string
  context: ExtractionContext
  threshold: AutoApprove
}): Promise<ExtractionOutcome> {
  const { announcementNo, pdfUrl, publishedDate, context, threshold } = params

  const job = await ScrapeJob.create({
    documentSource: announcementNo,
    sourceUrl: pdfUrl,
    stage: "scrape",
    status: "running",
  })

  try {
    job.set({ stage: "parse" })
    await job.save()
    const documents = await downloadTorDocuments(pdfUrl)

    job.set({ stage: "index", pages: documents.length })
    await job.save()
    const extraction = await extractTorFromPdf(context, documents)

    // Below the admin's threshold — or with auto-approval switched off — the
    // draft waits for a human rather than reaching the published collection.
    const autoApproved = threshold.enabled && extraction.aiConfidence >= threshold.threshold

    const draft = await TorDraft.findOneAndUpdate(
      { announcementNo },
      {
        $set: {
          announcementNo,
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
          announcementDate: extraction.announcementDate || publishedDate,
          sourceUrl: pdfUrl,
          pdfUrl,
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
          reviewStatus: autoApproved ? "auto-approved" : "need-review",
          sourceJobId: job._id,
        },
      },
      { upsert: true, runValidators: true, new: true }
    )

    // An auto-approved draft is one nobody is going to look at, so leaving it
    // in the drafts collection would strand it: /browse reads `tors`, and the
    // TOR would never appear there. Publishing here is what makes the threshold
    // on /admin/settings mean "skip the reviewer" rather than "label it and
    // wait anyway".
    let outcome = "needs review"
    if (autoApproved && draft) {
      const blocker = publishBlocker(draft)
      if (blocker) {
        outcome = `auto-approved but not publishable (${blocker})`
      } else {
        await publishDraft(draft)
        outcome = "auto-approved and published"
      }
    }

    job.set({ status: "success" })
    await job.save()

    return {
      announcementNo,
      documents: documents.length,
      aiConfidence: extraction.aiConfidence,
      outcome,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    job.set({ status: "failure", message })
    await job.save()
    throw error
  }
}

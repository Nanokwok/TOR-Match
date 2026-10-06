import { ScrapeJob } from "@/models/ScrapeJob.model"
import type { AnnouncementLink } from "@/scraper/announcement-sources"
import { ANNOUNCE_TYPES, type AnnounceType } from "@/scraper/egp-rss"
import { mergeExtraction } from "@/services/tor-merge"
import { SystemSettings, SYSTEM_SETTINGS_SINGLETON_KEY } from "@/models/SystemSettings.model"
import { TorDraft } from "@/models/TorDraft.model"
import { extractTorFromPdf, type ExtractionContext } from "@/scraper/extract"
import { sourceUrlFor } from "@/scraper/announcement-sources"
import { carriesFullTender, downloadAllTorDocuments } from "@/scraper/tor-documents"
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
  /**
   * The document the extraction reads, best first. More than one when the
   * announcement was published as both a B0 archive and a D0 invitation: the
   * qualifications come from the first, the deadline from the second.
   */
  pdfUrl: string
  /** The D0 ประกาศเชิญชวน, read for its deadline when the feed offered one. */
  invitationUrl?: string
  /**
   * The website carrying this announcement, where a person can read the
   * documents themselves. Not a file link: that is what `pdfUrl` is for.
   */
  detailUrl?: string
  /** Falls back to this when the documents state no announcement date. */
  publishedDate: string
  context: ExtractionContext
  threshold: AutoApprove
  /** Which announcement this extraction reads, deciding what it may overwrite. */
  from?: AnnounceType
  /** Every announcement known for this project, stored alongside the content. */
  announcements?: readonly AnnouncementLink[]
}): Promise<ExtractionOutcome> {
  const { announcementNo, pdfUrl, invitationUrl, detailUrl, publishedDate, context, threshold } = params
  const from = params.from ?? ANNOUNCE_TYPES.draft

  const links = [...new Set([pdfUrl, invitationUrl].filter((url): url is string => Boolean(url)))]
  // Where a person is sent, which is not where the pipeline reads.
  const sourceUrl = sourceUrlFor({ detailUrl, pdfUrl })

  const job = await ScrapeJob.create({
    documentSource: announcementNo,
    sourceUrl,
    stage: "scrape",
    status: "running",
  })

  try {
    job.set({ stage: "parse" })
    await job.save()
    const documents = await downloadAllTorDocuments(links)

    job.set({ stage: "index", pages: documents.length })
    await job.save()
    const extraction = await extractTorFromPdf(context, documents)

    // Below the admin's threshold — or with auto-approval switched off — the
    // draft waits for a human rather than reaching the published collection.
    const autoApproved = threshold.enabled && extraction.aiConfidence >= threshold.threshold

    // What this announcement is allowed to overwrite depends on what it is and
    // on what a reviewer has already touched — see tor-merge.ts.
    const stored = await TorDraft.findOne({ announcementNo }).lean()
    const content = mergeExtraction(stored, extraction, {
      from,
      fullTender: carriesFullTender(documents),
      publishedDate,
      lockedFields: stored?.lockedFields,
      reviewStatus: stored?.reviewStatus,
    })

    const update: Record<string, unknown> = {
      announcementNo,
      ...content,
      sourceUrl,
      pdfUrl,
      invitationUrl: invitationUrl ?? stored?.invitationUrl ?? "",
      detailUrl: detailUrl ?? stored?.detailUrl ?? "",
      aiConfidence: extraction.aiConfidence,
      sourceJobId: job._id,
      ...(params.announcements?.length ? { announcements: [...params.announcements] } : {}),
    }

    // A reviewer's verdict is theirs: a later announcement may add a deadline
    // to an approved draft, but it does not send it back to the queue. Only a
    // draft nobody has ruled on takes this.
    //
    // One object, assigned: writing it as a second `$set` spread made the
    // later key replace the whole first one, and the upsert then created a
    // draft with nothing in it but a review status.
    if (stored?.reviewStatus !== "approved") {
      update.reviewStatus = autoApproved ? "auto-approved" : "need-review"
    }

    const draft = await TorDraft.findOneAndUpdate(
      { announcementNo },
      { $set: update },
      { upsert: true, runValidators: true, new: true }
    )

    // An auto-approved draft is one nobody is going to look at, so leaving it
    // in the drafts collection would strand it: /browse reads `tors`, and the
    // TOR would never appear there. Publishing here is what makes the threshold
    // on /admin/settings mean "skip the reviewer" rather than "label it and
    // wait anyway".
    let outcome = "needs review"
    // Already published and signed off: the content in `tors` is the human's,
    // and re-publishing the draft over it would throw their corrections away.
    // The lifecycle facts reach the published TOR by their own path.
    if (stored?.publishedTorId && stored.reviewStatus === "approved") {
      outcome = "approved and published already — content left alone"
    } else if (autoApproved && draft) {
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

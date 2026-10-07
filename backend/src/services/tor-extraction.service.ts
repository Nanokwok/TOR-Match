import { ScrapeJob } from "@/models/ScrapeJob.model"
import type { AnnouncementLink } from "@/scraper/announcement-sources"
import { ANNOUNCE_TYPES, type AnnounceType } from "@/scraper/egp-rss"
import { mergeExtraction } from "@/services/tor-merge"
import { SystemSettings, SYSTEM_SETTINGS_SINGLETON_KEY } from "@/models/SystemSettings.model"
import { TorDraft } from "@/models/TorDraft.model"
import { extractDeadline, extractTorFromPdf, type ExtractionContext } from "@/scraper/extract"
import { sourceUrlFor } from "@/scraper/announcement-sources"
import { carriesFullTender, downloadAllTorDocuments } from "@/scraper/tor-documents"
import { publishBlocker, publishDraft } from "@/services/tor-publish.service"

/** The announcement types that state a submission deadline. */
const INVITATION_TYPES = new Set<AnnounceType>([
  ANNOUNCE_TYPES.invitation,
  ANNOUNCE_TYPES.invitationChanged,
])

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
  /** Whether the title reads like IT work — a label for /browse, not a gate. */
  softwareRelated?: boolean
}): Promise<ExtractionOutcome> {
  const { announcementNo, pdfUrl, invitationUrl, detailUrl, publishedDate, context, threshold } = params
  const from = params.from ?? ANNOUNCE_TYPES.draft

  // Kept apart rather than downloaded as one list: the deadline is read from
  // the invitation on its own (see below), and a TorDocument does not record
  // which link it came from.
  const tenderUrls = [pdfUrl].filter((url): url is string => Boolean(url))
  const invitationUrls =
    invitationUrl && invitationUrl !== pdfUrl ? [invitationUrl] : []
  // Where a person is sent, which is not where the pipeline reads.
  const sourceUrl = sourceUrlFor({ detailUrl, invitationUrl, pdfUrl })

  const job = await ScrapeJob.create({
    documentSource: announcementNo,
    sourceUrl,
    stage: "scrape",
    status: "running",
  })

  try {
    job.set({ stage: "parse" })
    await job.save()
    const [tenderDocuments, invitationDocuments] = await Promise.all([
      downloadAllTorDocuments(tenderUrls),
      invitationUrls.length ? downloadAllTorDocuments(invitationUrls) : Promise.resolve([]),
    ])
    const documents = [...tenderDocuments, ...invitationDocuments]

    job.set({ stage: "index", pages: documents.length })
    await job.save()
    const extraction = await extractTorFromPdf(context, documents)

    // The deadline is asked for separately, against the invitation alone. The
    // full call is handed the tender archive as well, and a dozen documents
    // with no closing date between them can drown out the one two-page notice
    // that has it — which published TORs reading "กำหนดยื่นข้อเสนอ -" while the
    // document stating it sat in the same request. A failure here costs the
    // sharper answer, never the extraction.
    const deadlineDocuments = invitationDocuments.length
      ? invitationDocuments
      : INVITATION_TYPES.has(from)
        ? tenderDocuments
        : []
    if (deadlineDocuments.length) {
      try {
        const invitation = await extractDeadline(context, deadlineDocuments)
        if (invitation.deadline) extraction.deadline = invitation.deadline
        if (invitation.announcementDate && !extraction.announcementDate) {
          extraction.announcementDate = invitation.announcementDate
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[scrape] ${announcementNo} deadline pass failed: ${message}`)
      }
    }

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
      // Recomputed from the title each run rather than merged: this is our own
      // heuristic, owned by neither the model nor a reviewer.
      softwareRelated: params.softwareRelated ?? false,
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

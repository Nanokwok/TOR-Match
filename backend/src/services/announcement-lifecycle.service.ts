import { Tor } from "@/models/Tor.model"
import { TorDraft } from "@/models/TorDraft.model"
import { ANNOUNCE_TYPES } from "@/scraper/egp-rss"
import { extractMedianPrice, type ExtractionContext } from "@/scraper/extract"
import { downloadTorDocuments } from "@/scraper/tor-documents"
import type { AnnouncementLink } from "@/scraper/announcement-sources"
import type { ProcurementStatus } from "@/scraper/announcement-plan"

/**
 * The announcement types that change what we know about a project without
 * changing what the project *is*.
 *
 * A cancellation, an award, or a plan carries no tender content to read, so
 * handling them costs a database write rather than a model call. They are
 * applied to the draft and, when the project has been published, to the live
 * TOR as well — a bidder reading /browse is the person who most needs to know
 * the thing was cancelled.
 */

/** Records newly published documents against a project. Returns rows added. */
export async function applyLinks(
  announcementNo: string,
  rows: readonly AnnouncementLink[]
): Promise<void> {
  if (!rows.length) return

  await TorDraft.updateOne({ announcementNo }, { $set: { announcements: rows } })
  await Tor.updateOne({ announcementNo }, { $set: { announcements: rows.slice(-20) } })
}

/**
 * Applies an outcome — cancelled, awarded, award cancelled, award revised.
 *
 * The status goes to the published TOR too, which is the one a bidder sees.
 * Nothing else about the TOR changes: the tender's content is still what was
 * tendered, even once the project is over.
 */
export async function applyStatus(
  announcementNo: string,
  status: ProcurementStatus,
  rows: readonly AnnouncementLink[]
): Promise<void> {
  const announcements = rows.length ? { announcements: [...rows] } : {}

  await TorDraft.updateOne({ announcementNo }, { $set: { status, ...announcements } })
  await Tor.updateOne(
    { announcementNo },
    { $set: { status, ...(rows.length ? { announcements: rows.slice(-20) } : {}) } }
  )
}

/**
 * Reads the official median price off a ราคากลาง announcement.
 *
 * Recorded with its source so a later tender extraction cannot overrule it:
 * บก.06 is the approved figure, and a number lifted out of a tender's prose is
 * not. Returns the figure written, or null when the document states none.
 */
export async function applyMedianPrice(
  announcementNo: string,
  url: string,
  context: ExtractionContext
): Promise<number | null> {
  const documents = await downloadTorDocuments(url)
  const { medianPriceBaht, approvedDate } = await extractMedianPrice(context, documents)
  if (medianPriceBaht <= 0) return null

  await TorDraft.updateOne(
    { announcementNo },
    {
      $set: {
        "financials.medianPriceBaht": medianPriceBaht,
        medianPriceSource: ANNOUNCE_TYPES.medianPrice,
        medianPriceApprovedDate: approvedDate,
      },
    }
  )
  await Tor.updateOne({ announcementNo }, { $set: { "financials.medianPriceBaht": medianPriceBaht } })

  return medianPriceBaht
}

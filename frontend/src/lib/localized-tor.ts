import { pickLocalized, pickLocalizedList } from "@/lib/localized-content"
import { formatDuration } from "@/lib/format"
import type { Locale } from "@/lib/i18n"
import type { Tor, TorPaymentMilestone } from "@/types/tor"

/** A TOR flattened to plain strings in one locale, ready to render. */
export type LocalizedTorView = {
  title: string
  department: string
  localOffice: string
  durationLabel: string
  summary: string
  deliverables: string[]
  qualificationRequirements: {
    id: string
    requirement: string
    torCriteria: string
    autoCheckable: boolean
  }[]
  financials: Omit<Tor["financials"], "milestones"> & {
    milestones: LocalizedMilestoneView[]
  }
}

export type LocalizedMilestoneView = Omit<TorPaymentMilestone, "deliverable"> & {
  deliverable: string
}

export function localizeTor(tor: Tor, locale: Locale): LocalizedTorView {
  return {
    title: pickLocalized(tor.title, locale),
    department: pickLocalized(tor.department, locale),
    localOffice: pickLocalized(tor.localOffice, locale),
    durationLabel: formatDuration(tor.durationDays, locale),
    summary: pickLocalized(tor.summary, locale),
    deliverables: pickLocalizedList(tor.deliverables, locale),
    qualificationRequirements: tor.qualificationRequirements.map((req) => ({
      id: req.id,
      autoCheckable: req.autoCheckable,
      requirement: pickLocalized(req.requirement, locale),
      torCriteria: pickLocalized(req.torCriteria, locale),
    })),
    financials: {
      ...tor.financials,
      milestones: tor.financials.milestones.map((milestone) =>
        localizeMilestone(milestone, locale)
      ),
    },
  }
}

export function localizeMilestone(
  milestone: TorPaymentMilestone,
  locale: Locale
): LocalizedMilestoneView {
  return {
    ...milestone,
    deliverable: pickLocalized(milestone.deliverable, locale),
  }
}

export function useLocalizedTorFields(tor: Tor, locale: Locale) {
  return localizeTor(tor, locale)
}
import { pickLocalized, pickLocalizedList } from "@/lib/localized-content"
import type { Locale } from "@/lib/i18n"
import type { Tor, TorPaymentMilestone, TorQualificationRequirement } from "@/types/tor"

export type LocalizedTorView = {
  title: string
  department: string
  localOffice: string
  durationLabel: string
  summary: string
  deliverables: string[]
  qualificationRequirements: TorQualificationRequirement[]
  financials: Tor["financials"]
}

export function localizeTor(tor: Tor, locale: Locale): LocalizedTorView {
  return {
    title: pickLocalized(tor.title, tor.titleTh, locale),
    department: pickLocalized(tor.department, tor.departmentTh, locale),
    localOffice: pickLocalized(tor.localOffice, tor.localOfficeTh, locale),
    durationLabel: pickLocalized(tor.durationLabel, tor.durationLabelTh, locale),
    summary: pickLocalized(tor.summary, tor.summaryTh, locale),
    deliverables: pickLocalizedList(tor.deliverables, tor.deliverablesTh, locale),
    qualificationRequirements: tor.qualificationRequirements.map((req) => ({
      ...req,
      requirement: pickLocalized(req.requirement, req.requirementTh, locale),
      torCriteria: pickLocalized(req.torCriteria, req.torCriteriaTh, locale),
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
): TorPaymentMilestone {
  return {
    ...milestone,
    deliverable: pickLocalized(
      milestone.deliverable,
      milestone.deliverableTh,
      locale
    ),
  }
}

export function useLocalizedTorFields(tor: Tor, locale: Locale) {
  return localizeTor(tor, locale)
}

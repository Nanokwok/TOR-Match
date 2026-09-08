import type { TorProcurementMethod, TorProjectScale } from "@/types/tor"

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

export function projectScaleLabel(scale: TorProjectScale, t: TranslateFn) {
  const key = {
    SMALL: "browse.scaleSmall",
    MEDIUM: "browse.scaleMedium",
    LARGE: "browse.scaleLarge",
    ENTERPRISE: "browse.scaleEnterprise",
  }[scale]
  return t(key)
}

export function procurementMethodLabel(method: TorProcurementMethod, t: TranslateFn) {
  const key =
    {
      "e-bidding": "browse.methodEbidding",
      specific: "browse.methodSpecific",
      selective: "browse.methodSelective",
      "price-agreement": "browse.methodPriceAgreement",
      "e-market": "browse.methodPriceAgreement",
    }[method] ?? "browse.methodEbidding"
  return t(key)
}

export function procurementStatusLabel(
  status: string,
  t: TranslateFn
): string {
  const key =
    {
      open: "browse.statusOpen",
      "closing-soon": "browse.statusClosingSoon",
      closed: "browse.statusClosed",
      awarded: "browse.statusAwarded",
      all: "common.all",
    }[status] ?? status
  return key === status ? status : t(key)
}

export function budgetRangeLabel(value: string, t: TranslateFn) {
  const key =
    {
      all: "common.all",
      "under-3m": "browse.budgetUnder3m",
      "3m-6m": "browse.budget3m6m",
      "6m-10m": "browse.budget6m10m",
      "over-10m": "browse.budgetOver10m",
    }[value] ?? "common.all"
  return t(key)
}

export function durationPresetLabel(value: string, t: TranslateFn) {
  const key =
    {
      "under-3m": "browse.durationUnder3m",
      "3-6m": "browse.duration3to6m",
      "6-12m": "browse.duration6to12m",
      "1y-plus": "browse.duration1yPlus",
    }[value]
  return key ? t(key) : value
}

export function deadlinePresetLabel(value: string, t: TranslateFn) {
  const key =
    {
      any: "browse.deadlineAny",
      "7-days": "browse.deadline7Days",
      "30-days": "browse.deadline30Days",
      custom: "browse.deadlineCustom",
    }[value]
  return key ? t(key) : value
}

export function fiscalYearLabel(value: string, t: TranslateFn) {
  if (value === "all") return t("browse.fiscalAll")
  return `FY ${value}`
}

const LIST_TAG_METHODS = new Set([
  "e-bidding",
  "specific",
  "selective",
  "price-agreement",
  "e-market",
])

const LIST_TAG_SCALES = new Set([
  "SMALL",
  "MEDIUM",
  "LARGE",
  "ENTERPRISE",
])

export function listTagLabel(tag: string, t: TranslateFn) {
  if (LIST_TAG_METHODS.has(tag)) {
    return procurementMethodLabel(tag as TorProcurementMethod, t)
  }
  if (LIST_TAG_SCALES.has(tag)) {
    return projectScaleLabel(tag as TorProjectScale, t)
  }
  return tag
}

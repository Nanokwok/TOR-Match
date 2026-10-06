"use client"

import { useEffect, useRef } from "react"
import { Bookmark, Building2, Link2 } from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"
import { pickLocalized } from "@/lib/localized-content"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  getTorMatchBadge,
  getTorDeadlineCountdown,
  getTorStatusBadgeInfo,
} from "@/lib/deadline"
import type { Tor } from "@/types/tor"

type TorListProps = {
  items: Tor[]
  selectedId: string | null
  linkedTorId?: string | null
  onSelect: (id: string) => void
  onToggleBookmark: (torId: string) => void
}

export function TorList({
  items,
  selectedId,
  linkedTorId = null,
  onSelect,
  onToggleBookmark,
}: TorListProps) {
  const { locale, t } = useLocale()
  const selectedRef = useRef<HTMLDivElement | null>(null)
  const didScrollRef = useRef(false)

  useEffect(() => {
    if (didScrollRef.current || !selectedId || !selectedRef.current) return
    selectedRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
    didScrollRef.current = true
  }, [selectedId, items])

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        {t("browse.noMatch")}
      </div>
    )
  }

  return (
    <TooltipProvider delay={100}>
      <div className="flex flex-col gap-2.5 p-3">
        {items.map((tor) => {
          const selected = tor.id === selectedId
          const fromLink = linkedTorId === tor.id
          const title = pickLocalized(tor.title, locale)
          const department = pickLocalized(tor.department, locale)
          const localOffice = pickLocalized(tor.localOffice, locale)
          const matchBadge = getTorMatchBadge(tor, locale)
          const countdown = getTorDeadlineCountdown(tor, locale)
          const statusBadge = getTorStatusBadgeInfo(tor, locale)

          const agencyDisplay =
            localOffice && localOffice !== department
              ? `${department} • ${localOffice}`
              : department

          return (
            <div
              key={tor.id}
              ref={selected ? selectedRef : undefined}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(tor.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onSelect(tor.id)
                }
              }}
              className={cn(
                "group w-full cursor-pointer rounded-xl border bg-card p-3.5 text-left transition-all hover:shadow-xs",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:bg-muted/30"
              )}
            >
              {/* 1. แถวบนสุด: Badge สถานะ (ย่อเหลือคำเดียว) + ป้ายขั้นตอน (สีเทาอ่อน Neutral) + Bookmark */}
              <div className="flex items-center justify-between gap-2 h-6">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {/* Badge ผลการประเมินสิทธิ์ (Match Badge): คำเดียว เช่น [ ผ่าน ] หรือ [ ไม่ผ่าน ] */}
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight shrink-0",
                      matchBadge.classes
                    )}
                  >
                    {matchBadge.label}
                  </span>

                  {/* ป้ายขั้นตอน (Stage Badge): เช่น [ ร่าง TOR ] สีเทาอ่อน Neutral ไม่ตีกับสีแดง */}
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 tracking-tight shrink-0"
                    )}
                  >
                    {statusBadge.shortLabel}
                  </span>

                  {fromLink ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#0088C9]/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#0088C9] uppercase shrink-0">
                      <Link2 className="size-3" aria-hidden />
                      {t("browse.deepLink.openedFromLink")}
                    </span>
                  ) : null}
                </div>

                {/* ปุ่ม Bookmark (เซฟงาน) วางไว้มุมขวาบน */}
                <button
                  type="button"
                  className="shrink-0 -mr-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={
                    tor.bookmarked
                      ? t("browse.removeBookmark")
                      : t("browse.bookmarkTor")
                  }
                  aria-pressed={tor.bookmarked}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleBookmark(tor.id)
                  }}
                >
                  <Bookmark
                    className={cn(
                      "size-4 transition-all",
                      tor.bookmarked
                        ? "fill-primary text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                </button>
              </div>

              {/* 2. บริบทของโครงการ (Context) - คุมความสูงการ์ดให้เท่ากันทุกใบ */}
              <div className="mt-2 space-y-1">
                {/* ชื่อโครงการ: แสดงไม่เกิน 2 บรรทัด (ตัดท้ายด้วย ...) */}
                <h3
                  title={title}
                  className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary"
                >
                  {title}
                </h3>

                {/* ชื่อสังกัด/หน่วยงาน: 1 บรรทัด */}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground h-5 overflow-hidden">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{agencyDisplay}</span>
                </p>
              </div>

              {/* 3. บรรทัดล่างสุดเหลือแค่ 2 ก้อน: ฝั่งซ้ายยอดงบประมาณตัวหนา + ฝั่งขวาวันนับถอยหลังเรียบๆ */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                {/* ฝั่งซ้าย: ยอดงบประมาณตัวหนาชัดเจน (฿7,087,000) */}
                <span className="font-bold text-sm text-foreground tracking-tight whitespace-nowrap">
                  ฿{tor.budgetBaht.toLocaleString(locale === "th" ? "th-TH" : "en-US")}
                </span>

                {/* ฝั่งขวา: วันนับถอยหลังเรียบๆ (เหลือ 7 วัน) */}
                <span
                  className={cn(
                    "text-xs tracking-tight whitespace-nowrap",
                    countdown.textClass
                  )}
                >
                  {countdown.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

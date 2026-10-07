"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bookmark,
  Building2,
  CalendarDays,
  CalendarPlus,
  CircleDollarSign,
  Clock3,
  Copy,
  ExternalLink,
  FileCheck2,
  Gavel,
  Info,
  ListChecks,
  Scale,
  Share2,
  Wallet,
  Database,
} from "lucide-react";

import { ShareTorDialog } from "@/components/browse/share-tor-dialog";
import { TorFinancialsPanel } from "@/components/browse/tor-financials-panel";
import { TorQualificationPanel } from "@/components/browse/tor-qualification-panel";
import { TorTimelineStepper } from "@/components/browse/tor-timeline-stepper";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Locale } from "@/lib/i18n";
import { formatBaht, formatShortDate } from "@/lib/format"
import { getTorStatusBadgeInfo, getTorDeadlineInfo } from "@/lib/deadline"
import {
  procurementMethodLabel,
  projectScaleLabel,
} from "@/lib/browse-labels";
import { localizeTor } from "@/lib/localized-tor";
import { cn } from "@/lib/utils";
import type { Tor } from "@/types/tor";

type TorDetailProps = {
  tor: Tor | null;
  onToggleBookmark: (torId: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
};

export function TorDetail({ tor, onToggleBookmark, onDirtyChange }: TorDetailProps) {
  const { t } = useLocale();

  if (!tor) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
        {t("browse.selectTor")}
      </div>
    );
  }

  return (
    <TorDetailContent
      tor={tor}
      onToggleBookmark={onToggleBookmark}
      onDirtyChange={onDirtyChange}
    />
  );
}

function formatCompactBaht(amountBaht: number, locale: Locale = "th") {
  if (!amountBaht) return "-";
  if (amountBaht >= 1_000_000) {
    const millions = (amountBaht / 1_000_000).toLocaleString(
      locale === "th" ? "th-TH" : "en-US",
      { minimumFractionDigits: 0, maximumFractionDigits: 1 }
    );
    return locale === "th" ? `${millions} ล้านบาท` : `฿${millions}M`;
  }
  return formatBaht(amountBaht, locale);
}

function TorDetailContent({
  tor,
  onToggleBookmark,
  onDirtyChange,
}: {
  tor: Tor;
  onToggleBookmark: (torId: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}) {
  const { locale, t } = useLocale();
  const [shareOpen, setShareOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [isQualificationDirty, setIsQualificationDirty] = useState(false);
  const [showTabModal, setShowTabModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const localized = useMemo(() => localizeTor(tor, locale), [tor, locale]);

  // A new TOR starts expanded. Adjusted during render rather than in an
  // effect: an effect runs after paint, so the new TOR's header would appear
  // collapsed for a frame and then jump open.
  const [expandedForTorId, setExpandedForTorId] = useState(tor.id);
  if (expandedForTorId !== tor.id) {
    setExpandedForTorId(tor.id);
    setIsCollapsed(false);
  }

  useEffect(() => {
    onDirtyChange?.(isQualificationDirty);
  }, [isQualificationDirty, onDirtyChange]);

  // The scroll position is on a DOM node, not in React state, so resetting it
  // stays in an effect.
  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [tor.id]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const scrollTop = el.scrollTop;
    if (scrollTop < 0) return; // ignore momentum bounce on iOS
    const maxScroll = el.scrollHeight - el.clientHeight;

    // Decided from the collapsed state React is holding right now: scroll
    // events arrive faster than renders, so the value in this closure can be a
    // frame behind.
    setIsCollapsed((collapsed) => {
      // Expand ONLY when scrolled back to the top
      if (scrollTop <= 20) return false;
      // Only collapse if the page has enough scrollable overflow to sustain it
      // (the header shrinks by ~195px; below ~260px of scrollable content the
      // collapse would clamp the scroll back to the top and fight itself)
      if (!collapsed && maxScroll < 260) return collapsed;
      return scrollTop > 60 ? true : collapsed;
    });
  }

  function handleTabChange(nextTab: string) {
    if (activeTab === "qualification" && isQualificationDirty && nextTab !== "qualification") {
      setPendingTab(nextTab);
      setShowTabModal(true);
    } else {
      setActiveTab(nextTab);
      setIsCollapsed(false);
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTop = 0;
      }
    }
  }

  function handleConfirmDiscardTab() {
    setShowTabModal(false);
    setIsQualificationDirty(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setIsCollapsed(false);
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTop = 0;
      }
      setPendingTab(null);
    }
  }

  const qualificationCheck = tor.qualification;
  const sourceHref = safeExternalUrl(tor.sourceUrl);
  const sourceHost = sourceHref ? new URL(sourceHref).hostname : "";

  const statusBadge = getTorStatusBadgeInfo(tor, locale);
  const deadlineInfo = getTorDeadlineInfo(tor, locale);

  const failedCount =
    qualificationCheck?.rows.filter((r) => r.status === "failed").length ?? 0;

  function renderEligibilityBadge() {
    if (failedCount > 0) {
      return (
        <Badge
          variant="destructive"
          className="h-5 px-1.5 text-[11px] font-semibold shrink-0 bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800"
        >
          {locale === "th" ? `ไม่ผ่าน ${failedCount} ข้อ` : `${failedCount} Failed`}
        </Badge>
      );
    }
    if (tor.eligible || qualificationCheck?.status === "passed") {
      return (
        <Badge className="h-5 px-1.5 text-[11px] font-semibold shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          {locale === "th" ? "ผ่าน" : t("common.eligible")}
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="h-5 px-1.5 text-[11px] font-semibold shrink-0 text-muted-foreground"
      >
        {t(
          `browse.qualificationStatus.${qualificationCheck?.status ?? "insufficient-data"}`
        )}
      </Badge>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Top Header Section */}
      <div className="border-b border-border shrink-0 bg-card">
        {isCollapsed ? (
          /* แถวบนสุด (Compact Project Bar): Layer 1 */
          <div className="flex items-center justify-between gap-3 px-5 py-2 md:px-6 h-[40px]">
            {/* ฝั่งซ้าย: ชื่อโครงการ (ตัดคำ/Truncate บรรทัดเดียว มี Tooltip ดูเต็ม) + แสดงงบประมาณกะทัดรัด เช่น | 6.4 ล้านบาท + Badge สถานะ เช่น [ ไม่ผ่าน 1 ข้อ ] */}
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <TooltipProvider delay={100}>
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={() => {
                      setIsCollapsed(false);
                      contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="truncate text-left font-semibold text-foreground text-sm hover:text-primary transition-colors cursor-pointer shrink"
                  >
                    {localized.title}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md text-xs">
                    {localized.title}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="text-muted-foreground/40 shrink-0 select-none text-xs">|</span>

              <span className="shrink-0 text-xs font-semibold text-foreground whitespace-nowrap">
                {formatCompactBaht(tor.budgetBaht, locale)}
              </span>

              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-[11px] font-semibold shrink-0 border whitespace-nowrap",
                  statusBadge.variantClasses
                )}
              >
                {statusBadge.shortLabel}
              </Badge>

              {renderEligibilityBadge()}
            </div>

            {/* ฝั่งขวา: ปุ่ม Action ขนาดเล็ก เช่น ไอคอน Bookmark, Share, ลิงก์ต้นฉบับ */}
            <div className="flex items-center gap-1.5 shrink-0">
              <TooltipProvider delay={100}>
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                      tor.bookmarked && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                    )}
                    aria-pressed={tor.bookmarked}
                    onClick={() => onToggleBookmark(tor.id)}
                    aria-label={tor.bookmarked ? t("common.bookmarked") : t("common.bookmark")}
                  >
                    <Bookmark className={cn("size-3.5", tor.bookmarked && "fill-current")} />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {tor.bookmarked ? t("common.bookmarked") : t("common.bookmark")}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => setShareOpen(true)}
                    aria-label={t("common.share")}
                  >
                    <Share2 className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {t("common.share")}
                  </TooltipContent>
                </Tooltip>

                {sourceHref ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <a
                          href={sourceHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          aria-label={t("browse.viewSource")}
                        />
                      }
                    >
                      <ExternalLink className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {t("browse.viewSource")}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </TooltipProvider>
            </div>
          </div>
        ) : (
          /* Expanded Header (when at top) */
          <div className="p-5 md:p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 pb-0.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 px-2 text-[11px] font-semibold shrink-0 border",
                      statusBadge.variantClasses
                    )}
                  >
                    {statusBadge.label}
                  </Badge>
                  {renderEligibilityBadge()}
                  <p className="text-sm text-muted-foreground">
                    {localized.localOffice || localized.department}
                  </p>
                </div>
                <AnnouncementNoCopy announcementNo={tor.announcementNo} />
              </div>

              <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                {localized.title}
              </h2>

              {tor.source ? (
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Database className="size-3.5 shrink-0" aria-hidden />
                  <span>
                    {t("browse.source.label")}: {t(`browse.source.${tor.source}`)}
                  </span>
                  {sourceHost ? <span>· {sourceHost}</span> : null}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetaItem
                icon={Scale}
                label={t("browse.projectScale")}
                value={projectScaleLabel(tor.projectScale, t)}
              />
              <MetaItem
                icon={Gavel}
                label={t("browse.method")}
                value={procurementMethodLabel(tor.method, t)}
              />
              <MetaItem
                icon={Wallet}
                label={t("browse.budget")}
                value={formatBaht(tor.budgetBaht, locale)}
              />
              <MetaItem
                icon={CalendarDays}
                label={deadlineInfo.label}
                value={
                  deadlineInfo.isPendingNotice ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span>-</span>
                      <TooltipProvider delay={100}>
                        <Tooltip>
                          <TooltipTrigger
                            type="button"
                            className="inline-flex cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={deadlineInfo.pendingNoticeText}
                          >
                            <Info className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs text-xs font-normal"
                          >
                            {deadlineInfo.pendingNoticeText}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                  ) : (
                    deadlineInfo.dateText
                  )
                }
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {sourceHref ? (
                <Button
                  className="h-10 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  nativeButton={false}
                  render={
                    <a
                      href={sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ExternalLink data-icon="inline-start" />
                  {t("browse.viewSource")}
                </Button>
              ) : (
                <Button
                  className="h-10 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled
                >
                  <ExternalLink data-icon="inline-start" />
                  {t("browse.viewSource")}
                </Button>
              )}
              <Button
                variant="outline"
                className={cn(
                  "h-10 sm:min-w-28",
                  tor.bookmarked &&
                    "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                )}
                aria-pressed={tor.bookmarked}
                onClick={() => onToggleBookmark(tor.id)}
              >
                <Bookmark
                  data-icon="inline-start"
                  className={cn(tor.bookmarked && "fill-current")}
                />
                {tor.bookmarked ? t("common.bookmarked") : t("common.bookmark")}
              </Button>
              <Button
                variant="outline"
                className="h-10 sm:min-w-28"
                onClick={() => setShareOpen(true)}
              >
                <Share2 data-icon="inline-start" />
                {t("common.share")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        {/* แถวกลาง (Tabs Navigation): Layer 2 */}
        <div className="border-b border-border px-5 md:px-6 shrink-0 bg-card">
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-4 sm:gap-6 rounded-none bg-transparent p-0"
          >
            <TabsTrigger
              value="summary"
              className={cn(
                "rounded-none px-0 transition-all data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary",
                isCollapsed ? "py-2 text-xs sm:text-sm" : "py-3 text-sm"
              )}
            >
              <ListChecks data-icon="inline-start" />
              {t("browse.summaryDeliverables")}
            </TabsTrigger>
            <TabsTrigger
              value="qualification"
              className={cn(
                "rounded-none px-0 transition-all data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary",
                isCollapsed ? "py-2 text-xs sm:text-sm" : "py-3 text-sm"
              )}
            >
              <FileCheck2 data-icon="inline-start" />
              {t("browse.qualificationCheck")}
            </TabsTrigger>
            <TabsTrigger
              value="financials"
              className={cn(
                "rounded-none px-0 transition-all data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary",
                isCollapsed ? "py-2 text-xs sm:text-sm" : "py-3 text-sm"
              )}
            >
              <CircleDollarSign data-icon="inline-start" />
              {t("browse.financials")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* แถวล่างสุด (Sticky Table Header): Layer 3 */}
        {isCollapsed && activeTab === "qualification" ? (
          <div className="border-b border-primary/20 bg-primary text-primary-foreground px-5 md:px-6 shrink-0 shadow-xs z-10 animate-in fade-in-0 duration-150">
            <div className="flex w-full min-w-[640px] text-xs font-semibold py-2">
              <div className="w-[25%] px-4 truncate">
                {t("browse.qualificationPanel.requirement")}
              </div>
              <div className="w-[55%] px-4 truncate">
                {t("browse.qualificationPanel.torCriteria")}
              </div>
              <div className="w-[20%] px-4 truncate">
                {t("browse.qualificationPanel.companyProfile")}
              </div>
            </div>
          </div>
        ) : isCollapsed && activeTab === "financials" ? (
          <div className="border-b border-primary/20 bg-primary text-primary-foreground px-5 md:px-6 shrink-0 shadow-xs z-10 animate-in fade-in-0 duration-150">
            <div className="flex w-full text-xs font-semibold py-2">
              <div className="w-28 px-4 sm:w-36 truncate shrink-0">
                {t("browse.financialPanel.day")}
              </div>
              <div className="w-48 px-4 sm:w-56 truncate shrink-0">
                {t("browse.financialPanel.paymentMilestones")}
              </div>
              <div className="flex-1 px-4 truncate min-w-0">
                {t("browse.financialPanel.deliverable")}
              </div>
            </div>
          </div>
        ) : null}

        <ScrollArea
          viewportRef={contentScrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1"
          viewportClassName="p-5 md:p-6"
        >
          <TabsContent value="summary" className="mt-0 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                icon={CalendarPlus}
                label={t("browse.announcementDate")}
                value={formatShortDate(tor.announcementDate, locale)}
              />
              <Metric
                icon={Clock3}
                label={t("browse.duration")}
                value={localized.durationLabel}
              />
              <Metric
                icon={Activity}
                label={t("browse.procurementStatus")}
                value={statusBadge.label}
              />
              <Metric
                icon={Building2}
                label={t("browse.localOffice")}
                value={localized.localOffice || t("common.notSpecified")}
              />
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {t("common.summary")}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {localized.summary || t("common.notSpecified")}
              </p>
            </section>

            <TorTimelineStepper tor={tor} />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t("browse.keyDeliverables")}
              </h3>
              {localized.deliverables.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.notSpecified")}
                </p>
              ) : null}
              <ol className="space-y-2">
                {localized.deliverables.map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm text-muted-foreground"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>

            <div className="flex flex-wrap gap-2 pt-2">
              {tor.techTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="qualification" className="mt-0">
            {qualificationCheck ? (
              <TorQualificationPanel
                torId={tor.id}
                check={qualificationCheck}
                onDirtyChange={setIsQualificationDirty}
                isCollapsed={isCollapsed}
              />
            ) : (
              <p>{t("browse.qualificationUnavailable")}</p>
            )}
          </TabsContent>

          <TabsContent value="financials" className="mt-0">
            <TorFinancialsPanel
              financials={localized.financials}
              isCollapsed={isCollapsed}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <ShareTorDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        tor={tor}
      />

      <Dialog open={showTabModal} onOpenChange={setShowTabModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("browse.qualificationPanel.discardChangesTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("browse.qualificationPanel.discardChangesDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTabModal(false);
                setPendingTab(null);
              }}
            >
              {t("browse.qualificationPanel.keepEditing")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDiscardTab}
            >
              {t("browse.qualificationPanel.discardAndExit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementNoCopy({ announcementNo }: { announcementNo: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(announcementNo);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={t("browse.copyAnnouncement")}
      className="group inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <span>{t("browse.announcementNo", { no: announcementNo })}</span>
      <Copy className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      {copied ? <span className="text-xs text-emerald-600">{t("common.copied")}</span> : null}
    </button>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

/**
 * The source URL is stored data (scraped, or typed by an admin), so only
 * http(s) links are rendered — anything else, e.g. `javascript:`, would run
 * in the user's session when clicked.
 */
function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

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
} from "lucide-react";

import { ShareTorDialog } from "@/components/browse/share-tor-dialog";
import { TorFinancialsPanel } from "@/components/browse/tor-financials-panel";
import { TorQualificationPanel } from "@/components/browse/tor-qualification-panel";
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
import { formatBaht, formatShortDate, formatTorDeadline } from "@/lib/format"
import {
  procurementMethodLabel,
  procurementStatusLabel,
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

  useEffect(() => {
    onDirtyChange?.(isQualificationDirty);
  }, [isQualificationDirty, onDirtyChange]);

  // A new TOR starts expanded. Adjusted during render rather than in an
  // effect: an effect runs after paint, so the new TOR's header would appear
  // collapsed for a frame and then jump open.
  const [expandedForTorId, setExpandedForTorId] = useState(tor.id);
  if (expandedForTorId !== tor.id) {
    setExpandedForTorId(tor.id);
    setIsCollapsed(false);
  }

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


  const deadlineText = formatTorDeadline(tor.deadline, locale, "-");
  const qualificationCheck = tor.qualification;
  const sourceHref = safeExternalUrl(tor.sourceUrl);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div
        className={cn(
          "border-b border-border transition-[padding] duration-200 ease-out shrink-0 bg-card",
          isCollapsed
            ? "px-5 py-3 md:px-6 md:py-3.5"
            : "p-5 md:p-6"
        )}
      >
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out",
            isCollapsed
              ? "grid-rows-[0fr] opacity-0 mb-0"
              : "grid-rows-[1fr] opacity-100 mb-2"
          )}
        >
          <div className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 pb-0.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {tor.eligible ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-950">
                    {t("common.eligible")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t(
                      `browse.qualificationStatus.${qualificationCheck?.status ?? "insufficient-data"}`
                    )}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground">
                  {localized.department}
                </p>
              </div>
              <AnnouncementNoCopy announcementNo={tor.announcementNo} />
            </div>
          </div>
        </div>

        <h2
          className={cn(
            "font-semibold tracking-tight text-foreground transition-all duration-200",
            isCollapsed
              ? "text-base md:text-lg line-clamp-1 cursor-pointer hover:text-primary"
              : "text-xl md:text-2xl"
          )}
          title={localized.title}
          onClick={() => {
            if (isCollapsed) {
              setIsCollapsed(false);
              contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          {localized.title}
        </h2>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out",
            isCollapsed
              ? "grid-rows-[0fr] opacity-0 mt-0"
              : "grid-rows-[1fr] opacity-100 mt-5"
          )}
        >
          <div className="overflow-hidden space-y-5">
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
                label={t("browse.submissionDeadline")}
                value={
                  deadlineText === "-" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span>-</span>
                      <TooltipProvider delay={100}>
                        <Tooltip>
                          <TooltipTrigger
                            type="button"
                            className="inline-flex cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={t("browse.submissionDeadlinePendingNotice")}
                          >
                            <Info className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs text-xs font-normal"
                          >
                            {t("browse.submissionDeadlinePendingNotice")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                  ) : (
                    deadlineText
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
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="border-b border-border px-5 md:px-6">
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-6 rounded-none bg-transparent p-0"
          >
            <TabsTrigger
              value="summary"
              className="rounded-none px-0 py-3 data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary"
            >
              <ListChecks data-icon="inline-start" />
              {t("browse.summaryDeliverables")}
            </TabsTrigger>
            <TabsTrigger
              value="qualification"
              className="rounded-none px-0 py-3 data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary"
            >
              <FileCheck2 data-icon="inline-start" />
              {t("browse.qualificationCheck")}
            </TabsTrigger>
            <TabsTrigger
              value="financials"
              className="rounded-none px-0 py-3 data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary"
            >
              <CircleDollarSign data-icon="inline-start" />
              {t("browse.financials")}
            </TabsTrigger>
          </TabsList>
        </div>

        <div
          ref={contentScrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6"
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
                value={procurementStatusLabel(tor.status, t)}
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
              />
            ) : (
              <p>{t("browse.qualificationUnavailable")}</p>
            )}
          </TabsContent>

          <TabsContent value="financials" className="mt-0">
            <TorFinancialsPanel financials={localized.financials} />
          </TabsContent>
        </div>
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

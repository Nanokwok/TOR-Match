"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Copy,
  ExternalLink,
  FileCheck2,
  Gavel,
  ListChecks,
  Scale,
  Share2,
} from "lucide-react";

import { ShareTorDialog } from "@/components/browse/share-tor-dialog";
import { TorFinancialsPanel } from "@/components/browse/tor-financials-panel";
import { TorQualificationPanel } from "@/components/browse/tor-qualification-panel";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { browseActions } from "@/lib/browse-actions";
import { formatTorDeadline } from "@/lib/format"
import { projectScaleLabel, procurementMethodLabel } from "@/lib/browse-labels";
import { localizeTor } from "@/lib/localized-tor";
import { buildQualificationCheck } from "@/lib/qualification";
import { cn } from "@/lib/utils";
import { getMockCompanyProfile } from "@/server/db/mock/tors";
import type { Tor } from "@/types/tor";

type TorDetailProps = {
  tor: Tor | null;
  onToggleBookmark: (torId: string) => void;
};

export function TorDetail({ tor, onToggleBookmark }: TorDetailProps) {
  const { t } = useLocale();

  if (!tor) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
        {t("browse.selectTor")}
      </div>
    );
  }

  return (
    <TorDetailContent tor={tor} onToggleBookmark={onToggleBookmark} />
  );
}

function TorDetailContent({
  tor,
  onToggleBookmark,
}: {
  tor: Tor;
  onToggleBookmark: (torId: string) => void;
}) {
  const { locale, t } = useLocale();
  const [shareOpen, setShareOpen] = useState(false);
  const localized = useMemo(() => localizeTor(tor, locale), [tor, locale]);

  const qualificationCheck = buildQualificationCheck(
    {
      ...tor,
      qualificationRequirements: localized.qualificationRequirements,
    },
    getMockCompanyProfile(),
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="space-y-5 border-b border-border p-5 md:p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {tor.eligible ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-950">
                  {t("common.eligible")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  {t("common.notEligible")}
                </Badge>
              )}
              <p className="text-sm text-muted-foreground">
                {localized.department}
              </p>
            </div>
            <AnnouncementNoCopy announcementNo={tor.announcementNo} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {localized.title}
          </h2>
        </div>

        <div className="flex flex-row gap-4 w-full">
          <div className="w-[300px] md:w-[325px] lg:w-[350px] shrink-0">
            <MetaItem
              icon={CalendarDays}
              label={t("browse.submissionDeadline")}
              value={formatTorDeadline(tor.deadline, locale)}
            />
          </div>

          <div className="flex flex-1 flex-row gap-4">
            <div className="flex-1 min-w-0">
              <MetaItem
                icon={Scale}
                label={t("browse.projectScale")}
                value={projectScaleLabel(tor.projectScale, t)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <MetaItem
                icon={Clock3}
                label={t("browse.duration")}
                value={localized.durationLabel}
              />
            </div>
            <div className="flex-1 min-w-0">
              <MetaItem
                icon={Gavel}
                label={t("browse.method")}
                value={procurementMethodLabel(tor.method, t)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-10 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() =>
              browseActions.viewOriginalSource(tor.id, tor.sourceUrl)
            }
          >
            <ExternalLink data-icon="inline-start" />
            {t("browse.viewSource")}
          </Button>
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

      <Tabs
        defaultValue="summary"
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

        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <TabsContent value="summary" className="mt-0 space-y-6">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {t("common.summary")}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {localized.summary}
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t("browse.keyDeliverables")}
              </h3>
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
            <TorQualificationPanel check={qualificationCheck} />
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
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

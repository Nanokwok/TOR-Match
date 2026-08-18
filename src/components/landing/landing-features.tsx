"use client";

import {
  Bell,
  Check,
  FileSearch,
  FileText,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  href: string;
  title: string;
  description: string;
  preview: ReactNode;
  className?: string;
  layout?: "default" | "wide";
};

function FeatureCard({
  href,
  title,
  description,
  preview,
  className,
  layout = "default",
}: FeatureCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-none ring-1 ring-foreground/5 transition duration-200",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_40px_-28px_rgba(0,136,201,0.55)]",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        layout === "wide" && "lg:flex-row lg:items-stretch",
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "relative overflow-hidden bg-muted/35",
          layout === "wide"
            ? "min-h-40 p-4 sm:p-5 lg:w-[52%] lg:min-h-0"
            : "min-h-36 p-4"
        )}
      >
        {preview}
      </div>
      <div className="flex flex-1 flex-col justify-center p-5">
        <h3 className="text-base font-semibold text-pretty text-foreground">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </Link>
  );
}

function EligibilityPreview() {
  const { t } = useLocale();

  return (
    <div className="flex h-full flex-col justify-center gap-3 rounded-xl border border-border/70 bg-background/80 p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          {t("landing.previewEligible")}
        </span>
        <span className="text-[11px] font-medium text-primary">
          {t("landing.previewScore")}
        </span>
      </div>
      <span className="h-1.5 overflow-hidden rounded-full bg-primary/15">
        <span className="block h-full w-[92%] rounded-full bg-primary" />
      </span>
      <ul className="space-y-2">
        {[
          t("landing.previewCapital"),
          t("landing.previewIso"),
          t("landing.previewExperience"),
        ].map((label) => (
          <li key={label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DealBreakerPreview() {
  const { t } = useLocale();

  return (
    <div className="flex h-full flex-col justify-center gap-3 rounded-xl border border-border/70 bg-background/80 p-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-destructive">
        <ShieldAlert className="size-3.5" />
        {t("landing.previewFail")}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        <mark className="rounded-sm bg-destructive/15 px-0.5 text-destructive">
          {t("landing.previewClause")}
        </mark>
      </p>
    </div>
  );
}

function AiSummaryPreview() {
  const { t } = useLocale();
  const stats = [
    { label: t("landing.previewStatBudget"), value: t("landing.previewBudget") },
    {
      label: t("landing.previewStatDeadline"),
      value: t("landing.previewDeadline"),
    },
    { label: t("landing.previewStatScope"), value: "3" },
  ] as const;

  return (
    <div className="relative flex h-full items-end justify-end">
      <div className="absolute top-3 left-3 h-[78%] w-[46%] -rotate-6 rounded-lg border border-border/70 bg-background/70 shadow-sm">
        <div className="space-y-1.5 p-2.5 opacity-30">
          <span className="block h-1.5 w-full rounded bg-foreground/30" />
          <span className="block h-1.5 w-5/6 rounded bg-foreground/30" />
          <span className="block h-1.5 w-2/3 rounded bg-foreground/30" />
          <span className="mt-2 block h-1.5 w-full rounded bg-foreground/30" />
          <span className="block h-1.5 w-4/5 rounded bg-foreground/30" />
        </div>
      </div>
      <div className="absolute top-5 left-6 h-[78%] w-[46%] -rotate-3 rounded-lg border border-border/80 bg-background/85 shadow-sm">
        <FileText className="m-2.5 size-4 text-muted-foreground/50" />
      </div>
      <div className="relative z-10 mb-0.5 w-[68%] rounded-xl border border-border/80 bg-background p-3 shadow-md">
        <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-primary uppercase">
          <Sparkles className="size-3" />
          AI
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-primary/6 px-1.5 py-1.5"
            >
              <p className="text-[9px] leading-tight text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchPreview() {
  const { t } = useLocale();

  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-xs text-muted-foreground shadow-sm">
        <Search className="size-3.5" />
        {t("landing.previewDepartment")}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[t("landing.previewBudget"), t("landing.previewEligible")].map(
          (chip) => (
            <span
              key={chip}
              className="rounded-full border border-border/80 bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {chip}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function OcrPreview() {
  return (
    <div className="grid h-full grid-cols-2 gap-2">
      <div className="rounded-xl border border-dashed border-border bg-background/50 p-3">
        <div className="space-y-1.5 opacity-40">
          <span className="block h-2 w-full rounded bg-foreground/20" />
          <span className="block h-2 w-4/5 rounded bg-foreground/20" />
          <span className="block h-2 w-3/5 rounded bg-foreground/20" />
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground shadow-sm">
        <FileSearch className="size-3.5 text-primary" />
        OCR
      </div>
    </div>
  );
}

function AlertsPreview() {
  const { t } = useLocale();

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm">
        <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bell className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">
            {t("landing.previewNotifTitle")}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("landing.previewNotifBody")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LandingFeatures() {
  const { t } = useLocale();

  return (
    <section
      id="features"
      className="relative border-t border-foreground/8 scroll-mt-14 px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            {t("landing.featuresEyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-pretty text-foreground sm:text-3xl">
            {t("landing.featuresTitle")}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("landing.featuresSubtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            href="/eligibility"
            className="md:col-span-2"
            layout="wide"
            title={t("landing.features.eligibility.title")}
            description={t("landing.features.eligibility.description")}
            preview={<EligibilityPreview />}
          />
          <FeatureCard
            href="/eligibility"
            title={t("landing.features.dealBreaker.title")}
            description={t("landing.features.dealBreaker.description")}
            preview={<DealBreakerPreview />}
          />
          <FeatureCard
            href="/browse"
            title={t("landing.features.aiSummary.title")}
            description={t("landing.features.aiSummary.description")}
            preview={<AiSummaryPreview />}
          />
          <FeatureCard
            href="/browse"
            title={t("landing.features.searchFilters.title")}
            description={t("landing.features.searchFilters.description")}
            preview={<SearchPreview />}
          />
          <FeatureCard
            href="/browse"
            title={t("landing.features.ocrSearch.title")}
            description={t("landing.features.ocrSearch.description")}
            preview={<OcrPreview />}
          />
          <FeatureCard
            href="/browse"
            className="md:col-span-2 lg:col-span-3"
            layout="wide"
            title={t("landing.features.alerts.title")}
            description={t("landing.features.alerts.description")}
            preview={<AlertsPreview />}
          />
        </div>
      </div>
    </section>
  );
}

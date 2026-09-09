"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown } from "lucide-react";

import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Highlighter } from "@/components/ui/highlighter";
import { PulsatingButton } from "@/components/ui/pulsating-button";
import { cn } from "@/lib/utils";

const PREVIEW_CARDS = [
  {
    rotate: "-5deg",
    x: "calc(-50% - var(--fan-spread))",
    delay: "0ms",
    z: "z-10",
    scoreWidth: "w-[92%]",
    departmentKey: "landing.preview1Department",
    titleKey: "landing.preview1Title",
    budgetKey: "landing.preview1Budget",
    deadlineKey: "landing.preview1Deadline",
    scoreKey: "landing.preview1Score",
  },
  {
    rotate: "0deg",
    x: "-50%",
    delay: "90ms",
    z: "z-20",
    scoreWidth: "w-[81%]",
    departmentKey: "landing.preview2Department",
    titleKey: "landing.preview2Title",
    budgetKey: "landing.preview2Budget",
    deadlineKey: "landing.preview2Deadline",
    scoreKey: "landing.preview2Score",
  },
  {
    rotate: "5deg",
    x: "calc(-50% + var(--fan-spread))",
    delay: "180ms",
    z: "z-10",
    scoreWidth: "w-[74%]",
    departmentKey: "landing.preview3Department",
    titleKey: "landing.preview3Title",
    budgetKey: "landing.preview3Budget",
    deadlineKey: "landing.preview3Deadline",
    scoreKey: "landing.preview3Score",
  },
] as const;

export function LandingHero() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const isThai = locale === "th";
  const scriptClass = isThai ? "font-script-th" : "font-script";
  const scriptSizeClass = isThai
    ? "text-[2.15rem] leading-none sm:text-5xl md:text-6xl"
    : "text-4xl leading-none sm:text-6xl md:text-7xl";

  function scrollToFeatures() {
    document.getElementById("features")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section className="relative flex flex-col overflow-hidden px-4 pt-10 pb-8 sm:px-6 md:h-[calc(100dvh-3.5rem)] md:min-h-[40rem] md:px-8 md:pt-24 md:pb-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_160%_90%_at_50%_100%,rgba(113,220,255,0.35)_0%,rgba(0,136,201,0.14)_40%,transparent_75%)]"
      />
      <Image
        src="/paper-plane.svg"
        alt=""
        width={140}
        height={110}
        aria-hidden
        className="pointer-events-none absolute top-[30%] left-[4%] hidden w-20 -scale-x-100 animate-float opacity-50 md:block md:top-[26%] md:left-[6%] md:w-32 lg:w-40"
      />
      <Image
        src="/paper-plane.svg"
        alt=""
        width={280}
        height={180}
        aria-hidden
        className="pointer-events-none absolute top-[22%] right-[2%] hidden w-24 rotate-12 animate-float opacity-80 md:block md:top-[20%] md:right-[6%] md:w-40 lg:w-48 [animation-duration:5s]"
      />

      <div className="relative mx-auto flex w-full max-w-4xl shrink-0 flex-col items-center text-center">
        <h1 className="max-w-3xl text-[1.65rem] leading-[1.35] font-medium tracking-tight text-pretty text-foreground sm:text-5xl sm:leading-[1.2] md:text-[3.25rem]">
          {t("landing.headlinePrefix")}
          <br />
          <Highlighter action="underline" color="#0088C9">
            <span className={cn(scriptClass, scriptSizeClass, "text-primary")}>
              {t("landing.find")}
            </span>
          </Highlighter>{" "}
          {t("landing.and")}{" "}
          <Highlighter action="highlight" color="rgba(135, 206, 250, 0.5)">
            <span
              className={cn(scriptClass, scriptSizeClass, "text-foreground")}
            >
              {t("landing.match")}
            </span>
          </Highlighter>
          <br />
          {t("landing.headlineSuffix")}
        </h1>

        <p className="mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
          {t("landing.subtitle")}
        </p>

        <div className="mt-6 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
          <PulsatingButton
            className="h-11 w-full gap-2 bg-primary px-6 text-sm font-medium whitespace-nowrap text-primary-foreground hover:bg-primary/90 sm:w-auto sm:min-w-[200px]"
            pulseColor="rgba(0, 136, 201, 0.5)"
            duration="2s"
            distance="4px"
            onClick={() => router.push("/browse")}
          >
            <span className="inline-flex items-center gap-2">
              {t("landing.ctaSearch")}
              <ArrowRight className="size-4" />
            </span>
          </PulsatingButton>
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<Link href="/eligibility" />}
            className="h-11 w-full border-border bg-card/80 px-6 text-sm font-medium whitespace-nowrap text-foreground hover:bg-muted sm:w-auto sm:min-w-[200px]"
          >
            {t("landing.ctaEligibility")}
          </Button>
        </div>
      </div>

      <div className="relative mx-auto mt-8 w-full max-w-sm md:hidden">
        <MobilePreviewCard />
      </div>

      <div className="relative mt-5 hidden min-h-0 w-full flex-1 overflow-hidden pt-4 pb-14 [--fan-spread:12%] md:mt-6 md:block md:pt-6 md:pb-16 md:[--fan-spread:20%] lg:[--fan-spread:26%]">
        <HeroPreviewFan />
      </div>

      <button
        type="button"
        onClick={scrollToFeatures}
        className="absolute bottom-3 left-1/2 z-30 hidden -translate-x-1/2 flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-foreground md:flex md:bottom-5"
        aria-label={t("landing.scrollMore")}
      >
        <span className="text-[11px] font-medium tracking-wide sm:text-xs">
          {t("landing.scrollMore")}
        </span>
        <ChevronDown className="size-5 animate-scroll-hint motion-reduce:animate-none" />
      </button>
    </section>
  );
}

function MobilePreviewCard() {
  const { t } = useLocale();
  const card = PREVIEW_CARDS[1];

  return (
    <article className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 text-left shadow-[0_18px_40px_-28px_rgba(0,136,201,0.45)] ring-1 ring-foreground/5">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pretty text-foreground">
            {t(card.titleKey)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t(card.budgetKey)} · {t(card.deadlineKey)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          {t("landing.previewEligible")}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
        <span className="text-xs text-muted-foreground">{t(card.scoreKey)}</span>
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-primary/15">
          <span className={cn("block h-full rounded-full bg-primary", card.scoreWidth)} />
        </span>
      </div>
    </article>
  );
}

function HeroPreviewFan() {
  const { t } = useLocale();

  return (
    <div aria-hidden className="relative h-full w-full">
      {PREVIEW_CARDS.map((card) => (
        <div
          key={card.titleKey}
          className={cn(
            "absolute top-0 left-1/2 w-[min(90%,21rem)] origin-bottom sm:w-[27rem] md:w-[32rem] lg:w-[34rem]",
            card.z
          )}
          style={{
            transform: `translateX(${card.x}) rotate(${card.rotate})`,
          }}
        >
          <div
            className="animate-landing-fan-in motion-reduce:animate-none"
            style={{ animationDelay: card.delay }}
          >
            <article className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 text-left shadow-[0_24px_60px_-28px_rgba(0,136,201,0.45)] ring-1 ring-foreground/5 sm:rounded-3xl">
              <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/40 px-4 py-2.5 sm:px-5 sm:py-3">
                <span className="size-2 rounded-full bg-foreground/15 sm:size-2.5" />
                <span className="size-2 rounded-full bg-foreground/15 sm:size-2.5" />
                <span className="size-2 rounded-full bg-foreground/15 sm:size-2.5" />
                <span className="ml-2 text-xs text-muted-foreground sm:text-sm">
                  {t(card.departmentKey)}
                </span>
              </div>
              <div className="space-y-4 p-5 sm:space-y-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-pretty text-foreground sm:text-lg">
                      {t(card.titleKey)}
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {t(card.budgetKey)} · {t(card.deadlineKey)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:text-sm dark:text-emerald-400">
                    {t("landing.previewEligible")}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-primary/6 px-3.5 py-3">
                  <span className="text-sm text-muted-foreground">
                    {t(card.scoreKey)}
                  </span>
                  <span className="h-2 w-28 overflow-hidden rounded-full bg-primary/15 sm:w-32">
                    <span
                      className={cn(
                        "block h-full rounded-full bg-primary",
                        card.scoreWidth
                      )}
                    />
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {[
                    t("landing.previewCapital"),
                    t("landing.previewIso"),
                    t("landing.previewExperience"),
                  ].map((label) => (
                    <li
                      key={label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                        <Check className="size-3.5" strokeWidth={2.5} />
                        {t("landing.previewPass")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </div>
      ))}
    </div>
  );
}

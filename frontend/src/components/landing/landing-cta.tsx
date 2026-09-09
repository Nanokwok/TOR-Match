"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { PulsatingButton } from "@/components/ui/pulsating-button";

export function LandingCta() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <section className="relative px-4 pb-12 sm:px-6 sm:pb-20 md:px-8 md:pb-28">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-primary/15 bg-primary/8 px-5 py-8 text-center sm:rounded-3xl sm:px-10 sm:py-14">
        <h2 className="text-2xl font-medium tracking-tight text-pretty text-foreground sm:text-3xl">
          {t("landing.ctaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("landing.ctaSubtitle")}
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
          <PulsatingButton
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
            pulseColor="rgba(0, 136, 201, 0.5)"
            duration="2s"
            distance="4px"
            onClick={() => router.push("/browse")}
          >
            {t("landing.ctaSearch")}
          </PulsatingButton>
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<Link href="/eligibility" />}
            className="h-11 w-full border-border bg-card px-6 text-sm font-medium text-foreground hover:bg-muted sm:w-auto"
          >
            {t("landing.ctaEligibility")}
          </Button>
        </div>
      </div>
    </section>
  );
}

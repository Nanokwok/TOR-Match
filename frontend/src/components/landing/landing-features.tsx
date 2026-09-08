"use client";

import {
  Bell,
  Crosshair,
  FileSearch,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";

import { useLocale } from "@/components/i18n/locale-provider";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURE_KEYS = [
  { key: "aiSummary", icon: FileText },
  { key: "searchFilters", icon: Search },
  { key: "eligibility", icon: Crosshair },
  { key: "dealBreaker", icon: ShieldCheck },
  { key: "ocrSearch", icon: FileSearch },
  { key: "alerts", icon: Bell },
] as const;

export function LandingFeatures() {
  const { t } = useLocale();

  return (
    <section className="relative px-6 pb-20 md:px-8 md:pb-28">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_KEYS.map((feature) => (
          <Card
            key={feature.key}
            className="border-border/80 bg-card/90 shadow-none ring-1 ring-foreground/5 backdrop-blur-sm"
          >
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[4px] bg-primary/10">
                <feature.icon
                  className="size-5 text-primary"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <CardTitle className="text-base font-semibold text-foreground">
                  {t(`landing.features.${feature.key}.title`)}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                  {t(`landing.features.${feature.key}.description`)}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

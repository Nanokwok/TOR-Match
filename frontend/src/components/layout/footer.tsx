"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

type FooterProps = {
  className?: string;
  year?: number;
};

export function Footer({
  className,
  year = new Date().getFullYear(),
}: FooterProps) {
  const { t } = useLocale();

  return (
    <footer className={cn("w-full bg-[#0a0a0a]", className)}>
      <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-5">
        <p className="text-sm text-neutral-400">
          {t("footer.copyright", { year })}
        </p>
        <div className="flex items-center gap-4 text-sm text-neutral-400">
          <Link
            href="/privacy"
            className="transition-colors hover:text-neutral-200 underline-offset-4 hover:underline"
          >
            {t("footer.privacyPolicy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

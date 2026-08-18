"use client";

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
      <div className="px-6 py-5 md:px-8">
        <p className="text-sm text-neutral-400">
          {t("footer.copyright", { year })}
        </p>
      </div>
    </footer>
  );
}

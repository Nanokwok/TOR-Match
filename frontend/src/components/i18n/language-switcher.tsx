"use client"

import { ThaiFlagIcon, UsFlagIcon } from "@/components/i18n/flag-icons"
import { useLocale } from "@/components/i18n/locale-provider"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"

type LanguageSwitcherProps = {
  className?: string
  variant?: "dark" | "light"
}

const SWITCH_TO: Record<
  Locale,
  { next: Locale; label: string; Flag: typeof UsFlagIcon }
> = {
  en: { next: "th", label: "Switch to Thai", Flag: ThaiFlagIcon },
  th: { next: "en", label: "Switch to English", Flag: UsFlagIcon },
}

export function LanguageSwitcher({
  className,
  variant = "dark",
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale()
  const { next, label, Flag } = SWITCH_TO[locale]

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setLocale(next)}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md transition-colors",
        variant === "dark"
          ? "hover:bg-white/10"
          : "hover:bg-muted",
        className
      )}
    >
      <Flag />
    </button>
  )
}

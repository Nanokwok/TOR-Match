"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { TorMatchLogo } from "@/components/layout/tor-match-logo";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useTheme } from "@/components/theme/theme-provider";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { browseActions } from "@/lib/browse-actions";
import { cn } from "@/lib/utils";

export type HeaderNavItem = {
  labelKey: string;
  href: string;
};

type HeaderProps = {
  className?: string;
  companyName?: string;
  navItems?: HeaderNavItem[];
};

const defaultNavItems: HeaderNavItem[] = [
  { labelKey: "header.browseTors", href: "/browse" },
  { labelKey: "header.teamWorkspace", href: "/workspace" },
];

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({
  className,
  companyName,
  navItems = defaultNavItems,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-[#0a0a0a] text-white",
        className
      )}
    >
      <div className="relative flex h-14 items-center justify-between gap-6 px-6 md:px-8">
        <Link href="/" className="relative z-10 shrink-0">
          <TorMatchLogo />
        </Link>

        <nav className="absolute top-0 left-1/2 hidden h-full -translate-x-1/2 items-center gap-8 md:flex">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-full items-center border-b-2 text-sm transition-colors",
                  active
                    ? "border-white text-white"
                    : "border-transparent text-white/90 hover:text-white"
                )}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 flex shrink-0 items-center gap-3 sm:gap-4">
          <NotificationCenter />

          <AnimatedThemeToggler
            theme={resolvedTheme}
            onThemeChange={setTheme}
            variant="circle"
            duration={450}
            className="inline-flex size-8 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 [&_svg]:size-4"
          />

          <LanguageSwitcher variant="dark" />

          <span className="hidden text-sm text-white/90 lg:inline">
            {companyName ?? t("header.companyName")}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md bg-card/10 dark:bg-secondary px-3 text-sm font-medium text-background dark:text-foreground",
                "outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-white/40",
              )}
            >
              {t("header.companyProfile")}
              <ChevronDown className="size-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-44 bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
            >
              <DropdownMenuItem
                onClick={() => router.push("/company-profile")}
              >
                {t("header.companyProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
              >
                {t("header.settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  browseActions.logout();
                  router.push("/login");
                }}
              >
                {t("header.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

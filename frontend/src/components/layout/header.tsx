"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { logoutAction } from "@/actions/auth";
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
import {
  getCompanyDisplayName,
  type CompanyDisplaySource,
} from "@/lib/company-setup";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/notification";

export type HeaderNavItem = {
  labelKey: string;
  href: string;
};

type HeaderProps = {
  className?: string;
  /**
   * Whether a user is signed in. A guest sees Log in and Sign up instead of the
   * notifications bell and the account menu (with its "log out").
   */
  isSignedIn?: boolean;
  /**
   * Signed-in company identity from the saved profile.
   * Omit for guests — the header will not invent a placeholder name.
   */
  account?: CompanyDisplaySource | null;
  navItems?: HeaderNavItem[];
  initialNotifications?: AppNotification[];
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
  isSignedIn = false,
  account,
  navItems = defaultNavItems,
  initialNotifications = [],
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, t } = useLocale();
  const displayName = getCompanyDisplayName(account, locale);

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
          {isSignedIn ? (
            <NotificationCenter initialNotifications={initialNotifications} />
          ) : null}

          <AnimatedThemeToggler
            theme={resolvedTheme}
            onThemeChange={setTheme}
            variant="circle"
            duration={450}
            className="inline-flex size-8 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 [&_svg]:size-4"
          />

          <LanguageSwitcher variant="dark" />

          {!isSignedIn ? (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                {t("header.login")}
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("header.signUp")}
              </Link>
            </div>
          ) : null}

          {isSignedIn && displayName ? (
            <span className="hidden max-w-48 truncate text-sm text-white/90 lg:inline">
              {displayName}
            </span>
          ) : null}

          {isSignedIn ? (
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
                  void logoutAction().then(() => router.push("/login"));
                }}
              >
                {t("header.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}

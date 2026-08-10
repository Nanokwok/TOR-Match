"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Languages } from "lucide-react";

import { TorMatchLogo } from "@/components/layout/tor-match-logo";
import { Button } from "@/components/ui/button";
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
  label: string;
  href: string;
};

type HeaderProps = {
  className?: string;
  companyName?: string;
  navItems?: HeaderNavItem[];
  hasNotifications?: boolean;
};

const defaultNavItems: HeaderNavItem[] = [
  { label: "Browse TORs", href: "/browse" },
  { label: "Team Workspace", href: "/workspace" },
];

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({
  className,
  companyName = "Company Name",
  navItems = defaultNavItems,
  hasNotifications = true,
}: HeaderProps) {
  const pathname = usePathname();

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
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 flex shrink-0 items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative text-white hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
            onClick={() => browseActions.openNotifications()}
          >
            <Bell className="size-4" />
            {hasNotifications ? (
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-white" />
            ) : null}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/10 hover:text-white"
            aria-label="Change language"
            onClick={() => browseActions.changeLanguage()}
          >
            <Languages className="size-4" />
          </Button>

          <span className="hidden text-sm text-white/90 lg:inline">
            {companyName}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-neutral-950",
                "outline-none transition-colors hover:bg-neutral-100",
                "focus-visible:ring-2 focus-visible:ring-white/40",
                "data-popup-open:bg-neutral-100"
              )}
            >
              Company Profile
              <ChevronDown className="size-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-44 bg-white text-neutral-950 shadow-lg ring-1 ring-black/10"
            >
              <DropdownMenuItem onClick={() => browseActions.openCompanyProfile()}>
                Company Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => browseActions.openSettings()}>
                Setting
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => browseActions.logout()}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

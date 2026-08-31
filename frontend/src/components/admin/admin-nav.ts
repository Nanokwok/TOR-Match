import { Building2, /* CreditCard, */ LayoutDashboard, ScanSearch, Settings, FileSearch } from "lucide-react"

export const adminNavItems = [
  {
    titleKey: "admin.overview",
    href: "/admin/overview",
    icon: LayoutDashboard,
  },
  {
    titleKey: "admin.scraperOcr",
    href: "/admin/scraper-ocr",
    icon: ScanSearch,
  },
  {
    titleKey: "admin.torReview",
    href: "/admin/tor-review",
    icon: FileSearch,
  },
  {
    titleKey: "admin.companies",
    href: "/admin/companies",
    icon: Building2,
  },
  // Subscriptions / plans (Pro, Enterprise, MRR) — hidden for now
  // {
  //   titleKey: "admin.subscriptions",
  //   href: "/admin/subscriptions",
  //   icon: CreditCard,
  // },
  {
    titleKey: "admin.settings",
    href: "/admin/settings",
    icon: Settings,
  },
] as const

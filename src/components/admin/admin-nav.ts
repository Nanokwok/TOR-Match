import { Building2, /* CreditCard, */ LayoutDashboard, ScanSearch, Settings, FileSearch } from "lucide-react"

export const adminNavItems = [
  {
    title: "Overview",
    href: "/admin/overview",
    icon: LayoutDashboard,
  },
  {
    title: "Scraper & OCR",
    href: "/admin/scraper-ocr",
    icon: ScanSearch,
  },
  {
    title: "TOR Review",
    href: "/admin/tor-review",
    icon: FileSearch,
  },
  {
    title: "Companies",
    href: "/admin/companies",
    icon: Building2,
  },
  // Subscriptions / plans (Pro, Enterprise, MRR) — hidden for now
  // {
  //   title: "Subscriptions",
  //   href: "/admin/subscriptions",
  //   icon: CreditCard,
  // },
  {
    title: "System Settings",
    href: "/admin/settings",
    icon: Settings,
  },
] as const

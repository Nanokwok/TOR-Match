import {
  Bell,
  Crosshair,
  FileSearch,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "AI Executive TOR Summary",
    description:
      "Parses 30-page PDF documents into 1-minute summary cards covering budget, deadlines, and core deliverables.",
    icon: FileText,
  },
  {
    title: "Tech Stack & Advanced Search Filters",
    description:
      "Filter BMA procurement listings instantly by technology keywords, departments, or budget ranges.",
    icon: Search,
  },
  {
    title: "Automated Eligibility Matching",
    description:
      "Cross-checks company registered capital, past project values, and ISO certifications directly against TOR criteria.",
    icon: Crosshair,
  },
  {
    title: "Deal-Breaker Clause Detector",
    description:
      "Highlights disqualifying clauses and mandatory qualifications immediately so you never waste time on ineligible bids.",
    icon: ShieldCheck,
  },
  {
    title: "In-Document OCR Search",
    description:
      "Converts scanned or image-based PDF TOR documents into searchable text.",
    icon: FileSearch,
  },
  {
    title: "Real-Time Deadline & Match Alerts",
    description:
      "Receive instant notifications via Email, Push, or LINE the moment a new TOR matches your company profile.",
    icon: Bell,
  },
] as const;

export function LandingFeatures() {
  return (
    <section className="relative px-6 pb-20 md:px-8 md:pb-28">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card
            key={feature.title}
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
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

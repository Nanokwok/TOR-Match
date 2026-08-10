import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHero } from "@/components/landing/landing-hero";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_160%_90%_at_50%_100%,rgba(113,220,255,0.35)_0%,rgba(0,136,201,0.14)_40%,transparent_75%)]"
      />
      <div className="relative flex flex-1 flex-col">
        <LandingHero />
        <LandingFeatures />
      </div>
    </div>
  );
}

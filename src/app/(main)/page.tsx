import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHero } from "@/components/landing/landing-hero";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-x-hidden bg-background">
      <div className="relative flex flex-1 flex-col">
        <LandingHero />
        <LandingFeatures />
        <LandingCta />
      </div>
    </div>
  );
}

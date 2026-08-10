"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Highlighter } from "@/components/ui/highlighter";
import { PulsatingButton } from "@/components/ui/pulsating-button";

export function LandingHero() {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-16 md:px-8 md:pt-28 md:pb-24">
      <Image
        src="/paper-plane.svg"
        alt=""
        width={120}
        height={100}
        aria-hidden
        className="pointer-events-none absolute top-16 -scale-x-100 left-[8%] hidden w-16 animate-float opacity-50 blur-[2px] md:block lg:w-30"
      />
      <Image
        src="/paper-plane.svg"
        alt=""
        width={240}
        height={150}
        aria-hidden
        className="pointer-events-none absolute top-24 right-[6%] scale-125 hidden w-28 animate-float md:block lg:top-28 lg:right-[10%] lg:w-40 [animation-duration:5s]"
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1 className="max-w-3xl text-4xl leading-[1.2] font-medium tracking-tight text-foreground sm:text-5xl md:text-[3.25rem]">
          Built for tech agencies to
          <br />
          <Highlighter action="underline" color="#0088C9">
            <span className="font-script text-5xl text-primary sm:text-6xl md:text-7xl">
              Find
            </span>
          </Highlighter>{" "}
          and{" "}
          <Highlighter action="highlight" color="rgba(135, 206, 250, 0.5)">
            <span className="font-script text-5xl text-foreground sm:text-6xl md:text-7xl">
              Match
            </span>
          </Highlighter>
          <br />
          Your BMA government projects
        </h1>

        <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          Extract key TOR criteria, automate eligibility matching before
          submitting your bid
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <PulsatingButton
            className="h-11 min-w-[220px] bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            pulseColor="rgba(0, 136, 201, 0.5)"
            duration="2s"
            distance="4px"
            onClick={() => router.push("/browse")}
          >
            Start Searching for Free
          </PulsatingButton>
          <Button
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<Link href="/eligibility" />}
            className="h-11 min-w-[220px] border-border bg-card text-sm font-medium text-foreground hover:bg-muted"
          >
            Check Company Eligibility
          </Button>
        </div>
      </div>
    </section>
  );
}

"use client";

import type { ReactNode } from "react";
import Image from "next/image";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: ReactNode;
  className?: string;
};

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-2">
      <div
        className={cn(
          "relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24",
          className,
        )}
      >
        <div className="absolute top-6 right-6">
          <LanguageSwitcher variant="light" />
        </div>
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </div>

      <aside className="relative hidden overflow-hidden lg:block">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#32A8E6_0%,#90D8F8_30%,#EBF6FD_70%)]"
        />
        <div className="relative flex h-full min-h-[640px] items-center justify-center p-10">
          <Image
            src="/paper-plane.svg"
            alt=""
            width={420}
            height={320}
            priority
            className="w-[min(40%,250px)]"
          />
        </div>
      </aside>
    </div>
  );
}

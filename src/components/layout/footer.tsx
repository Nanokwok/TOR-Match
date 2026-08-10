import { cn } from "@/lib/utils";

type FooterProps = {
  className?: string;
  year?: number;
};

export function Footer({
  className,
  year = new Date().getFullYear(),
}: FooterProps) {
  return (
    <footer className={cn("w-full bg-[#0a0a0a]", className)}>
      <div className="px-6 py-5 md:px-8">
        <p className="text-sm text-neutral-400">
          © {year} TOR Match. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

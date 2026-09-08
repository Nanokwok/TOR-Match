import Image from "next/image";

import { cn } from "@/lib/utils";

type TorMatchLogoProps = {
  className?: string;
};

export function TorMatchLogo({ className }: TorMatchLogoProps) {
  return (
    <Image
      src="/Logo.svg"
      alt="TOR Match"
      width={994}
      height={185}
      priority
      className={cn("h-7 w-auto", className)}
    />
  );
}

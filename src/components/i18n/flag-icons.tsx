import { cn } from "@/lib/utils"

type FlagIconProps = {
  className?: string
}

export function UsFlagIcon({ className }: FlagIconProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      aria-hidden
      className={cn("h-4 w-6 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10", className)}
    >
      <rect width="24" height="16" fill="#B22234" />
      <rect y="1.23" width="24" height="1.23" fill="#fff" />
      <rect y="3.69" width="24" height="1.23" fill="#fff" />
      <rect y="6.15" width="24" height="1.23" fill="#fff" />
      <rect y="8.62" width="24" height="1.23" fill="#fff" />
      <rect y="11.08" width="24" height="1.23" fill="#fff" />
      <rect y="13.54" width="24" height="1.23" fill="#fff" />
      <rect width="9.6" height="8.62" fill="#3C3B6E" />
      <circle cx="1.2" cy="1.1" r="0.35" fill="#fff" />
      <circle cx="2.8" cy="1.1" r="0.35" fill="#fff" />
      <circle cx="4.4" cy="1.1" r="0.35" fill="#fff" />
      <circle cx="6" cy="1.1" r="0.35" fill="#fff" />
      <circle cx="7.6" cy="1.1" r="0.35" fill="#fff" />
      <circle cx="2" cy="2.4" r="0.35" fill="#fff" />
      <circle cx="3.6" cy="2.4" r="0.35" fill="#fff" />
      <circle cx="5.2" cy="2.4" r="0.35" fill="#fff" />
      <circle cx="6.8" cy="2.4" r="0.35" fill="#fff" />
      <circle cx="1.2" cy="3.7" r="0.35" fill="#fff" />
      <circle cx="2.8" cy="3.7" r="0.35" fill="#fff" />
      <circle cx="4.4" cy="3.7" r="0.35" fill="#fff" />
      <circle cx="6" cy="3.7" r="0.35" fill="#fff" />
      <circle cx="7.6" cy="3.7" r="0.35" fill="#fff" />
      <circle cx="2" cy="5" r="0.35" fill="#fff" />
      <circle cx="3.6" cy="5" r="0.35" fill="#fff" />
      <circle cx="5.2" cy="5" r="0.35" fill="#fff" />
      <circle cx="6.8" cy="5" r="0.35" fill="#fff" />
      <circle cx="1.2" cy="6.3" r="0.35" fill="#fff" />
      <circle cx="2.8" cy="6.3" r="0.35" fill="#fff" />
      <circle cx="4.4" cy="6.3" r="0.35" fill="#fff" />
      <circle cx="6" cy="6.3" r="0.35" fill="#fff" />
      <circle cx="7.6" cy="6.3" r="0.35" fill="#fff" />
      <circle cx="2" cy="7.6" r="0.35" fill="#fff" />
      <circle cx="3.6" cy="7.6" r="0.35" fill="#fff" />
      <circle cx="5.2" cy="7.6" r="0.35" fill="#fff" />
      <circle cx="6.8" cy="7.6" r="0.35" fill="#fff" />
    </svg>
  )
}

export function ThaiFlagIcon({ className }: FlagIconProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      aria-hidden
      className={cn("h-4 w-6 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10", className)}
    >
      <rect width="24" height="16" fill="#A51931" />
      <rect y="2.67" width="24" height="10.67" fill="#fff" />
      <rect y="5.33" width="24" height="5.33" fill="#2D2A4A" />
    </svg>
  )
}

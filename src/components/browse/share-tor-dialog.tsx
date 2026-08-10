"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Mail, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Tor } from "@/types/tor"

type ShareTorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tor: Tor
}

type IconProps = { className?: string }

function XIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.913L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

function FacebookIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H7.9v-2.9h2.4V9.41c0-2.37 1.4-3.68 3.55-3.68 1.03 0 2.1.18 2.1.18v2.32h-1.18c-1.17 0-1.53.73-1.53 1.48v1.78h2.61l-.42 2.9h-2.19V22c4.78-.75 8.44-4.91 8.44-9.93z" />
    </svg>
  )
}

function LinkedInIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22 2H2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
    </svg>
  )
}

export function ShareTorDialog({
  open,
  onOpenChange,
  tor,
}: ShareTorDialogProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/browse?tor=${encodeURIComponent(tor.id)}`
    }
    return `${window.location.origin}/browse?tor=${encodeURIComponent(tor.id)}`
  }, [tor.id])

  const shareText = `${tor.title} — ${tor.announcementNo}`

  const socialLinks = [
    {
      id: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      icon: LinkedInIcon,
      className: "bg-[#0A66C2] text-white hover:bg-[#004182]",
    },
    {
      id: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      icon: FacebookIcon,
      className: "bg-[#1877F2] text-white hover:bg-[#0C63D4]",
    },
    {
      id: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      icon: XIcon,
      className: "bg-neutral-950 text-white hover:bg-neutral-800",
    },
    {
      id: "line",
      label: "LINE",
      href: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`,
      icon: MessageCircle,
      className: "bg-[#06C755] text-white hover:bg-[#05A847]",
    },
    {
      id: "email",
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(`TOR: ${tor.title}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
      icon: Mail,
      className: "bg-slate-100 text-neutral-800 hover:bg-slate-200",
    },
  ] as const

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Share TOR</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {tor.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <div className="grid grid-cols-5 gap-2">
            {socialLinks.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target={item.id === "email" ? undefined : "_blank"}
                  rel={item.id === "email" ? undefined : "noopener noreferrer"}
                  className="flex flex-col items-center gap-2 rounded-lg p-2 text-center transition-colors hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-full transition-colors",
                      item.className
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {item.label}
                  </span>
                </a>
              )
            })}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Or copy link
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="h-10 bg-slate-50 text-xs"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 gap-1.5"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="size-4 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

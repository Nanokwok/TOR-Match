"use client";

import { AlertTriangle, Bell, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AppNotification,
  NotificationCategory,
} from "@/types/notification";

const CATEGORY_STYLES: Record<
  NotificationCategory,
  {
    icon: typeof Bell;
    className: string;
  }
> = {
  match: {
    icon: Sparkles,
    className: "text-emerald-600",
  },
  deadline: {
    icon: AlertTriangle,
    className: "text-amber-600",
  },
  system: {
    icon: Bell,
    className: "text-muted-foreground",
  },
};

type NotificationCardProps = {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
};

export function NotificationCard({
  notification,
  onMarkRead,
}: NotificationCardProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const category = CATEGORY_STYLES[notification.category];
  const Icon = category.icon;
  const actionLabel = notification.actionLabel;

  function handleActivate() {
    onMarkRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <button
      type="button"
      onClick={handleActivate}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
        !notification.isRead && "bg-primary/5",
      )}
    >
      <span className="mt-1.5 flex w-2 shrink-0 justify-center">
        {!notification.isRead ? (
          <span className="size-2 rounded-full bg-primary" aria-hidden />
        ) : null}
      </span>

      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm border border-border",
          category.className,
        )}
      >
        <Icon className="size-3.5" />
      </span>

      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {notification.title}
          </span>
          {notification.autoVerifiedMatch ? (
            <Badge className="h-5 rounded-md border-transparent bg-emerald-100 px-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
              {t("notifications.autoVerified")}
            </Badge>
          ) : null}
        </span>

        <span className="line-clamp-2 text-sm text-muted-foreground">
          {notification.description}
        </span>

        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatRelativeTime(notification.createdAt, locale)}</span>
          {notification.link ? (
            <span className="font-medium text-primary">{actionLabel}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

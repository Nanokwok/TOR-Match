"use client";

import { AlertTriangle, Bell, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatRelativeTime } from "@/lib/format";
import { pickLocalized } from "@/lib/localized-content";
import { cn } from "@/lib/utils";
import type {
  AppNotification,
  NotificationAction,
  NotificationCategory,
} from "@/types/notification";

const ACTION_LABEL_KEYS: Record<NotificationAction, string> = {
  "view-tor": "notifications.action.viewTor",
  "open-workspace": "notifications.action.openWorkspace",
};

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
  onDelete: (id: string) => void;
};

export function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
}: NotificationCardProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const category = CATEGORY_STYLES[notification.category];
  const Icon = category.icon;
  const actionLabel = notification.action
    ? t(ACTION_LABEL_KEYS[notification.action])
    : null;

  function handleActivate() {
    onMarkRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 px-4 py-3 transition-colors hover:bg-muted/60",
        !notification.isRead && "bg-primary/5",
      )}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(notification.id);
        }}
        aria-label={t("common.delete")}
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={handleActivate}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
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
              {pickLocalized(notification.title, locale)}
            </span>
            {notification.autoVerifiedMatch ? (
              <Badge className="h-5 rounded-md border-transparent bg-emerald-100 px-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                {t("notifications.autoVerified")}
              </Badge>
            ) : null}
          </span>

          <span className="line-clamp-2 text-sm text-muted-foreground">
            {pickLocalized(notification.description, locale)}
          </span>

          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatRelativeTime(notification.createdAt, locale)}</span>
            {notification.link && actionLabel ? (
              <span className="font-medium text-primary">{actionLabel}</span>
            ) : null}
          </span>
        </span>
      </button>
    </div>
  );
}

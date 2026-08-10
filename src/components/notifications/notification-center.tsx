"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Bell, Inbox, Settings } from "lucide-react"

import { NotificationCard } from "@/components/notifications/notification-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MOCK_NOTIFICATIONS } from "@/server/db/mock/notifications"
import { cn } from "@/lib/utils"
import type { AppNotification } from "@/types/notification"

type NotificationTab = "all" | "unread" | "matches" | "deadlines"

const TABS: { value: NotificationTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "matches", label: "Matches" },
  { value: "deadlines", label: "Deadlines" },
]

function filterNotifications(
  items: AppNotification[],
  tab: NotificationTab
) {
  switch (tab) {
    case "unread":
      return items.filter((item) => !item.isRead)
    case "matches":
      return items.filter((item) => item.category === "match")
    case "deadlines":
      return items.filter((item) => item.category === "deadline")
    default:
      return items
  }
}

type NotificationCenterProps = {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<NotificationTab>("all")
  const [notifications, setNotifications] =
    useState<AppNotification[]>(MOCK_NOTIFICATIONS)

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  )

  const visibleNotifications = useMemo(
    () => filterNotifications(notifications, activeTab),
    [activeTab, notifications]
  )

  function markAsRead(id: string) {
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, isRead: true } : item
      )
    )
  }

  function markAllAsRead() {
    setNotifications((previous) =>
      previous.map((item) => ({ ...item, isRead: true }))
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "relative text-white hover:bg-white/10 hover:text-white",
              className
            )}
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(420px,calc(100vw-1.5rem))] gap-0 overflow-hidden p-0 text-foreground"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-base font-semibold">Notifications</h2>
            {unreadCount > 0 ? (
              <Badge className="h-5 rounded-md bg-primary/10 px-1.5 text-[11px] font-medium text-primary hover:bg-primary/10">
                {unreadCount} New
              </Badge>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 text-muted-foreground hover:text-foreground"
              nativeButton={false}
              render={<Link href="/settings/notifications" />}
              aria-label="Notification settings"
              onClick={() => setOpen(false)}
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value) setActiveTab(value as NotificationTab)
          }}
          className="gap-0"
        >
          <div className="border-b border-border px-2">
            <TabsList
              variant="line"
              className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0"
            >
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-10 flex-none rounded-none px-3 text-xs after:bg-primary data-active:text-primary"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="h-[420px]">
            {visibleNotifications.length > 0 ? (
              <div className="divide-y divide-border">
                {visibleNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={(id) => {
                      markAsRead(id)
                      setOpen(false)
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Inbox className="size-5" />
                </span>
                <p className="text-sm font-medium text-foreground">
                  No notifications found
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeTab === "all"
                    ? "You’re all caught up for now."
                    : `Nothing in ${TABS.find((tab) => tab.value === activeTab)?.label ?? "this"} yet.`}
                </p>
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

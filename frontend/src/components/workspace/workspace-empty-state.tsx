"use client"

import Link from "next/link"
import { BookmarkPlus, LayoutGrid, Search } from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type WorkspaceEmptyStateProps = {
  variant: "board" | "filters"
  onAddTor?: () => void
  onClearFilters?: () => void
}

export function WorkspaceEmptyState({
  variant,
  onAddTor,
  onClearFilters,
}: WorkspaceEmptyStateProps) {
  const { t } = useLocale()
  const isBoard = variant === "board"

  return (
    <div className="flex min-h-[min(520px,70vh)] flex-1 items-center justify-center p-4 md:p-8">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-background px-6 py-10 text-center shadow-sm md:px-10 md:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.72_0.12_230_/_0.18),_transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -bottom-10 size-40 rounded-full bg-[oklch(0.72_0.12_230_/_0.12)] blur-2xl"
        />

        <div className="relative flex flex-col items-center gap-5">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-[#0088C9]/10 text-[#0088C9] ring-1 ring-[#0088C9]/15">
            {isBoard ? (
              <LayoutGrid className="size-6" strokeWidth={1.75} />
            ) : (
              <Search className="size-6" strokeWidth={1.75} />
            )}
          </span>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              {isBoard
                ? t("workspace.empty.boardTitle")
                : t("workspace.empty.filtersTitle")}
            </h2>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
              {isBoard
                ? t("workspace.empty.boardDescription")
                : t("workspace.empty.filtersDescription")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {isBoard ? (
              <>
                <Button
                  type="button"
                  className="h-10 gap-2 bg-[#0088C9] text-white hover:bg-[#0088C9]/90"
                  onClick={onAddTor}
                >
                  <BookmarkPlus className="size-4" />
                  {t("workspace.empty.addFirstTor")}
                </Button>
                <Link
                  href="/browse"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "inline-flex h-10 items-center justify-center"
                  )}
                >
                  {t("workspace.empty.browseTors")}
                </Link>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={onClearFilters}
              >
                {t("workspace.empty.clearFilters")}
              </Button>
            )}
          </div>

          {isBoard ? (
            <p className="pt-1 text-xs text-muted-foreground">
              {t("workspace.empty.boardHint")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

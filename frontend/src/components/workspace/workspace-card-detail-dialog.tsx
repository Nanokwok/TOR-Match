"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Check,
  Clock3,
  FileText,
  FolderOpen,
  ListChecks,
  Search,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatDaysLeft, formatThb } from "@/lib/format";
import { pickLocalized } from "@/lib/localized-content";
import { workspaceActions } from "@/lib/workspace-actions";
import { cn } from "@/lib/utils";
import { createDefaultChecklist } from "@/lib/workspace-checklist";
import type { TorPriority } from "@/types/tor";
import type {
  TeamMember,
  WorkspaceCard,
  WorkspaceChecklistItem,
  WorkspaceColumnId,
} from "@/types/workspace";

const COLUMN_KEYS: Record<WorkspaceColumnId, string> = {
  bookmark: "workspace.columnBookmark",
  todo: "workspace.columnTodo",
  "in-progress": "workspace.columnInProgress",
  done: "workspace.columnDone",
};

type WorkspaceCardDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: WorkspaceCard | null;
  members: TeamMember[];
  onUpdateCard: (card: WorkspaceCard) => void;
};

export function WorkspaceCardDetailDialog({
  open,
  onOpenChange,
  card,
  members,
  onUpdateCard,
}: WorkspaceCardDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {card ? (
        <WorkspaceCardDetailBody
          key={card.torId}
          card={card}
          members={members}
          onUpdateCard={onUpdateCard}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

type WorkspaceCardDetailBodyProps = {
  card: WorkspaceCard;
  members: TeamMember[];
  onUpdateCard: (card: WorkspaceCard) => void;
  onClose: () => void;
};

function WorkspaceCardDetailBody({
  card,
  members,
  onUpdateCard,
  onClose,
}: WorkspaceCardDetailBodyProps) {
  const { locale, t } = useLocale();
  const [draft, setDraft] = useState(card);
  const [checklist, setChecklist] = useState<WorkspaceChecklistItem[]>(() =>
    createDefaultChecklist(card.torId, t),
  );
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [newAssigneeName, setNewAssigneeName] = useState("");
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);

  const title = pickLocalized(draft.title, locale);
  const department = pickLocalized(draft.department, locale);
  const daysLeftLabels = {
    dueToday: t("workspace.dueToday"),
    oneDayLeft: t("workspace.oneDayLeft"),
    daysLeft: t("workspace.daysLeft"),
  };

  const columnOptions: WorkspaceColumnId[] = [
    "bookmark",
    "todo",
    "in-progress",
    "done",
  ];

  const assignees = useMemo(() => {
    return draft.assigneeIds
      .map((id) => members.find((member) => member.id === id))
      .filter(Boolean) as TeamMember[];
  }, [draft, members]);

  const filteredMembers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    return members.filter((member) =>
      q ? member.name.toLowerCase().includes(q) : true,
    );
  }, [assigneeSearch, members]);

  function patchDraft(next: Partial<WorkspaceCard>) {
    const updated = { ...draft, ...next };
    setDraft(updated);
    onUpdateCard(updated);
  }

  function removeAssignee(memberId: string) {
    patchDraft({
      assigneeIds: draft.assigneeIds.filter((id) => id !== memberId),
    });
  }

  function toggleAssignee(memberId: string) {
    const isAssigned = draft.assigneeIds.includes(memberId);
    patchDraft({
      assigneeIds: isAssigned
        ? draft.assigneeIds.filter((id) => id !== memberId)
        : [...draft.assigneeIds, memberId],
    });
  }

  function addCustomAssignee() {
    const name = newAssigneeName.trim();
    if (!name) return;
    workspaceActions.addCustomAssignee(name);
    setNewAssigneeName("");
  }

  function toggleChecklistItem(itemId: string, completed: boolean) {
    setChecklist((previous) =>
      previous.map((item) =>
        item.id === itemId ? { ...item, completed } : item,
      ),
    );
  }

  function addChecklistItem() {
    const label = newChecklistLabel.trim();
    if (!label) return;
    setChecklist((previous) => [
      ...previous,
      {
        id: `${draft.torId}-cl-${Date.now()}`,
        label,
        completed: false,
      },
    ]);
    setNewChecklistLabel("");
  }

  return (
    <DialogContent
      showCloseButton={false}
      className="max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl overflow-hidden rounded-2xl border border-border bg-card p-0 sm:max-w-4xl"
    >
      <div className="border-b border-border px-6 pb-0 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2 pr-2">
            <DialogTitle className="text-lg font-semibold leading-snug text-foreground">
              {title}
            </DialogTitle>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FolderOpen className="size-4 shrink-0" />
              {department}
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-4">
            <div className="hidden space-y-1 text-right text-xs text-muted-foreground sm:block">
              <p className="flex items-center justify-end gap-1.5">
                <Banknote className="size-3.5 text-primary" />
                {formatThb(draft.budgetBaht, locale)}
              </p>
              <p className="flex items-center justify-end gap-1.5">
                <Clock3 className="size-3.5 text-primary" />
                {formatDaysLeft(draft.deadline, locale, daysLeftLabels)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 shrink-0 text-muted-foreground"
              onClick={onClose}
              aria-label={t("workspace.cardDetail.close")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-1 text-xs text-muted-foreground sm:hidden">
          <p className="flex items-center gap-1.5">
            <Banknote className="size-3.5 text-primary" />
            {formatThb(draft.budgetBaht, locale)}
          </p>
          <p className="flex items-center gap-1.5">
            <Clock3 className="size-3.5 text-primary" />
            {formatDaysLeft(draft.deadline, locale, daysLeftLabels)}
          </p>
        </div>

        <Tabs defaultValue="details" className="mt-5 gap-0">
          <TabsList
            variant="line"
            className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0"
          >
            <TabsTrigger
              value="details"
              className="h-10 rounded-none px-0 after:bg-primary data-active:text-primary"
            >
              <FileText className="size-4" />
              {t("workspace.cardDetail.details")}
            </TabsTrigger>
            <TabsTrigger
              value="checklist"
              className="h-10 rounded-none px-0 after:bg-primary data-active:text-primary"
            >
              <ListChecks className="size-4" />
              {t("workspace.cardDetail.checklist")}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="details"
            className="max-h-[52vh] overflow-y-auto px-0 py-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workspace-priority">
                  {t("workspace.cardDetail.priority")}
                </Label>
                <Select
                  value={draft.priority}
                  onValueChange={(value) => {
                    if (value) patchDraft({ priority: value as TorPriority });
                  }}
                >
                  <SelectTrigger
                    id="workspace-priority"
                    className="h-10 w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">{t("common.high")}</SelectItem>
                    <SelectItem value="MEDIUM">{t("common.medium")}</SelectItem>
                    <SelectItem value="LOW">{t("common.low")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace-status">
                  {t("workspace.cardDetail.status")}
                </Label>
                <Select
                  value={draft.column}
                  onValueChange={(value) => {
                    if (value)
                      patchDraft({ column: value as WorkspaceColumnId });
                  }}
                >
                  <SelectTrigger id="workspace-status" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((columnId) => (
                      <SelectItem key={columnId} value={columnId}>
                        {t(COLUMN_KEYS[columnId])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Label>{t("workspace.cardDetail.assignees")}</Label>

              <div className="flex flex-wrap gap-2">
                {assignees.map((member) => (
                  <Badge
                    key={member.id}
                    variant="secondary"
                    className="h-8 gap-1 rounded-lg bg-muted px-2.5 text-sm font-normal text-foreground hover:bg-muted"
                  >
                    {member.name}
                    <button
                      type="button"
                      className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={() => removeAssignee(member.id)}
                      aria-label={t("workspace.cardDetail.removeAssignee", {
                        name: member.name,
                      })}
                    >
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-start text-muted-foreground"
                  onClick={() => setAssigneeMenuOpen((open) => !open)}
                >
                  {t("workspace.cardDetail.addAssignee")}
                </Button>

                {assigneeMenuOpen ? (
                  <div className="absolute z-10 mt-2 w-full rounded-xl border border-border bg-card p-3 shadow-lg">
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={assigneeSearch}
                        onChange={(event) =>
                          setAssigneeSearch(event.target.value)
                        }
                        placeholder={t("workspace.cardDetail.searchPlaceholder")}
                        className="h-9 pl-9"
                      />
                    </div>

                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {filteredMembers.map((member) => {
                        const selected = draft.assigneeIds.includes(member.id);
                        return (
                          <button
                            key={member.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                              selected && "text-primary",
                            )}
                            onClick={() => toggleAssignee(member.id)}
                          >
                            <span>{member.name}</span>
                            {selected ? <Check className="size-4" /> : null}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex gap-2 border-t border-border pt-3">
                      <Input
                        value={newAssigneeName}
                        onChange={(event) =>
                          setNewAssigneeName(event.target.value)
                        }
                        placeholder={t("workspace.cardDetail.namePlaceholder")}
                        className="h-9"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") addCustomAssignee();
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 shrink-0"
                        onClick={addCustomAssignee}
                      >
                        {t("workspace.cardDetail.addPeople")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="checklist"
            className="flex max-h-[52vh] flex-col px-0 py-5"
          >
            <div className="flex gap-2">
              <Input
                value={newChecklistLabel}
                onChange={(event) => setNewChecklistLabel(event.target.value)}
                placeholder={t("workspace.cardDetail.checklistPlaceholder")}
                className="h-10"
                onKeyDown={(event) => {
                  if (event.key === "Enter") addChecklistItem();
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0"
                onClick={addChecklistItem}
              >
                {t("workspace.cardDetail.addChecklist")}
              </Button>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-foreground"
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={(checked) =>
                      toggleChecklistItem(item.id, checked === true)
                    }
                    className="mt-0.5"
                  />
                  <span
                    className={cn(
                      item.completed && "text-muted-foreground line-through",
                    )}
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end border-t border-border pt-4">
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => workspaceActions.seeFullTor(draft.torId)}
              >
                {t("workspace.cardDetail.seeFullTor")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  );
}

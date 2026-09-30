"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { TorPriority } from "@/types/tor"
import type { WorkspaceCard, WorkspaceChecklistItem } from "@/types/workspace"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

type UseCardDetailDraftProps = {
  card: WorkspaceCard
  onSave: (updated: WorkspaceCard) => Promise<void> | void
  initialChecklist?: WorkspaceChecklistItem[]
}

export function useCardDetailDraft({
  card,
  onSave,
  initialChecklist,
}: UseCardDetailDraftProps) {
  const initialItems =
    card.checklist && card.checklist.length > 0
      ? card.checklist
      : initialChecklist ?? []

  const [draft, setDraft] = useState<WorkspaceCard>(() => ({
    ...card,
    checklist: initialItems,
  }))

  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")

  const draftRef = useRef<WorkspaceCard>(draft)
  const isDirtyRef = useRef(false)

  useEffect(() => {
    draftRef.current = draft
    isDirtyRef.current = isDirty
  }, [draft, isDirty])

  const save = useCallback(
    async (targetCard: WorkspaceCard) => {
      setIsSaving(true)
      setSaveStatus("saving")
      try {
        await onSave(targetCard)
        setIsDirty(false)
        isDirtyRef.current = false
        setSaveStatus("saved")
      } catch (error) {
        console.error("Failed to save workspace card:", error)
        setSaveStatus("error")
      } finally {
        setIsSaving(false)
      }
    },
    [onSave]
  )

  const patch = useCallback(
    (updater: (current: WorkspaceCard) => WorkspaceCard, autoPersist = true) => {
      setDraft((current) => {
        const next = updater(current)
        draftRef.current = next
        setIsDirty(true)
        isDirtyRef.current = true

        if (autoPersist) {
          void save(next)
        }
        return next
      })
    },
    [save]
  )

  const setPriority = useCallback(
    (priority: TorPriority) => {
      patch((current) => ({ ...current, priority }))
    },
    [patch]
  )

  const toggleAssignee = useCallback(
    (memberId: string) => {
      patch((current) => {
        const isAssigned = current.assigneeIds.includes(memberId)
        return {
          ...current,
          assigneeIds: isAssigned
            ? current.assigneeIds.filter((id) => id !== memberId)
            : [...current.assigneeIds, memberId],
        }
      })
    },
    [patch]
  )

  const removeAssignee = useCallback(
    (memberId: string) => {
      patch((current) => ({
        ...current,
        assigneeIds: current.assigneeIds.filter((id) => id !== memberId),
      }))
    },
    [patch]
  )

  const toggleChecklistItem = useCallback(
    (itemId: string, completed: boolean) => {
      patch((current) => ({
        ...current,
        checklist: (current.checklist ?? []).map((item) =>
          item.id === itemId ? { ...item, completed } : item
        ),
      }))
    },
    [patch]
  )

  const addChecklistItem = useCallback(
    (label: string) => {
      const trimmed = label.trim()
      if (!trimmed) return
      const newItem: WorkspaceChecklistItem = {
        id: `${draftRef.current.torId}-cl-${Date.now()}`,
        label: trimmed,
        completed: false,
      }
      patch((current) => ({
        ...current,
        checklist: [...(current.checklist ?? []), newItem],
      }))
    },
    [patch]
  )

  const removeChecklistItem = useCallback(
    (itemId: string) => {
      patch((current) => ({
        ...current,
        checklist: (current.checklist ?? []).filter((item) => item.id !== itemId),
      }))
    },
    [patch]
  )

  const saveNow = useCallback(async () => {
    return save(draftRef.current)
  }, [save])

  const flushSave = useCallback(async () => {
    if (isDirtyRef.current) {
      await save(draftRef.current)
    }
  }, [save])

  return {
    draft,
    checklist: draft.checklist ?? [],
    isDirty,
    isSaving,
    saveStatus,
    setPriority,
    toggleAssignee,
    removeAssignee,
    toggleChecklistItem,
    addChecklistItem,
    removeChecklistItem,
    saveNow,
    flushSave,
  }
}

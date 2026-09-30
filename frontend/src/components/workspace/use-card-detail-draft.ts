"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { TorPriority } from "@/types/tor"
import type {
  WorkspaceCard,
  WorkspaceChecklistItem,
  WorkspaceColumnId,
} from "@/types/workspace"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

type UseCardDetailDraftProps = {
  card: WorkspaceCard
  onCardChange?: (updated: WorkspaceCard) => void
  onSave: (updated: WorkspaceCard) => Promise<void> | void
  initialChecklist?: WorkspaceChecklistItem[]
}

export function useCardDetailDraft({
  card,
  onCardChange,
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

  const mountedRef = useRef(true)
  const draftRef = useRef<WorkspaceCard>(draft)
  const isDirtyRef = useRef(false)
  const onCardChangeRef = useRef(onCardChange)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    draftRef.current = draft
    isDirtyRef.current = isDirty
    onCardChangeRef.current = onCardChange
    onSaveRef.current = onSave
  }, [draft, isDirty, onCardChange, onSave])

  const save = useCallback(async (targetCard: WorkspaceCard) => {
    if (mountedRef.current) {
      setIsSaving(true)
      setSaveStatus("saving")
    }
    try {
      await onSaveRef.current(targetCard)
      isDirtyRef.current = false
      if (mountedRef.current) {
        setIsDirty(false)
        setSaveStatus("saved")
      }
    } catch (error) {
      console.error("Failed to save workspace card:", error)
      if (mountedRef.current) {
        setSaveStatus("error")
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false)
      }
    }
  }, [])

  const patch = useCallback(
    (updater: (current: WorkspaceCard) => WorkspaceCard) => {
      setDraft((current) => {
        const next = updater(current)
        draftRef.current = next

        queueMicrotask(() => {
          onCardChangeRef.current?.(next)
        })

        return next
      })
      setIsDirty(true)
      isDirtyRef.current = true
    },
    []
  )

  const setColumn = useCallback(
    (column: WorkspaceColumnId) => {
      patch((current) => {
        if (current.column === column) return current
        return { ...current, column }
      })
    },
    [patch]
  )

  const setPriority = useCallback(
    (priority: TorPriority) => {
      patch((current) => {
        if (current.priority === priority) return current
        return { ...current, priority }
      })
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

  // Debounced background auto-save (500ms after last change) - non-blocking UX
  useEffect(() => {
    if (!isDirty) return
    const timer = setTimeout(() => {
      if (isDirtyRef.current) {
        void flushSave()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [draft, isDirty, flushSave])

  return {
    draft,
    checklist: draft.checklist ?? [],
    isDirty,
    isSaving,
    saveStatus,
    setColumn,
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

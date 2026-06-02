import { useCallback, useEffect, useRef, useState } from "react"

export interface PendingDeletion<T> {
  item: T
  label: string
  startedAt: number
}

interface UseUndoDeleteOptions<T> {
  /** Called when the undo window expires OR when a second deletion flushes the first. */
  onDelete: (item: T) => Promise<void>
  /** Called when `onDelete` throws — use this to restore the item in the UI. */
  onRestoreOnError?: (item: T) => void
  /** Undo window in milliseconds. Defaults to 10 000. */
  delay?: number
}

/**
 * Generic deferred-delete hook with undo support.
 *
 * Usage:
 *   const { pending, schedule, undo, delay } = useUndoDelete({ onDelete, delay: 30_000 })
 *
 * - Call `schedule(item, label)` to start the countdown.
 *   If another item was already pending it is flushed immediately.
 * - Call `undo()` to cancel the pending deletion; it returns the item so the
 *   caller can restore it in the UI.
 * - On unmount the pending item is executed immediately so nothing is lost.
 */
export function useUndoDelete<T>({
  onDelete,
  onRestoreOnError,
  delay = 10_000,
}: UseUndoDeleteOptions<T>) {
  const [pending, setPending] = useState<PendingDeletion<T> | null>(null)

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef  = useRef<PendingDeletion<T> | null>(null)
  // Always-current refs so callbacks never have stale closures
  const onDeleteRef  = useRef(onDelete)
  const onRestoreRef = useRef(onRestoreOnError)

  useEffect(() => { onDeleteRef.current  = onDelete },          [onDelete])
  useEffect(() => { onRestoreRef.current = onRestoreOnError },  [onRestoreOnError])
  useEffect(() => { pendingRef.current   = pending },           [pending])

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function runDelete(p: PendingDeletion<T>) {
    onDeleteRef.current(p.item).catch(() => {
      onRestoreRef.current?.(p.item)
    })
  }

  const schedule = useCallback((item: T, label: string) => {
    // Flush any existing pending deletion right away
    const existing = pendingRef.current
    if (existing) {
      clearTimer()
      runDelete(existing)
    }

    const startedAt = Date.now()
    const next: PendingDeletion<T> = { item, label, startedAt }
    pendingRef.current = next
    setPending(next)

    timerRef.current = setTimeout(() => {
      runDelete(next)
      setPending(null)
      pendingRef.current = null
    }, delay)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay])

  /** Cancel the pending deletion and return the item for UI restoration. */
  const undo = useCallback((): T | null => {
    const p = pendingRef.current
    if (!p) return null
    clearTimer()
    setPending(null)
    pendingRef.current = null
    return p.item
  }, [])

  // Warn before page reload when a deletion is pending
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (pendingRef.current) e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  // Flush on unmount — never lose data when the user navigates away
  useEffect(() => {
    return () => {
      const p = pendingRef.current
      if (p) {
        clearTimer()
        onDeleteRef.current(p.item).catch(console.error)
      }
    }
  }, [])

  return { pending, schedule, undo, delay }
}

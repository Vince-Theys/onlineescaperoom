import { useEffect, useState } from "react"
import { Undo2 } from "lucide-react"
import type { PendingDeletion } from "@/hooks/useUndoDelete"

interface Props<T> {
  pending: PendingDeletion<T> | null
  delay: number
  onUndo: () => void
}

/**
 * Fixed toast shown while a deletion is pending.
 * Displays the item label, an "Ongedaan maken" button and a draining progress bar.
 */
export default function UndoToast<T>({ pending, delay, onUndo }: Props<T>) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!pending) return

    const end = pending.startedAt + delay

    function tick() {
      const remaining = end - Date.now()
      setProgress(Math.max(0, (remaining / delay) * 100))
    }

    tick()
    const id = setInterval(tick, 150)
    return () => clearInterval(id)
  }, [pending, delay])

  if (!pending) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        className="flex min-w-[340px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/30"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{pending.label}</span>
            {" "}verwijderd
          </p>
          <button
            onClick={onUndo}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Ongedaan maken
          </button>
        </div>

        {/* Countdown bar — drains from full to empty over `delay` ms */}
        <div className="h-1 w-full bg-border/30">
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

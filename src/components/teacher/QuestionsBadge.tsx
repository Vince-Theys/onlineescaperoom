import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react"

const TOTAL = 5

interface Props {
  count: number
}

export default function QuestionsBadge({ count }: Props) {
  const done = count >= TOTAL

  if (done) {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Volledig ingesteld</span>
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Geen vragen</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
      <ClipboardList className="h-4 w-4 shrink-0" />
      <span>
        {count}/{TOTAL} vragen
      </span>
    </div>
  )
}

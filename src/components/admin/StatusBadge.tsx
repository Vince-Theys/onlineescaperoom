import { CheckCircle2, Clock } from "lucide-react"

interface Props {
  status: "pending" | "active"
}

export default function StatusBadge({ status }: Props) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400">
        <Clock className="h-3.5 w-3.5" />
        In afwachting
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Actief
    </span>
  )
}

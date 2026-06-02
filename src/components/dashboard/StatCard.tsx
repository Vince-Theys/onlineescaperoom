import { Skeleton } from "@/components/ui/skeleton"

interface Props {
  icon: React.ReactNode
  label: string
  value: number | null
  sub: string
  tone: "neutral" | "cyan" | "warn"
}

export default function StatCard({ icon, label, value, sub, tone }: Props) {
  const iconColor =
    tone === "cyan"
      ? "text-accent"
      : tone === "warn"
        ? "text-yellow-400"
        : "text-muted-foreground"

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className={`mb-3 flex items-center gap-2 text-xs ${iconColor}`}>
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="text-3xl font-semibold text-foreground">
        {value === null ? <Skeleton className="h-9 w-12" /> : value}
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  )
}

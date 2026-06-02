interface Props {
  value: number
  max: number
}

export default function ProgressBar({ value, max }: Props) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="flex min-w-40 items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-primary/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm whitespace-nowrap text-muted-foreground">
        {value}/{max}
      </span>
    </div>
  )
}

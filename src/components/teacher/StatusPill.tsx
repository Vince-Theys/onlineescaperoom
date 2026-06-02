interface Props {
  status: string
  incomplete?: boolean
}

export default function StatusPill({ status, incomplete }: Props) {
  const done = status === "completed"
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${
        done
          ? "border-accent/30 bg-accent/10 text-accent"
          : incomplete
            ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
            : "border-border bg-muted text-muted-foreground"
      }`}
    >
      {done ? "Voltooid" : incomplete ? "Onvolledig" : "Actief"}
    </span>
  )
}

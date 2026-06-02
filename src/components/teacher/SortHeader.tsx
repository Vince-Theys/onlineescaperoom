import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

export type SortKey =
  | "team_name"
  | "teacher_email"
  | "questionCount"
  | "current_level"
  | "status"

interface Props {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: "asc" | "desc"
  onToggle: (k: SortKey) => void
}

export default function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onToggle,
}: Props) {
  const isActive = current === sortKey
  const Icon = isActive ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className="px-6 py-3 text-left">
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={`group inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
          isActive
            ? "text-accent"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span>{label}</span>
        <Icon
          className={`h-3.5 w-3.5 shrink-0 transition-opacity ${
            isActive ? "opacity-100" : "opacity-30 group-hover:opacity-70"
          }`}
        />
      </button>
    </th>
  )
}

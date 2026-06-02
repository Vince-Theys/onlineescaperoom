import { useState } from "react"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ROOM_ICONS } from "@/lib/floorConstants"

interface Props {
  open: boolean
  value: string | null
  onSelect: (name: string) => void
  onClose: () => void
}

export default function IconPickerDialog({ open, value, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("")

  const q = search.trim().toLowerCase()
  const filtered = q
    ? ROOM_ICONS.filter(
        (e) => e.label.toLowerCase().includes(q) || e.name.toLowerCase().includes(q),
      )
    : ROOM_ICONS

  // Group by category (preserving order)
  const categories: string[] = []
  const byCategory: Record<string, typeof ROOM_ICONS> = {}
  for (const entry of filtered) {
    if (!byCategory[entry.category]) {
      categories.push(entry.category)
      byCategory[entry.category] = []
    }
    byCategory[entry.category].push(entry)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kies een icoon</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoeken…"
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Icon grid */}
        <div className="max-h-[360px] overflow-y-auto">
          {categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Geen iconen gevonden.
            </p>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="mb-3">
                <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                  {cat}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {byCategory[cat].map((entry) => {
                    const Ic = (Icons as unknown as Record<string, LucideIcon>)[entry.name]
                    const selected = value === entry.name
                    return (
                      <button
                        key={entry.name}
                        type="button"
                        title={entry.label}
                        onClick={() => {
                          onSelect(entry.name)
                          onClose()
                        }}
                        className={`flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-lg border transition-colors ${
                          selected
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {Ic && <Ic size={20} />}
                        <span className="truncate px-1 text-[10px] leading-tight">
                          {entry.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

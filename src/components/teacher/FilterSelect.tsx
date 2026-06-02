import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}

export default function FilterSelect({
  label,
  value,
  onChange,
  options,
}: Props) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const isActive = value !== "all"
  const currentLabel = options.find(([v]) => v === value)?.[1] ?? options[0][1]

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIdx((i) => (i + 1) % options.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIdx((i) => (i - 1 + options.length) % options.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        const [val] = options[activeIdx]
        onChange(val)
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, activeIdx, options, onChange])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            if (!o) {
              const idx = options.findIndex(([v]) => v === value)
              setActiveIdx(idx >= 0 ? idx : 0)
            }
            return !o
          })
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors ${
          open
            ? "border-accent/60 bg-accent/5 text-foreground"
            : isActive
              ? "border-accent/40 bg-accent/5 text-accent"
              : "border-border text-foreground hover:border-foreground/40 hover:bg-muted/40"
        }`}
      >
        <span className="text-muted-foreground">{label}:</span>
        <span className={isActive ? "text-accent" : "text-foreground"}>
          {currentLabel}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${
            open ? "rotate-180 text-accent" : "text-muted-foreground"
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+4px)] right-0 z-50 min-w-45 overflow-hidden rounded-lg border border-border bg-card p-1 shadow-xl ring-1 shadow-black/40 ring-black/5"
        >
          {options.map(([val, optLabel], idx) => {
            const isSelected = val === value
            const isHovered = idx === activeIdx
            return (
              <button
                key={val}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => {
                  onChange(val)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isHovered
                    ? "bg-accent/10 text-foreground"
                    : isSelected
                      ? "text-accent"
                      : "text-muted-foreground"
                }`}
              >
                <span>{optLabel}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

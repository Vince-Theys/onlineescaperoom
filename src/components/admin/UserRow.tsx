import { useEffect, useRef, useState } from "react"
import { BookOpen, Check, ChevronDown, ShieldCheck, Trash2 } from "lucide-react"
import type { AppUser } from "@/types"
import RoleBadge from "./RoleBadge"
import StatusBadge from "./StatusBadge"

interface Props {
  profile: AppUser
  isSelf: boolean
  busy: boolean
  onToggleRole: () => void
  onDelete: () => void
}

const ROLES = [
  {
    value: "teacher",
    label: "Leerkracht",
    description: "Kan sessies beheren",
    Icon: BookOpen,
  },
  {
    value: "admin",
    label: "Admin",
    description: "Volledige toegang",
    Icon: ShieldCheck,
  },
] as const

export default function UserRow({
  profile,
  isSelf,
  busy,
  onToggleRole,
  onDelete,
}: Props) {
  const current = ROLES.find((r) => r.value === profile.app_role) ?? ROLES[0]
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  function handleSelect() {
    setOpen(false)
    onToggleRole()
  }

  return (
    <tr className="transition-colors hover:bg-accent/5">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-foreground">
            {profile.name}
          </span>
          {isSelf && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              jij
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={profile.status} />
      </td>
      <td className="px-6 py-4">
        <RoleBadge app_role={profile.app_role} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          {!isSelf && (
            <>
              {/* Role selector */}
              <div ref={ref} className="relative">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpen((o) => !o)}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:border-foreground/30 hover:bg-muted disabled:opacity-40"
                >
                  <current.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{current.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/40">
                    <p className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Rol wijzigen
                    </p>
                    {ROLES.map((role) => {
                      const selected = role.value === profile.app_role
                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={selected ? () => setOpen(false) : handleSelect}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/10 ${
                            selected ? "opacity-50 cursor-default" : ""
                          }`}
                        >
                          <role.Icon
                            className={`h-4 w-4 shrink-0 ${selected ? "text-accent" : "text-muted-foreground"}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {role.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {role.description}
                            </div>
                          </div>
                          {selected && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Delete account */}
              <button
                title="Account verwijderen"
                onClick={onDelete}
                disabled={busy}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

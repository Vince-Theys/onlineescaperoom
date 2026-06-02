import { Link } from "react-router-dom"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SessionWithSetup } from "@/types"

interface Props {
  sessions: SessionWithSetup[]
  isAdmin: boolean
}

export default function IncompleteSessionsAlert({ sessions, isAdmin }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border/60 px-6 py-4">
        <TriangleAlert className="h-4 w-4 shrink-0 text-yellow-400" />
        <h2 className="text-base font-semibold text-foreground">
          Onvolledige sessies
        </h2>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/40">
            <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Naam
            </th>
            {isAdmin && (
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Leerkracht
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Vragen
            </th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {sessions.map((s) => (
            <tr key={s.id} className="transition-colors hover:bg-accent/5">
              <td className="px-6 py-4">
                <span className="text-base font-medium text-foreground">
                  {s.team_name}
                </span>
              </td>
              {isAdmin && (
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">
                    {s.teacher_email ?? "—"}
                  </span>
                </td>
              )}
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-yellow-400">
                  {s.questionCount}/{s.level_count}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <Link to={`/dashboard/sessions/${s.id}`}>
                  <Button
                    size="sm"
                    className="h-9 rounded-lg px-4 text-sm font-semibold transition-all duration-150 hover:scale-[1.04] hover:shadow-[0_0_18px_rgba(233,24,82,0.5)]"
                  >
                    Invullen
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

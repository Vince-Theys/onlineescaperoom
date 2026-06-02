import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import type { SessionWithSetup } from "@/types"

interface Props {
  loading: boolean
  sessions: SessionWithSetup[]
  isAdmin: boolean
}

export default function ActiveSessionsTable({
  loading,
  sessions,
  isAdmin,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">
          Actieve sessies
        </h2>
        <Link to="/dashboard/sessions">
          <Button
            size="sm"
            className="h-9 rounded-lg px-4 text-sm font-semibold transition-all duration-150 hover:scale-[1.04] hover:shadow-[0_0_18px_rgba(233,24,82,0.5)]"
          >
            Alle sessies
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 p-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-muted-foreground">Geen actieve sessies.</p>
          {!isAdmin && (
            <Link to="/dashboard/sessions/create">
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-lg px-4 text-sm font-semibold"
              >
                + Nieuwe sessie aanmaken
              </Button>
            </Link>
          )}
        </div>
      ) : (
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
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Voortgang
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sessions.map((s) => {
              const total = s.level_count
              return (
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
                    <span
                      className={`text-sm font-medium ${
                        s.questionCount === total
                          ? "text-accent"
                          : "text-yellow-400"
                      }`}
                    >
                      {s.questionCount}/{total}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex min-w-30 items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-primary to-primary/70"
                          style={{
                            width: `${Math.round(((s.current_level ?? 0) / total) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm whitespace-nowrap text-muted-foreground">
                        {s.current_level ?? 0}/{total}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/dashboard/sessions/${s.id}`}>
                      <Button
                        size="sm"
                        className="h-9 rounded-lg px-4 text-sm font-semibold transition-all duration-150 hover:scale-[1.04] hover:shadow-[0_0_18px_rgba(233,24,82,0.5)]"
                      >
                        Openen
                      </Button>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

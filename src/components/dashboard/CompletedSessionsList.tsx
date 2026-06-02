import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import type { SessionWithSetup } from "@/types"

interface Props {
  sessions: SessionWithSetup[]
  isAdmin: boolean
}

export default function CompletedSessionsList({ sessions, isAdmin }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">
          Voltooide sessies
        </h2>
        <span className="text-xs text-muted-foreground">
          {sessions.length} sessie{sessions.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-accent/5"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-medium text-foreground">
                {s.team_name}
              </span>
              {isAdmin && s.teacher_email && (
                <span className="text-sm text-muted-foreground">
                  {s.teacher_email}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                Voltooid
              </span>
              <Link to={`/dashboard/sessions/${s.id}`}>
                <Button
                  size="sm"
                  className="h-9 rounded-lg px-4 text-sm font-semibold transition-all duration-150 hover:scale-[1.04] hover:shadow-[0_0_18px_rgba(233,24,82,0.5)]"
                >
                  Bekijk
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

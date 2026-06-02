import { CalendarDays, CheckCircle2, TriangleAlert, Users } from "lucide-react"
import StatCard from "./StatCard"

interface Props {
  loading: boolean
  isAdmin: boolean
  totalSessions: number
  activeSessions: number
  completedSessions: number
  readySessions: number
  incompleteSessions: number
  startedToday: number
  activeTeachers: number | null
}

export default function DashboardStatRow({
  loading,
  isAdmin,
  totalSessions,
  activeSessions,
  completedSessions,
  readySessions,
  incompleteSessions,
  startedToday,
  activeTeachers,
}: Props) {
  return (
    <div className={`grid gap-4 ${isAdmin ? "grid-cols-4" : "grid-cols-3"}`}>
      {isAdmin ? (
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Totaal sessies"
          value={loading ? null : totalSessions}
          sub={
            loading
              ? ""
              : `${activeSessions} actief · ${completedSessions} voltooid`
          }
          tone="neutral"
        />
      ) : (
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Gestart vandaag"
          value={loading ? null : startedToday}
          sub={
            loading
              ? ""
              : `${activeSessions} actief · ${completedSessions} voltooid`
          }
          tone="neutral"
        />
      )}
      <StatCard
        icon={<CheckCircle2 className="h-4 w-4" />}
        label="Volledig ingesteld"
        value={loading ? null : readySessions}
        sub={
          loading ? "" : `${readySessions} van ${totalSessions} sessies klaar`
        }
        tone="cyan"
      />
      <StatCard
        icon={<TriangleAlert className="h-4 w-4" />}
        label="Ontbrekende vragen"
        value={loading ? null : incompleteSessions}
        sub={
          loading
            ? ""
            : incompleteSessions === 0
              ? "Alle actieve sessies zijn klaar"
              : "Actieve sessies zonder alle vragen"
        }
        tone={incompleteSessions > 0 ? "warn" : "neutral"}
      />
      {isAdmin && (
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Actieve docenten"
          value={loading ? null : activeTeachers}
          sub={loading ? "" : "Unieke docenten met sessies"}
          tone="neutral"
        />
      )}
    </div>
  )
}

import { useEffect, useState } from "react"
import { listSessions } from "../services/sessionService"
import { listAllSessions } from "../services/adminService"
import { getQuestionCountsByEscapeRoom } from "../services/questionService"
import type { Session, SessionWithTeacher, SessionWithSetup } from "../types"
import { usePageTitle } from "@/hooks/use-page-title"
import { useRole } from "@/context/role-context"
import DashboardStatRow from "@/components/dashboard/DashboardStatRow"
import IncompleteSessionsAlert from "@/components/dashboard/IncompleteSessionsAlert"
import ActiveSessionsTable from "@/components/dashboard/ActiveSessionsTable"
import CompletedSessionsList from "@/components/dashboard/CompletedSessionsList"

export function Dashboard() {
  usePageTitle("Dashboard")
  const { app_role, loading: roleLoading } = useRole()
  const isAdmin = app_role === "admin"
  const [sessions, setSessions] = useState<SessionWithSetup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (roleLoading) return
    async function load() {
      const raw: (Session | SessionWithTeacher)[] = isAdmin
        ? await listAllSessions()
        : await listSessions()
      const escapeRoomIds = [...new Set(raw.map((s) => s.escape_room_id))]
      const counts = await getQuestionCountsByEscapeRoom(escapeRoomIds)
      setSessions(
        raw.map((s) => ({
          ...s,
          questionCount: counts[s.escape_room_id] ?? 0,
        }))
      )
    }
    load().finally(() => setLoading(false))
  }, [app_role, roleLoading, isAdmin])

  const allActiveSessions = sessions.filter((s) => s.status === "active")
  const incompleteSessions = allActiveSessions.filter(
    (s) => s.questionCount < s.level_count
  )
  const activeSessions = allActiveSessions.filter(
    (s) => s.questionCount >= s.level_count
  )
  const completedSessions = sessions.filter((s) => s.status === "completed")
  const readySessions = sessions.filter(
    (s) => s.questionCount === s.level_count
  )

  const todayStr = new Date().toDateString()
  const startedToday = sessions.filter(
    (s) => s.started_at && new Date(s.started_at).toDateString() === todayStr
  ).length

  const activeTeachers = isAdmin
    ? new Set(sessions.map((s) => s.created_by)).size
    : null

  return (
    <div className="flex flex-col gap-6">
      <DashboardStatRow
        loading={loading}
        isAdmin={isAdmin}
        totalSessions={sessions.length}
        activeSessions={activeSessions.length}
        completedSessions={completedSessions.length}
        readySessions={readySessions.length}
        incompleteSessions={incompleteSessions.length}
        startedToday={startedToday}
        activeTeachers={activeTeachers}
      />
      {!loading && incompleteSessions.length > 0 && (
        <IncompleteSessionsAlert
          sessions={incompleteSessions}
          isAdmin={isAdmin}
        />
      )}
      <ActiveSessionsTable
        loading={loading}
        sessions={activeSessions}
        isAdmin={isAdmin}
      />
      {!loading && completedSessions.length > 0 && (
        <CompletedSessionsList sessions={completedSessions} isAdmin={isAdmin} />
      )}
    </div>
  )
}

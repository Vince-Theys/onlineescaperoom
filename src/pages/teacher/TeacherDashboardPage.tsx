import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { usePageTitle } from "@/hooks/use-page-title"
import { Search } from "lucide-react"
import { createSession, deleteSession, listSessions } from "../../services/sessionService"
import { getQuestionCountsByEscapeRoom } from "../../services/questionService"
import type { Session, SessionWithTeacher } from "../../types"
import { useRole } from "@/context/role-context"
import { listAllSessions } from "../../services/adminService"
import SessionRow from "@/components/teacher/SessionRow"
import FilterSelect from "@/components/teacher/FilterSelect"
import SortHeader, { type SortKey } from "@/components/teacher/SortHeader"
import { compareSessions } from "@/lib/compareSessions"
import { useUndoDelete } from "@/hooks/useUndoDelete"
import UndoToast from "@/components/teacher/UndoToast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function TeacherDashboardPage() {
  usePageTitle("Sessies")
  const { app_role, userId, loading: roleLoading } = useRole()
  const navigate = useNavigate()
  const isAdmin = app_role === "admin"
  const [sessions, setSessions] = useState<(Session | SessionWithTeacher)[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>(
    {}
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)

  // Search + filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "completed"
  >("all")
  const [setupFilter, setSetupFilter] = useState<
    "all" | "complete" | "incomplete"
  >("all")
  const [levelFilter, setLevelFilter] = useState<"all" | 0 | 1 | 2 | 3 | 4 | 5>(
    "all"
  )

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("team_name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  // ── Undo-delete for sessions ────────────────────────────────────────────────
  const {
    pending: pendingSessionDelete,
    schedule: scheduleSessionDelete,
    undo: undoSessionDelete,
    delay: sessionDeleteDelay,
  } = useUndoDelete<Session | SessionWithTeacher>({
    onDelete: async (session) => {
      await deleteSession(session.id)
      // Clean up question counts only after the real deletion succeeds
      setQuestionCounts((c) => {
        const next = { ...c }
        delete next[session.escape_room_id]
        return next
      })
    },
    onRestoreOnError: (session) => {
      // API call failed — put the session back in the list
      setSessions((prev) => [...prev, session])
    },
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase()
    const dir = sortDir === "asc" ? 1 : -1
    return sessions
      .filter((s) => {
        if (statusFilter !== "all" && s.status !== statusFilter) return false

        const count = questionCounts[s.escape_room_id] ?? 0
        const levelTotal = s.level_count
        if (setupFilter === "complete" && count !== levelTotal) return false
        if (setupFilter === "incomplete" && count >= levelTotal) return false

        const level = s.current_level ?? 0
        if (levelFilter !== "all" && level !== levelFilter) return false

        if (q) {
          const inName = s.team_name.toLowerCase().includes(q)
          const inEmail =
            "teacher_email" in s &&
            (s as SessionWithTeacher).teacher_email?.toLowerCase().includes(q)
          if (!inName && !inEmail) return false
        }

        return true
      })
      .sort((a, b) => {
        const cmp = compareSessions(a, b, sortKey, questionCounts)
        if (cmp !== 0) return cmp * dir
        // Fall back to alphabetical so ties feel predictable
        return a.team_name.localeCompare(b.team_name, "nl", {
          sensitivity: "base",
        })
      })
  }, [
    sessions,
    questionCounts,
    search,
    statusFilter,
    setupFilter,
    levelFilter,
    sortKey,
    sortDir,
  ])

  const filtersActive =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    setupFilter !== "all" ||
    levelFilter !== "all"

  function resetFilters() {
    setSearch("")
    setStatusFilter("all")
    setSetupFilter("all")
    setLevelFilter("all")
  }

  useEffect(() => {
    if (roleLoading) return
    const fetcher = isAdmin ? listAllSessions : listSessions
    fetcher()
      .then(async (data) => {
        setSessions(data)
        const ids = data.map((s) => s.escape_room_id).filter(Boolean)
        if (ids.length) {
          const counts = await getQuestionCountsByEscapeRoom(ids)
          setQuestionCounts(counts)
        }
      })
      .catch(() => setError("Sessies konden niet geladen worden."))
      .finally(() => setLoading(false))
  }, [app_role, roleLoading, isAdmin])

  function handleCreated(session: Session) {
    setSessions((prev) => [session, ...prev])
    navigate(`/dashboard/sessions/${session.id}`)
  }

  function handleDuplicated(copy: Session, questionCount: number) {
    setSessions((prev) => [copy, ...prev])
    setQuestionCounts((prev) => ({ ...prev, [copy.escape_room_id]: questionCount }))
  }

  function handleUpdated(updated: Session) {
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    )
  }

  function handleDeleted(id: string) {
    const session = sessions.find((s) => s.id === id)
    if (!session) return
    // Optimistically remove from UI; questionCounts intentionally left intact
    // so the entry is still there if the user undoes.
    setSessions((prev) => prev.filter((s) => s.id !== id))
    // Schedule the real API call — starts the 30 s undo window
    scheduleSessionDelete(session, session.team_name)
  }

  function handleUndoSessionDelete() {
    const session = undoSessionDelete()
    if (session) {
      setSessions((prev) => [...prev, session])
      // questionCounts was never removed, so nothing extra to restore
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Alle sessies
          </h2>
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-lg px-4 text-sm font-semibold"
            onClick={() => setShowCreate(true)}
          >
            + Nieuwe sessie
          </Button>
        </div>

        {loading && (
          <div className="flex flex-col gap-3 p-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && <p className="p-6 text-sm text-destructive">{error}</p>}

        {!loading && !error && sessions.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <p className="text-sm text-muted-foreground">
              Nog geen sessies aangemaakt.
            </p>
            <Button variant="outline" onClick={() => setShowCreate(true)}>
              Eerste sessie aanmaken
            </Button>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-6 py-3">
            <div className="relative min-w-55 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isAdmin
                    ? "Zoek op sessienaam of docent…"
                    : "Zoek op sessienaam…"
                }
                className="h-9 pl-9"
              />
            </div>

            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[
                ["all", "Alles"],
                ["active", "Actief"],
                ["completed", "Voltooid"],
              ]}
            />

            <FilterSelect
              label="Vragen"
              value={setupFilter}
              onChange={(v) => setSetupFilter(v as typeof setupFilter)}
              options={[
                ["all", "Alles"],
                ["complete", "Volledig"],
                ["incomplete", "Ontbreekt"],
              ]}
            />

            <FilterSelect
              label="Niveau"
              value={String(levelFilter)}
              onChange={(v) =>
                setLevelFilter(
                  v === "all" ? "all" : (Number(v) as 0 | 1 | 2 | 3 | 4 | 5)
                )
              }
              options={[
                ["all", "Alles"],
                ["0", "Niet gestart"],
                ["1", "Niveau 1"],
                ["2", "Niveau 2"],
                ["3", "Niveau 3"],
                ["4", "Niveau 4"],
                ["5", "Niveau 5"],
              ]}
            />

            {filtersActive && (
              <button
                onClick={resetFilters}
                className="h-9 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Wissen
              </button>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          sessions.length > 0 &&
          filtersActive &&
          filteredSessions.length > 0 && (
            <div className="px-6 pt-3 text-xs text-muted-foreground">
              {filteredSessions.length} van {sessions.length} sessies
            </div>
          )}

        {!loading &&
          !error &&
          sessions.length > 0 &&
          filteredSessions.length === 0 && (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <p className="text-sm text-muted-foreground">
                Geen sessies gevonden met deze filters.
              </p>
              <button
                onClick={resetFilters}
                className="text-sm font-medium text-accent hover:underline"
              >
                Filters wissen
              </button>
            </div>
          )}

        {!loading && !error && filteredSessions.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                <SortHeader
                  label="Naam"
                  sortKey="team_name"
                  current={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                />
                {isAdmin && (
                  <SortHeader
                    label="Leerkracht"
                    sortKey="teacher_email"
                    current={sortKey}
                    dir={sortDir}
                    onToggle={toggleSort}
                  />
                )}
                <SortHeader
                  label="Vragen"
                  sortKey="questionCount"
                  current={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                />
                <SortHeader
                  label="Voortgang"
                  sortKey="current_level"
                  current={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                />
                <SortHeader
                  label="Status"
                  sortKey="status"
                  current={sortKey}
                  dir={sortDir}
                  onToggle={toggleSort}
                />
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  questionCount={questionCounts[session.escape_room_id] ?? 0}
                  isAdmin={isAdmin}
                  isOwner={session.created_by === userId}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                  onDuplicated={handleDuplicated}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      <UndoToast
        pending={pendingSessionDelete}
        delay={sessionDeleteDelay}
        onUndo={handleUndoSessionDelete}
      />
    </div>
  )
}

// ─── Create session modal ─────────────────────────────────────────────────────

function CreateSessionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (s: Session) => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  function validate(value: string) {
    if (!value.trim()) return "Geef de sessie een naam."
    if (value.trim().length < 2) return "Naam moet minstens 2 tekens lang zijn."
    if (value.trim().length > 60) return "Naam mag maximaal 60 tekens bevatten."
    return ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate(name)
    if (validationError) {
      setError(validationError)
      return
    }
    setBusy(true)
    try {
      const session = await createSession(name.trim())
      onCreated(session)
    } catch {
      setError("Er is iets misgegaan. Probeer opnieuw.")
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe sessie</DialogTitle>
          <DialogDescription>
            Geef je klas of sessie een naam om te beginnen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(validate(e.target.value))
              }}
              placeholder="bv. Klas 5A — les 1"
              autoFocus
              disabled={busy}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Annuleer
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Aanmaken…" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

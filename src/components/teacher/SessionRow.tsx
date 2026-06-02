import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart2, Copy, Pencil, Play, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { duplicateSession, restartSession, startSession } from "@/services/sessionService"
import type { Session, SessionWithTeacher } from "@/types"
import IconBtn from "./IconBtn"
import ProgressBar from "./ProgressBar"
import QuestionsBadge from "./QuestionsBadge"
import StatusPill from "./StatusPill"
import DeleteModal from "./DeleteModal"
import ResetModal from "./ResetModal"
import StatsModal from "./StatsModal"

interface Props {
  session: Session | SessionWithTeacher
  questionCount: number
  isAdmin: boolean
  isOwner: boolean
  onUpdated: (s: Session) => void
  onDeleted: (id: string) => void
  onDuplicated: (s: Session, questionCount: number) => void
}

export default function SessionRow({
  session,
  questionCount,
  isAdmin,
  isOwner,
  onUpdated,
  onDeleted,
  onDuplicated,
}: Props) {
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [busy, setBusy] = useState(false)
  const isStarted = (session.current_level ?? 0) > 0
  // Admins can start/resume any session; rename/delete/reset stays owner-only.
  const canStart = isAdmin || isOwner
  const canModify = isOwner

  const teacherEmail =
    "teacher_email" in session
      ? (session as SessionWithTeacher).teacher_email
      : undefined

  async function handleStart() {
    if (isStarted) {
      navigate(`/session/${session.id}`)
      return
    }
    setBusy(true)
    try {
      const updated = await startSession(session.id)
      onUpdated(updated)
      navigate(`/session/${session.id}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicate() {
    setBusy(true)
    try {
      const copy = await duplicateSession(session.id)
      onDuplicated(copy, questionCount)
    } finally {
      setBusy(false)
    }
  }

  async function handleRestart() {
    setBusy(true)
    try {
      const updated = await restartSession(session.id)
      onUpdated(updated)
      navigate(`/session/${session.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <tr className="transition-colors hover:bg-accent/5">
        <td className="px-6 py-4">
          <span className="text-base font-medium text-foreground">
            {session.team_name}
          </span>
        </td>
        {isAdmin && (
          <td className="px-6 py-4">
            <span className="text-sm text-muted-foreground">
              {teacherEmail ?? "—"}
            </span>
          </td>
        )}
        <td className="px-6 py-4">
          <QuestionsBadge count={questionCount} />
        </td>
        <td className="px-6 py-4">
          <ProgressBar
            value={session.current_level ?? 0}
            max={session.level_count}
          />
        </td>
        <td className="px-6 py-4">
          <StatusPill
            status={session.status}
            incomplete={
              session.status === "active" && questionCount < session.level_count
            }
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-1">
            {session.status === "completed" && (
              <IconBtn
                title="Statistieken bekijken"
                onClick={() => setShowStats(true)}
                disabled={busy}
              >
                <BarChart2 className="h-4.5 w-4.5" />
              </IconBtn>
            )}
            {canModify && isStarted && session.status !== "completed" && (
              <IconBtn
                title="Sessie resetten naar level 1"
                onClick={() => setShowReset(true)}
                disabled={busy}
                danger
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </IconBtn>
            )}
            <IconBtn
              title="Sessie dupliceren"
              onClick={handleDuplicate}
              disabled={busy}
            >
              <Copy className="h-4.5 w-4.5" />
            </IconBtn>
            <IconBtn
              title="Sessie bewerken"
              onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
              disabled={busy}
            >
              <Pencil className="h-4.5 w-4.5" />
            </IconBtn>
            <IconBtn
              title="Sessie verwijderen"
              onClick={() => setShowDelete(true)}
              disabled={busy}
              danger
            >
              <Trash2 className="h-4.5 w-4.5" />
            </IconBtn>

            {canStart && (
              <TooltipProvider delayDuration={300}>
                {session.status === "completed" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={handleRestart}
                        className="ml-3 h-9 rounded-lg px-4 text-sm transition-all duration-150 hover:scale-[1.04] hover:shadow-[0_0_14px_rgba(43,194,226,0.35)]"
                      >
                        Herstart
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Sessie opnieuw starten vanaf level 1
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-3 inline-flex">
                        <Button
                          size="sm"
                          disabled={busy || (!isStarted && questionCount < session.level_count)}
                          onClick={handleStart}
                          className="h-9 gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-150 enabled:hover:scale-[1.04] enabled:hover:shadow-[0_0_18px_rgba(233,24,82,0.5)]"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          {isStarted ? "Hervat" : "Start"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {!isStarted && questionCount < session.level_count
                        ? `Vul eerst alle ${session.level_count} vragen in voor je de sessie kan starten`
                        : isStarted
                          ? "Ga verder waar de klas gebleven is"
                          : "Sessie starten — de klas kan beginnen"}
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            )}
          </div>
        </td>
      </tr>

      {showStats && (
        <StatsModal session={session} onClose={() => setShowStats(false)} />
      )}
      {showReset && (
        <ResetModal
          session={session}
          onClose={() => setShowReset(false)}
          onReset={(updated) => onUpdated(updated)}
        />
      )}
      {showDelete && (
        <DeleteModal
          session={session}
          onClose={() => setShowDelete(false)}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}

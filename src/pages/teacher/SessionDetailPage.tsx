import { useEffect, useRef, useState } from "react"
import { useBlocker, useNavigate, useParams } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getSession,
  updateLevelCount,
  updateSession,
} from "../../services/sessionService"
import { usePageTitle } from "@/hooks/use-page-title"
import {
  createQuestion,
  deleteQuestion,
  deleteQuestionsAboveLevel,
  listQuestionsWithOptions,
  reorderLevels,
  updateQuestion,
} from "../../services/questionService"
import type { QuestionWithOptions, Session } from "../../types"
import type { DraftOption } from "@/components/teacher/QuestionEditor"
import LevelSelectorRail from "@/components/teacher/LevelSelectorRail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import QuestionEditor from "@/components/teacher/QuestionEditor"
import { Check, Pencil, X } from "lucide-react"
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

export default function SessionDetailPage() {
  usePageTitle("Sessiedetails")
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [busy, setBusy] = useState(false)
  const [levelBusy, setLevelBusy] = useState(false)
  const [levelCount, setLevelCount] = useState(5)
  // Ref so the async onDelete callback always sees the latest levelCount
  const levelCountRef = useRef(5)
  useEffect(() => { levelCountRef.current = levelCount }, [levelCount])
  const [showDecreaseConfirm, setShowDecreaseConfirm] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [isDirty, setIsDirty] = useState(false)
  const [justCreatedLevel, setJustCreatedLevel] = useState<number | null>(null)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const blocker = useBlocker(isDirty)

  // ── Undo-delete for questions ───────────────────────────────────────────────
  const {
    pending: pendingQuestionDelete,
    schedule: scheduleQuestionDelete,
    undo: undoQuestionDelete,
    delay: questionDeleteDelay,
  } = useUndoDelete<QuestionWithOptions>({
    onDelete: async (question) => {
      // Re-fetch fresh list at execution time so reordering is always correct
      const fresh = await listQuestionsWithOptions(session!.escape_room_id)
      await deleteQuestion(question.id, fresh)
      // Persist the already-optimistically-decreased level count
      await updateLevelCount(session!.escape_room_id, levelCountRef.current)
    },
    onRestoreOnError: (question) => {
      // API call failed — restore question and level count
      const restoredLevel = question.level_number
      setQuestions((prev) =>
        [
          ...prev.map((q) => ({
            ...q,
            level_number: q.level_number >= restoredLevel ? q.level_number + 1 : q.level_number,
          })),
          question,
        ].sort((a, b) => a.level_number - b.level_number)
      )
      setLevelCount((l) => l + 1)
    },
  })

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  function guardedAction(action: () => void) {
    if (isDirty) {
      setPendingAction(() => action)
      setShowUnsavedModal(true)
    } else {
      action()
    }
  }

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const s = await getSession(id!)
        if (!s) {
          setError("Sessie niet gevonden.")
          return
        }
        setSession(s)
        setLevelCount(s.level_count)
        const qs = await listQuestionsWithOptions(s.escape_room_id)
        setQuestions(qs)
      } catch {
        setError("Kon de sessie niet laden.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const selectedQuestion = questions.find(
    (q) => q.level_number === selectedLevel
  )

  function handleDelete(questionId: string) {
    const question = questions.find((q) => q.id === questionId)
    if (!question) return
    const deletedLevel = question.level_number

    // Optimistically remove question and shift remaining levels down
    setQuestions((prev) =>
      prev
        .filter((q) => q.id !== questionId)
        .map((q) => ({
          ...q,
          level_number: q.level_number > deletedLevel ? q.level_number - 1 : q.level_number,
        }))
    )

    // Decrease the room count
    setLevelCount((l) => l - 1)

    // Keep selected level in range
    if (selectedLevel === deletedLevel) {
      setSelectedLevel(Math.max(1, deletedLevel - 1))
    } else if (selectedLevel > deletedLevel) {
      setSelectedLevel((l) => l - 1)
    }

    // Schedule the real API call — starts the 10 s undo window
    scheduleQuestionDelete(question, `Kamer ${deletedLevel}`)
  }

  function handleUndoQuestionDelete() {
    const question = undoQuestionDelete()
    if (question) {
      const restoredLevel = question.level_number
      // Re-insert question and shift others back up
      setQuestions((prev) =>
        [
          ...prev.map((q) => ({
            ...q,
            level_number: q.level_number >= restoredLevel ? q.level_number + 1 : q.level_number,
          })),
          question,
        ].sort((a, b) => a.level_number - b.level_number)
      )
      // Restore the room count and navigate back to the restored level
      setLevelCount((l) => l + 1)
      setSelectedLevel(restoredLevel)
    }
  }

  async function handleIncreaseLevel() {
    if (!session || levelCount >= 10 || levelBusy) return
    setLevelBusy(true)
    try {
      await updateLevelCount(session.escape_room_id, levelCount + 1)
      setLevelCount((l) => l + 1)
    } finally {
      setLevelBusy(false)
    }
  }

  async function handleDecreaseLevel() {
    if (!session || levelCount <= 1 || levelBusy) return
    const hasQuestion = questions.some((q) => q.level_number === levelCount)
    if (hasQuestion) {
      setShowDecreaseConfirm(true)
      return
    }
    setLevelBusy(true)
    try {
      await updateLevelCount(session.escape_room_id, levelCount - 1)
      if (selectedLevel >= levelCount) setSelectedLevel(levelCount - 1)
      setLevelCount((l) => l - 1)
    } finally {
      setLevelBusy(false)
    }
  }

  async function confirmDecreaseLevel() {
    if (!session) return
    setShowDecreaseConfirm(false)
    setLevelBusy(true)
    try {
      await deleteQuestionsAboveLevel(session.escape_room_id, levelCount - 1)
      await updateLevelCount(session.escape_room_id, levelCount - 1)
      setQuestions((prev) => prev.filter((q) => q.level_number < levelCount))
      if (selectedLevel >= levelCount) setSelectedLevel(levelCount - 1)
      setLevelCount((l) => l - 1)
    } finally {
      setLevelBusy(false)
    }
  }

  async function handleReorder(orderedQuestionIds: (string | null)[]) {
    // Optimistic update — reassign level_numbers to match drag order
    setQuestions((prev) => {
      const next = prev.map((q) => ({ ...q }))
      orderedQuestionIds.forEach((id, i) => {
        if (!id) return
        const q = next.find((q) => q.id === id)
        if (q) q.level_number = i + 1
      })
      return next.sort((a, b) => a.level_number - b.level_number)
    })
    try {
      await reorderLevels(orderedQuestionIds)
    } catch {
      // On failure, re-fetch to restore correct state
      const qs = await listQuestionsWithOptions(session!.escape_room_id)
      setQuestions(qs)
    }
  }

  async function handleSave(data: {
    questionText: string
    questionType: string
    roomName?: string | null
    roomTheme?: string | null
    roomIcon?: string | null
    roomTint?: string | null
    options: DraftOption[]
  }) {
    setBusy(true)
    try {
      const opts = data.options.map((o) => ({
        text: o.text.trim(),
        isCorrect: o.isCorrect,
      }))
      let saved: QuestionWithOptions
      if (selectedQuestion) {
        saved = await updateQuestion(selectedQuestion.id, {
          questionText: data.questionText.trim(),
          questionType: data.questionType,
          roomName: data.roomName ?? null,
          roomTheme: data.roomTheme ?? null,
          roomIcon: data.roomIcon ?? null,
          roomTint: data.roomTint ?? null,
          options: opts,
        })
        setQuestions((prev) => prev.map((q) => (q.id === saved.id ? saved : q)))
      } else {
        saved = await createQuestion({
          escapeRoomId: session!.escape_room_id,
          levelNumber: selectedLevel,
          questionText: data.questionText.trim(),
          questionType: data.questionType,
          roomName: data.roomName ?? null,
          roomTheme: data.roomTheme ?? null,
          roomIcon: data.roomIcon ?? null,
          roomTint: data.roomTint ?? null,
          options: opts,
        })
        setQuestions((prev) =>
          [...prev, saved].sort((a, b) => a.level_number - b.level_number)
        )
        setJustCreatedLevel(saved.level_number)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <button
          onClick={() => guardedAction(() => navigate("/dashboard/sessions"))}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Sessies
        </button>
        <span className="text-muted-foreground">/</span>
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span className="font-medium text-foreground">
            {session?.team_name}
          </span>
        )}
      </div>

      {/* Session name header */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4">
        {loading ? (
          <Skeleton className="h-6 w-48" />
        ) : editingName ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              const trimmed = nameValue.trim()
              if (!trimmed || trimmed === session?.team_name) {
                setEditingName(false)
                return
              }
              setBusy(true)
              try {
                const updated = await updateSession(session!.id, {
                  team_name: trimmed,
                })
                setSession((s) => ({ ...s!, ...updated }))
              } finally {
                setBusy(false)
                setEditingName(false)
              }
            }}
          >
            <Input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="h-9 max-w-sm text-base font-semibold"
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingName(false)
              }}
            />
            <Button
              type="submit"
              size="sm"
              disabled={busy}
              className="h-9 w-9 p-0"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setEditingName(false)}
              className="h-9 w-9 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground">
              {session?.team_name}
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNameValue(session?.team_name ?? "")
                setEditingName(true)
              }}
              className="h-9 gap-2 rounded-lg px-4 text-sm"
            >
              <Pencil className="h-3.5 w-3.5" />
              Hernoemen
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Decrease confirmation modal */}
      {showDecreaseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <p className="text-sm font-medium text-foreground">
              Kamer {levelCount} heeft een vraag. Als je doorgaat, wordt de
              vraag permanent verwijderd.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDecreaseConfirm(false)}
              >
                Annuleer
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDecreaseLevel}
              >
                Verwijder en verlaag
              </Button>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <div
          className="grid grid-cols-[280px_1fr] gap-4"
          style={{ minHeight: "calc(100vh - 200px)" }}
        >
          {/* Left column */}
          <div>
            <LevelSelectorRail
              questions={questions}
              selectedLevel={selectedLevel}
              levelCount={levelCount}
              loading={loading}
              onSelectLevel={(level) => guardedAction(() => setSelectedLevel(level))}
              onReorder={handleReorder}
              onIncrease={handleIncreaseLevel}
              onDecrease={handleDecreaseLevel}
              busy={levelBusy}
            />
          </div>

          {/* Right — question editor */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {loading ? (
              <div className="flex flex-col gap-5 p-8">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              <QuestionEditor
                key={`${selectedLevel}-${selectedQuestion?.id ?? "new"}`}
                level={selectedLevel}
                question={selectedQuestion}
                busy={busy}
                onSave={handleSave}
                onDelete={
                  selectedQuestion
                    ? () => handleDelete(selectedQuestion.id)
                    : undefined
                }
                onDirtyChange={setIsDirty}
                initialSaveStatus={justCreatedLevel === selectedLevel ? "saved" : "idle"}
                onInitialSaveStatusConsumed={() => setJustCreatedLevel(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* Unsaved changes modal — triggered by guardedAction (breadcrumb/level switch) */}
      {showUnsavedModal && (
        <Dialog open onOpenChange={() => { setShowUnsavedModal(false) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Onopgeslagen wijzigingen</DialogTitle>
              <DialogDescription>
                Je hebt wijzigingen die nog niet opgeslagen zijn. Wil je doorgaan zonder op te slaan?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowUnsavedModal(false)}>
                Blijf hier
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowUnsavedModal(false)
                  setIsDirty(false)
                  pendingAction?.()
                  setPendingAction(null)
                }}
              >
                Verlaat zonder op te slaan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <UndoToast
        pending={pendingQuestionDelete}
        delay={questionDeleteDelay}
        onUndo={handleUndoQuestionDelete}
      />

      {/* Unsaved changes modal — triggered by useBlocker (sidebar/browser navigation) */}
      {blocker.state === "blocked" && (
        <Dialog open onOpenChange={() => blocker.reset()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Onopgeslagen wijzigingen</DialogTitle>
              <DialogDescription>
                Je hebt wijzigingen die nog niet opgeslagen zijn. Wil je doorgaan zonder op te slaan?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => blocker.reset()}>
                Blijf hier
              </Button>
              <Button
                variant="destructive"
                onClick={() => { setIsDirty(false); blocker.proceed() }}
              >
                Verlaat zonder op te slaan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

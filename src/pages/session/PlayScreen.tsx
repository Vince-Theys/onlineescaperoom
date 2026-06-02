import { lazy, Suspense, useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  getSession,
  advanceLevel,
  completeSession,
} from "@/services/sessionService"
import { listQuestionsWithOptions } from "@/services/questionService"
import type {
  Session,
  QuestionWithOptions,
  AnswerOption,
  AnswerState,
} from "@/types"
import { evaluateAnswer, generateExplanation } from "@/services/geminiService"
import { usePageTitle } from "@/hooks/use-page-title"
import SessionBackground from "@/components/session/SessionBackground"
import CorrectAnswerBanner from "@/components/session/CorrectAnswerBanner"
import AnswerGrid from "@/components/session/AnswerGrid"
import WrongAnswerBanner from "@/components/session/WrongAnswerBanner"
import type { RoomPhase, FocusTarget } from "@/components/session/room3d"

// Object order: question[0] → board, question[1] → clock, question[2] → book
const OBJECT_ORDER: FocusTarget[] = ["board", "clock", "book"]

// Stable ordering for the (up to 3) questions that share a level_number.
// There is no `order` column, so we sort by id for deterministic mapping.
function sortLevelQuestions(qs: QuestionWithOptions[]): QuestionWithOptions[] {
  return [...qs].sort((a, b) => a.id.localeCompare(b.id))
}

// Lazy-load the heavy 3D scenes (Three.js ~1MB chunk)
const WorkshopScene = lazy(() =>
  import("@/components/session/room3d/WorkshopScene").then((m) => ({
    default: m.default,
  }))
)
const AtelierScene = lazy(() =>
  import("@/components/session/room3d/AtelierScene").then((m) => ({
    default: m.default,
  }))
)

export default function PlayScreen() {
  usePageTitle("Escape Room")
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // ─── Data state ──────────────────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [question, setQuestion] = useState<QuestionWithOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answerState, setAnswerState] = useState<AnswerState>("idle")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [levelAttempts, setLevelAttempts] = useState<Record<string, number>>({})
  const [openInput, setOpenInput] = useState("")
  const [evaluating, setEvaluating] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [loadingExplanation, setLoadingExplanation] = useState(false)

  // ─── Room state ──────────────────────────────────────────────────────────
  const [roomPhase, setRoomPhase] = useState<RoomPhase>("exploring")
  const [showPanel, setShowPanel] = useState(false)
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null)
  const [levelQuestions, setLevelQuestions] = useState<QuestionWithOptions[]>([])
  const [completedObjects, setCompletedObjects] = useState<Set<FocusTarget>>(new Set())
  const [doorUnlocked, setDoorUnlocked] = useState(false)
  const [fadeState, setFadeState] = useState<"none" | "out" | "in">("none")
  const [noNextRoom, setNoNextRoom] = useState(false)
  const [noRoomQuestionIdx, setNoRoomQuestionIdx] = useState(0)


  useEffect(() => {
    async function init() {
      try {
        if (!id) return
        const s = await getSession(id)
        if (!s) { setError("Sessie niet gevonden."); return }
        if (!s.started_at || s.current_level === null) {
          navigate(`/session/${id}`)
          return
        }
        setSession(s)
        const qs = await listQuestionsWithOptions(s.escape_room_id)
        setQuestions(qs)
        // Load up to 3 questions that share this level's number
        const lqs = sortLevelQuestions(qs.filter(q => q.level_number === s.current_level))
        setLevelQuestions(lqs)
        // Non-room levels: show first question immediately
        if (s.current_level !== 1 && lqs.length > 0) {
          setQuestion(lqs[0])
          setNoRoomQuestionIdx(0)
          setShowPanel(true)
        } else {
          setQuestion(null) // room level: set when user clicks an object
        }
      } catch {
        setError("Kon de sessie niet laden.")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, navigate])

  // Show panel with slight delay after zooming in (3D room only)
  useEffect(() => {
    if (roomPhase !== "focused") return
    const timer = setTimeout(() => setShowPanel(true), 2600)
    return () => clearTimeout(timer)
  }, [roomPhase])

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleObjectClick = useCallback((target: FocusTarget) => {
    if (completedObjects.has(target)) return
    const idx = OBJECT_ORDER.indexOf(target)
    const q = levelQuestions[idx]
    if (!q) return
    setFocusTarget(target)
    setQuestion(q)
    setAnswerState("idle")
    setSelectedId(null)
    setOpenInput("")
    setExplanation(null)
    setShowPanel(false)
    setRoomPhase("focused")
  }, [completedObjects, levelQuestions])

  function triggerExplanation(questionText: string, correctAnswer: string) {
    setExplanation(null)
    setLoadingExplanation(true)
    generateExplanation(questionText, correctAnswer)
      .then((text) => setExplanation(text || null))
      .finally(() => setLoadingExplanation(false))
  }

  function handleAnswer(option: AnswerOption) {
    if (answerState !== "idle") return
    setSelectedId(option.id)
    if (option.is_correct) {
      setAnswerState("correct")
      triggerExplanation(question!.question_text, option.option_text)
    } else {
      setWrongAttempts((prev) => prev + 1)
      setAnswerState("wrong")
    }
  }

  async function handleOpenAnswer() {
    if (!question || !openInput.trim() || evaluating) return
    const referenceAnswer =
      question.answer_options.find((o) => o.is_correct)?.option_text ?? ""
    setEvaluating(true)
    try {
      const correct = await evaluateAnswer(
        question.question_text,
        referenceAnswer,
        openInput.trim()
      )
      if (correct) {
        setAnswerState("correct")
        triggerExplanation(question.question_text, referenceAnswer)
      } else {
        setWrongAttempts((prev) => prev + 1)
        setAnswerState("wrong")
      }
    } catch {
      setError("Kon het antwoord niet controleren.")
    } finally {
      setEvaluating(false)
    }
  }

  function handleObjectComplete() {
    if (!id || !session || !focusTarget) return

    // Mark this object as done
    const newCompleted = new Set(completedObjects)
    newCompleted.add(focusTarget)
    setCompletedObjects(newCompleted)

    const activeObjs = OBJECT_ORDER.slice(0, levelQuestions.length)
    const allDone    = activeObjs.every(obj => newCompleted.has(obj))

    // Always return to exploring view
    setRoomPhase("exploring")
    setFocusTarget(null)
    setAnswerState("idle")
    setSelectedId(null)
    setExplanation(null)
    setOpenInput("")
    setShowPanel(false)

    if (allDone) {
      // Track attempt count for this level, then wait for door click
      const current = session.current_level ?? 1
      const updatedAttempts = { ...levelAttempts, [String(current)]: wrongAttempts + 1 }
      setLevelAttempts(updatedAttempts)
      setWrongAttempts(0)
      setDoorUnlocked(true)
    }
  }

  // ─── Door click → camera to door → fade → advance ────────────────────────

  function handleDoorClick() {
    if (!session || advancing || roomPhase === "door" || fadeState !== "none") return
    const current     = session.current_level ?? 1
    const totalLevels = session.level_count   ?? 5

    // Check if next room has questions (only relevant when not on last room)
    if (current < totalLevels) {
      const nextLevelQs = questions.filter(q => q.level_number === current + 1)
      if (nextLevelQs.length === 0) {
        setNoNextRoom(true)
        return
      }
    }

    // Camera moves toward door, then fade out starts
    setRoomPhase("door")
    setTimeout(() => setFadeState("out"), 1800)
  }

  async function handleFadeOutEnd() {
    if (!id || !session) return
    const current     = session.current_level ?? 1
    const totalLevels = session.level_count   ?? 5

    setAdvancing(true)
    try {
      if (current >= totalLevels) {
        await completeSession(id, levelAttempts)
        navigate(`/session/${id}/escape`)
        return
      }
      const nextLevel = current + 1
      await advanceLevel(id, nextLevel, levelAttempts)
      setSession(prev => prev ? { ...prev, current_level: nextLevel } : null)
      const lqs = sortLevelQuestions(questions.filter(q => q.level_number === nextLevel))
      setLevelQuestions(lqs)
      setCompletedObjects(new Set())
      setDoorUnlocked(false)
      setFocusTarget(null)
      setAnswerState("idle")
      setSelectedId(null)
      setExplanation(null)
      setOpenInput("")
      setNoRoomQuestionIdx(0)
      setRoomPhase("exploring")
      // Non-room levels: show first question immediately after fade-in
      if (nextLevel !== 1 && lqs.length > 0) {
        setQuestion(lqs[0])
        setShowPanel(true)
      } else {
        setQuestion(null)
        setShowPanel(false)
      }
      setFadeState("in")
    } catch {
      setError("Kon niet naar het volgende level gaan.")
      setFadeState("none")
      setRoomPhase("exploring")
    } finally {
      setAdvancing(false)
    }
  }

  function handleFadeInEnd() {
    setFadeState("none")
  }

  function handleRetry() {
    setAnswerState("idle")
    setSelectedId(null)
    setOpenInput("")
  }

  function handleNoRoomNext() {
    if (!session) return
    const nextIdx = noRoomQuestionIdx + 1
    if (nextIdx >= levelQuestions.length) {
      // All questions done — check if next level has content
      const current     = session.current_level ?? 1
      const totalLevels = session.level_count   ?? 5
      if (current < totalLevels) {
        const nextLevelQs = questions.filter(q => q.level_number === current + 1)
        if (nextLevelQs.length === 0) { setNoNextRoom(true); return }
      }
      setFadeState("out")
    } else {
      setNoRoomQuestionIdx(nextIdx)
      setQuestion(levelQuestions[nextIdx])
      setAnswerState("idle")
      setSelectedId(null)
      setExplanation(null)
      setOpenInput("")
    }
  }

  const currentLevel = session?.current_level ?? 1
  const hasRoom = currentLevel === 1 || currentLevel === 2
  const SceneComponent = currentLevel === 2 ? AtelierScene : WorkshopScene

  // ─── Loading / Error ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <SessionBackground>
        <div className="flex flex-col items-center gap-6">
          <div className="h-8 w-48 animate-pulse rounded-lg" style={{ background: "rgba(43,194,226,0.15)" }} />
          <div className="h-32 w-full max-w-2xl animate-pulse rounded-2xl" style={{ background: "rgba(43,194,226,0.1)" }} />
        </div>
      </SessionBackground>
    )
  }

  if (error) {
    return (
      <SessionBackground>
        <p className="text-2xl font-bold" style={{ color: "#e91852" }}>{error}</p>
      </SessionBackground>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  // Levels without a 3D room: plain question screen
  if (!hasRoom) {
    const noRoomAllDone = noRoomQuestionIdx >= levelQuestions.length - 1
    return (
      <SessionBackground>
        <style>{`
          @keyframes panel-fade-in {
            from { opacity: 0; transform: scale(0.97) translateY(16px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes mila-slide-up {
            from { opacity: 0; transform: translateY(160px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes celebration-pulse {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.35; }
          }
          @keyframes dot-bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-6px); }
          }
          @keyframes fade-to-black {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes fade-from-black {
            from { opacity: 1; }
            to   { opacity: 0; }
          }
        `}</style>

        {/* Back button */}
        <div className="pointer-events-auto fixed top-6 left-6 z-10">
          <Button
            onClick={() => navigate(`/session/${id}`)}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm"
            style={{ background: "rgba(0,14,31,0.6)" }}
          >
            ← Terug
          </Button>
        </div>

        {/* Room badge */}
        <div className="pointer-events-none fixed top-6 left-1/2 z-10 -translate-x-1/2">
          <div
            className="rounded-full px-6 py-2 text-sm font-bold tracking-widest text-white uppercase backdrop-blur-sm"
            style={{ background: "rgba(0,14,31,0.7)", border: "1px solid rgba(43,194,226,0.3)" }}
          >
            Kamer {currentLevel} van {session?.level_count ?? 5}
          </div>
        </div>

        {/* Celebration overlay */}
        {answerState === "correct" && (
          <div
            className="pointer-events-none fixed inset-0 z-[3]"
            style={{
              background: "radial-gradient(ellipse at center, rgba(43,194,226,0.3) 0%, transparent 70%)",
              animation: "celebration-pulse 1.5s ease-in-out infinite",
            }}
          />
        )}

        {/* Question panel */}
        {showPanel && (
          <div
            className="pointer-events-auto fixed inset-0 z-10 flex items-center justify-center"
            style={{ background: "rgba(0,10,28,0.55)", backdropFilter: "blur(2px)" }}
          >
            <div
              className="flex w-full flex-col items-center gap-5 px-6"
              style={{ maxWidth: "720px", marginBottom: "16vh" }}
            >
              {/* Speech bubble */}
              <div className="relative w-full" style={{ animation: "panel-fade-in 0.7s ease-out both" }}>
                <div style={{
                  position: "absolute", left: -22, bottom: "12%",
                  width: 0, height: 0,
                  borderTop: "30px solid transparent",
                  borderBottom: "0px solid transparent",
                  borderRight: "28px solid #ffffff",
                }} />
                <div
                  className="rounded-3xl px-8 py-6"
                  style={{ background: "#ffffff", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" }}
                >
                  <p
                    className="font-bold text-center leading-snug"
                    style={{ color: "#001833", fontSize: "clamp(1.5rem, 2.8vw, 2.2rem)" }}
                  >
                    {question?.question_text ?? "Geen vraag gevonden."}
                  </p>
                </div>
              </div>

              {/* Feedback banners */}
              {answerState === "correct" && (
                <CorrectAnswerBanner
                  loadingExplanation={loadingExplanation}
                  explanation={explanation}
                />
              )}
              {answerState === "wrong" && (
                <WrongAnswerBanner onRetry={handleRetry} />
              )}

              {/* Multiple-choice answers */}
              {question?.question_type !== "open" && question && answerState !== "correct" && (
                <div className="w-full" style={{ animation: "panel-fade-in 0.6s ease-out 0.3s both" }}>
                  <AnswerGrid
                    question={question}
                    answerState={answerState}
                    selectedId={selectedId}
                    onAnswer={handleAnswer}
                  />
                </div>
              )}

              {/* Open answer */}
              {question?.question_type === "open" && answerState !== "correct" && (
                <div className="flex w-full flex-col gap-4" style={{ animation: "panel-fade-in 0.6s ease-out 0.3s both" }}>
                  <div className="flex w-full gap-3">
                    <input
                      type="text"
                      value={openInput}
                      onChange={(e) => setOpenInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleOpenAnswer() }}
                      disabled={evaluating || answerState !== "idle"}
                      placeholder="Typ het antwoord van de klas…"
                      className="flex-1 rounded-2xl border-2 bg-transparent px-6 font-bold text-white outline-none placeholder:text-white/30 disabled:opacity-50"
                      style={{
                        fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
                        minHeight: "70px",
                        borderColor: "rgba(43,194,226,0.4)",
                        background: "rgba(0,36,74,0.7)",
                        backdropFilter: "blur(4px)",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleOpenAnswer}
                      disabled={!openInput.trim() || evaluating || answerState !== "idle"}
                      className="rounded-2xl px-8 font-bold tracking-widest text-white uppercase transition-all disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        fontSize: "1.25rem", minHeight: "70px",
                        background: "#2bc2e2",
                        boxShadow: "0 0 32px rgba(43,194,226,0.5), 0 4px 16px rgba(0,0,0,0.4)",
                      }}
                    >
                      {evaluating ? "Bezig…" : "Controleer"}
                    </button>
                  </div>
                  {evaluating && (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: "#2bc2e2" }}>
                        De AI controleert het antwoord
                      </span>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: "#2bc2e2", animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Next button */}
              {answerState === "correct" && (
                <Button
                  onClick={handleNoRoomNext}
                  className="w-full rounded-2xl py-5 font-bold tracking-widest text-white uppercase"
                  style={{
                    fontSize: "1.2rem",
                    background: noRoomAllDone ? "#2bc2e2" : "#7c3aed",
                    boxShadow: noRoomAllDone
                      ? "0 0 32px rgba(43,194,226,0.6), 0 4px 16px rgba(0,0,0,0.4)"
                      : "0 0 32px rgba(124,58,237,0.6), 0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  {noRoomAllDone ? "Ga naar de volgende kamer →" : "Volgende vraag →"}
                </Button>
              )}
            </div>

            {/* Ezra */}
            <img
              src="/Ezra.png"
              alt="Mila"
              className="pointer-events-none select-none fixed"
              style={{
                height: "100vh",
                objectFit: "contain",
                objectPosition: "top",
                left: "1vw",
                bottom: "-34vh",
                zIndex: 20,
                animation: "mila-slide-up 0.9s ease-out 0.2s both",
                filter: "drop-shadow(0 0 32px rgba(43,194,226,0.25))",
              }}
            />
          </div>
        )}

        {/* Fade overlays */}
        {fadeState === "out" && (
          <div
            className="pointer-events-none fixed inset-0 z-[60] bg-black"
            style={{ opacity: 0, animation: "fade-to-black 0.8s ease forwards" }}
            onAnimationEnd={handleFadeOutEnd}
          />
        )}
        {fadeState === "in" && (
          <div
            className="pointer-events-none fixed inset-0 z-[60] bg-black"
            style={{ opacity: 1, animation: "fade-from-black 0.9s ease 0.35s forwards" }}
            onAnimationEnd={handleFadeInEnd}
          />
        )}

        {/* "No next room" warning */}
        {noNextRoom && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,10,28,0.82)", backdropFilter: "blur(4px)" }}
          >
            <div
              className="mx-4 flex w-full max-w-md flex-col items-center gap-5 rounded-2xl px-8 py-8 text-center"
              style={{ background: "rgba(0,16,42,0.97)", border: "1px solid rgba(43,194,226,0.25)" }}
            >
              <span className="text-5xl">🚪</span>
              <p className="text-xl font-bold text-white">
                Kamer {(session?.current_level ?? 1) + 1} is nog niet klaar
              </p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                De volgende kamer heeft nog geen vragen ingesteld.
                Vraag de leerkracht om dit te doen.
              </p>
              <Button
                onClick={() => setNoNextRoom(false)}
                className="mt-2 rounded-xl px-8 py-3 font-bold text-white"
                style={{ background: "#2bc2e2" }}
              >
                Begrepen
              </Button>
            </div>
          </div>
        )}
      </SessionBackground>
    )
  }

  return (
    <Suspense
      fallback={
        <SessionBackground>
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            <p className="text-lg font-bold text-white/60">Kamer laden…</p>
          </div>
        </SessionBackground>
      }
    >
      <SceneComponent
        answerState={answerState}
        roomPhase={roomPhase}
        focusTarget={focusTarget}
        activeObjects={OBJECT_ORDER.slice(0, levelQuestions.length)}
        completedObjects={completedObjects}
        onObjectClick={handleObjectClick}
        doorUnlocked={doorUnlocked}
        onDoorClick={handleDoorClick}
      >
        <style>{`
          @keyframes panel-fade-in {
            from { opacity: 0; transform: scale(0.97) translateY(16px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes mila-slide-up {
            from { opacity: 0; transform: translateY(160px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes celebration-pulse {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.35; }
          }
          @keyframes dot-bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-6px); }
          }
          @keyframes fade-to-black {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes fade-from-black {
            from { opacity: 1; }
            to   { opacity: 0; }
          }
          @keyframes drone-hover {
            0%, 100% { transform: translateY(0) rotate(-3deg); }
            50%      { transform: translateY(-14px) rotate(3deg); }
          }
          @keyframes drone-rotor {
            to { transform: rotate(360deg); }
          }
          .ezra-rotor {
            transform-box: fill-box;
            transform-origin: center;
            animation: drone-rotor 0.16s linear infinite;
          }
        `}</style>

        {/* Back button — always visible */}
        <div className="pointer-events-auto fixed top-6 left-6 z-10">
          <Button
            onClick={() => navigate(`/session/${id}`)}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm"
            style={{ background: "rgba(0,14,31,0.6)" }}
          >
            ← Terug
          </Button>
        </div>

        {/* Room badge */}
        {roomPhase === "exploring" && (
          <div className="pointer-events-none fixed top-6 left-1/2 z-10 -translate-x-1/2">
            <div
              className="rounded-full px-6 py-2 text-sm font-bold tracking-widest text-white uppercase backdrop-blur-sm"
              style={{ background: "rgba(0,14,31,0.7)", border: "1px solid rgba(43,194,226,0.3)" }}
            >
              Kamer {currentLevel} van {session?.level_count ?? 5}
            </div>
          </div>
        )}


        {/* Celebration overlay */}
        {answerState === "correct" && (
          <div
            className="pointer-events-none fixed inset-0 z-[3]"
            style={{
              background: "radial-gradient(ellipse at center, rgba(43,194,226,0.3) 0%, transparent 70%)",
              animation: "celebration-pulse 1.5s ease-in-out infinite",
            }}
          />
        )}

        {/* Question panel — speech bubble centered, Mila half-visible at bottom */}
        {roomPhase === "focused" && showPanel && (
          <div
            className="pointer-events-auto fixed inset-0 z-10 flex items-center justify-center"
            style={{ background: "rgba(0,10,28,0.65)", backdropFilter: "blur(4px)" }}
          >
            {/* Column: bubble + answers, shifted up so Mila doesn't overlap */}
            <div
              className="flex w-full flex-col items-center gap-5 px-6"
              style={{ maxWidth: "720px", marginBottom: "16vh" }}
            >
              {/* Speech bubble */}
              <div className="relative w-full" style={{ animation: "panel-fade-in 0.7s ease-out both" }}>
                {/* Tail pointing left toward Mila */}
                <div style={{
                  position: "absolute", left: -22, bottom: "12%",
                  width: 0, height: 0,
                  borderTop: "30px solid transparent",
                  borderBottom: "0px solid transparent",
                  borderRight: "28px solid #ffffff",
                }} />
                <div
                  className="rounded-3xl px-8 py-6"
                  style={{ background: "#ffffff", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" }}
                >
                  <p
                    className="font-bold text-center leading-snug"
                    style={{ color: "#001833", fontSize: "clamp(1.5rem, 2.8vw, 2.2rem)" }}
                  >
                    {question?.question_text ?? "Geen vraag gevonden."}
                  </p>
                </div>
              </div>

              {/* Feedback banners */}
              {answerState === "correct" && (
                <CorrectAnswerBanner
                  loadingExplanation={loadingExplanation}
                  explanation={explanation}
                />
              )}
              {answerState === "wrong" && (
                <WrongAnswerBanner onRetry={handleRetry} />
              )}

              {/* Multiple-choice answers */}
              {question?.question_type !== "open" && question && answerState !== "correct" && (
                <div className="w-full" style={{ animation: "panel-fade-in 0.6s ease-out 0.3s both" }}>
                  <AnswerGrid
                    question={question}
                    answerState={answerState}
                    selectedId={selectedId}
                    onAnswer={handleAnswer}
                  />
                </div>
              )}

              {/* Open answer */}
              {question?.question_type === "open" && answerState !== "correct" && (
                <div className="flex w-full flex-col gap-4" style={{ animation: "panel-fade-in 0.6s ease-out 0.3s both" }}>
                  <div className="flex w-full gap-3">
                    <input
                      type="text"
                      value={openInput}
                      onChange={(e) => setOpenInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleOpenAnswer() }}
                      disabled={evaluating || answerState !== "idle"}
                      placeholder="Typ het antwoord van de klas…"
                      className="flex-1 rounded-2xl border-2 bg-transparent px-6 font-bold text-white outline-none placeholder:text-white/30 disabled:opacity-50"
                      style={{
                        fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
                        minHeight: "70px",
                        borderColor: "rgba(43,194,226,0.4)",
                        background: "rgba(0,36,74,0.7)",
                        backdropFilter: "blur(4px)",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleOpenAnswer}
                      disabled={!openInput.trim() || evaluating || answerState !== "idle"}
                      className="rounded-2xl px-8 font-bold tracking-widest text-white uppercase transition-all disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        fontSize: "1.25rem", minHeight: "70px",
                        background: "#2bc2e2",
                        boxShadow: "0 0 32px rgba(43,194,226,0.5), 0 4px 16px rgba(0,0,0,0.4)",
                      }}
                    >
                      {evaluating ? "Bezig…" : "Controleer"}
                    </button>
                  </div>
                  {evaluating && (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: "#2bc2e2" }}>
                        De AI controleert het antwoord
                      </span>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: "#2bc2e2", animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Next button */}
              {answerState === "correct" && (() => {
                const activeObjs   = OBJECT_ORDER.slice(0, levelQuestions.length)
                const newCompleted = new Set([...completedObjects, focusTarget!])
                const allDone      = activeObjs.every(o => newCompleted.has(o))
                const label = allDone ? "Ga naar de deur →" : "Zoek de volgende aanwijzing →"
                return (
                  <Button
                    onClick={handleObjectComplete}
                    className="w-full rounded-2xl py-5 font-bold tracking-widest text-white uppercase"
                    style={{
                      fontSize: "1.2rem",
                      background: allDone ? "#2bc2e2" : "#7c3aed",
                      boxShadow: allDone
                        ? "0 0 32px rgba(43,194,226,0.6), 0 4px 16px rgba(0,0,0,0.4)"
                        : "0 0 32px rgba(124,58,237,0.6), 0 4px 16px rgba(0,0,0,0.4)",
                    }}
                  >
                    {label}
                  </Button>
                )
              })()}
            </div>

            {currentLevel === 2 ? (
              /* Alva — host of the art studio — slides up bottom-left */
              <div
                className="pointer-events-none select-none fixed"
                style={{
                  left: "1vw",
                  bottom: "-6vh",
                  height: "98vh",
                  width: "56vh",
                  zIndex: 20,
                  animation: "mila-slide-up 0.9s ease-out 0.2s both",
                }}
              >
                <img
                  src="/Alva.png"
                  alt="Alva"
                  className="h-full w-full"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/Mila.png" }}
                  style={{
                    objectFit: "contain",
                    objectPosition: "bottom left",
                    filter: "drop-shadow(0 0 32px rgba(214,91,177,0.25))",
                  }}
                />
              </div>
            ) : (
              /* Ezra — host of the workshop — slides up bottom-left with her
                 little companion drone hovering above her open hand */
              <div
                className="pointer-events-none select-none fixed"
                style={{
                  left: "1vw",
                  bottom: "-6vh",
                  height: "98vh",
                  width: "56vh",
                  zIndex: 20,
                  animation: "mila-slide-up 0.9s ease-out 0.2s both",
                }}
              >
                <img
                  src="/Ezra.png"
                  alt="Ezra"
                  className="h-full w-full"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/Mila.png" }}
                  style={{
                    objectFit: "contain",
                    objectPosition: "bottom left",
                    filter: "drop-shadow(0 0 32px rgba(43,194,226,0.25))",
                  }}
                />
                {/* Hovering drone */}
                <div
                  style={{
                    position: "absolute",
                    left: "65%",
                    top: "17%",
                    width: "14vh",
                    animation: "drone-hover 3.4s ease-in-out infinite",
                  }}
                >
                  <svg viewBox="0 0 120 80" style={{ width: "100%", height: "auto", overflow: "visible", filter: "drop-shadow(0 6px 6px rgba(0,0,0,0.25))" }}>
                    {/* arms */}
                    <g stroke="#5d3a26" strokeWidth={5} strokeLinecap="round">
                      <line x1={60} y1={46} x2={22} y2={22} />
                      <line x1={60} y1={46} x2={98} y2={22} />
                      <line x1={60} y1={46} x2={28} y2={62} />
                      <line x1={60} y1={46} x2={92} y2={62} />
                    </g>
                    {/* rotors */}
                    {([[22, 22], [98, 22], [28, 62], [92, 62]] as const).map(([cx, cy], i) => (
                      <g key={i}>
                        <ellipse cx={cx} cy={cy} rx={17} ry={5} fill="rgba(190,195,205,0.22)" />
                        <circle cx={cx} cy={cy} r={4.5} fill="#4a3326" />
                        <g className="ezra-rotor">
                          <ellipse cx={cx} cy={cy} rx={16} ry={2.4} fill="rgba(120,120,135,0.55)" />
                          <ellipse cx={cx} cy={cy} rx={2.4} ry={16} fill="rgba(120,120,135,0.55)" />
                        </g>
                      </g>
                    ))}
                    {/* body */}
                    <rect x={44} y={36} width={32} height={20} rx={9} fill="#7a4f33" />
                    <rect x={47} y={38} width={26} height={6} rx={3} fill="#9c6a3c" opacity={0.8} />
                    {/* camera gimbal under the nose */}
                    <circle cx={60} cy={58} r={7} fill="#3a2c3a" />
                    <circle cx={60} cy={58} r={3} fill="#8fe3ff" />
                    <circle cx={60} cy={58} r={1.2} fill="#ffffff" />
                    {/* status light */}
                    <circle cx={71} cy={41} r={2} fill="#00ff88" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Room-transition fade overlay ─────────────────────────────────── */}
        {fadeState === "out" && (
          <div
            className="pointer-events-none fixed inset-0 z-[60] bg-black"
            style={{ opacity: 0, animation: "fade-to-black 0.8s ease forwards" }}
            onAnimationEnd={handleFadeOutEnd}
          />
        )}
        {fadeState === "in" && (
          <div
            className="pointer-events-none fixed inset-0 z-[60] bg-black"
            style={{ opacity: 1, animation: "fade-from-black 0.9s ease 0.35s forwards" }}
            onAnimationEnd={handleFadeInEnd}
          />
        )}

        {/* ── "No next room" warning ───────────────────────────────────────── */}
        {noNextRoom && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,10,28,0.82)", backdropFilter: "blur(4px)" }}
          >
            <div
              className="mx-4 flex w-full max-w-md flex-col items-center gap-5 rounded-2xl px-8 py-8 text-center"
              style={{ background: "rgba(0,16,42,0.97)", border: "1px solid rgba(43,194,226,0.25)" }}
            >
              <span className="text-5xl">🚪</span>
              <p className="text-xl font-bold text-white">
                Kamer {(session?.current_level ?? 1) + 1} is nog niet klaar
              </p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                De volgende kamer heeft nog geen vragen ingesteld.
                Vraag de leerkracht om dit te doen.
              </p>
              <Button
                onClick={() => { setNoNextRoom(false); setRoomPhase("exploring") }}
                className="mt-2 rounded-xl px-8 py-3 font-bold text-white"
                style={{ background: "#2bc2e2" }}
              >
                Begrepen
              </Button>
            </div>
          </div>
        )}
      </SceneComponent>
    </Suspense>
  )
}

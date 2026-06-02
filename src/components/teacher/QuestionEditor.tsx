import { useEffect, useRef, useState } from "react"
import { generateId } from "@/lib/utils"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { ChevronDown, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { QuestionWithOptions } from "@/types"
import { ROOM_ICONS, getFloorDefaults } from "@/lib/floorConstants"
import IconPickerDialog from "@/components/teacher/IconPickerDialog"
import TintSwatchPicker from "@/components/teacher/TintSwatchPicker"

export interface DraftOption {
  id: string
  text: string
  isCorrect: boolean
}

interface Props {
  level: number
  question: QuestionWithOptions | undefined
  busy: boolean
  onSave: (data: {
    questionText: string
    questionType: string
    roomName: string | null
    roomTheme: string | null
    roomIcon: string | null
    roomTint: string | null
    options: DraftOption[]
  }) => Promise<void> | void
  onDelete?: () => void
  onDirtyChange?: (dirty: boolean) => void
  initialSaveStatus?: "idle" | "saved"
  onInitialSaveStatusConsumed?: () => void
}

export default function QuestionEditor({
  level,
  question,
  busy,
  onSave,
  onDelete,
  onDirtyChange,
  initialSaveStatus = "idle",
  onInitialSaveStatusConsumed,
}: Props) {
  const d = getFloorDefaults(level)

  // Question state
  const [questionText, setQuestionText] = useState(question?.question_text ?? "")
  const [questionType, setQuestionType] = useState<"multiple_choice" | "open">(
    question?.question_type === "open" ? "open" : "multiple_choice"
  )
  const [options, setOptions] = useState<DraftOption[]>(() => {
    if (question?.answer_options.length) {
      return question.answer_options.map((o) => ({
        id: generateId(),
        text: o.option_text,
        isCorrect: o.is_correct,
      }))
    }
    return [
      { id: generateId(), text: "", isCorrect: false },
      { id: generateId(), text: "", isCorrect: false },
    ]
  })
  const [openAnswer, setOpenAnswer] = useState(() => {
    if (question?.question_type === "open") {
      return question.answer_options.find((o) => o.is_correct)?.option_text ?? ""
    }
    return ""
  })

  // Room config state
  const [roomName, setRoomName] = useState(question?.room_name ?? "")
  const [roomTheme, setRoomTheme] = useState(question?.room_theme ?? "")
  const [roomIcon, setRoomIcon] = useState<string | null>(question?.room_icon ?? null)
  const [roomTint, setRoomTint] = useState<string | null>(question?.room_tint ?? null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  // UI state
  const [errors, setErrors] = useState<{
    question?: string
    options?: string
    correct?: string
    openAnswer?: string
  }>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmTypeChange, setConfirmTypeChange] = useState<
    "multiple_choice" | "open" | null
  >(null)

  const savedType: "multiple_choice" | "open" =
    question?.question_type === "open" ? "open" : "multiple_choice"
  const typeChanged = !!question && questionType !== savedType

  // Track dirty state
  const isDirty = (() => {
    if (!question) return questionText.trim() !== "" || options.some((o) => o.text.trim() !== "") || openAnswer.trim() !== ""
    if (questionText !== question.question_text) return true
    if (questionType !== savedType) return true
    if (roomName !== (question.room_name ?? "")) return true
    if (roomTheme !== (question.room_theme ?? "")) return true
    if (roomIcon !== (question.room_icon ?? null)) return true
    if (roomTint !== (question.room_tint ?? null)) return true
    if (questionType === "open") {
      const savedAnswer = question.answer_options.find((o) => o.is_correct)?.option_text ?? ""
      if (openAnswer !== savedAnswer) return true
    } else {
      const savedOpts = [...question.answer_options].sort((a, b) => a.option_text.localeCompare(b.option_text))
      const localOpts = [...options].sort((a, b) => a.text.localeCompare(b.text))
      if (localOpts.length !== savedOpts.length) return true
      if (localOpts.some((o, i) => o.text !== savedOpts[i].option_text || o.isCorrect !== savedOpts[i].is_correct)) return true
    }
    return false
  })()

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // ── Autosave ────────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    initialSaveStatus === "saved" ? "saved" : "idle"
  )
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSubmitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Notify parent that we've consumed the initial "saved" status
  useEffect(() => {
    if (initialSaveStatus === "saved") onInitialSaveStatusConsumed?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave for existing questions — deps exclude `question` to avoid re-running on parent re-renders
  useEffect(() => {
    if (!question || !isDirty) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      const errs: Record<string, string> = {}
      if (!questionText.trim()) errs.question = "Vul de vraag in."
      if (questionType === "open") {
        if (!openAnswer.trim()) errs.openAnswer = "Vul het referentie-antwoord in."
      } else {
        if (options.some((o) => !o.text.trim())) errs.options = "Alle velden moeten ingevuld zijn."
        if (options.filter((o) => o.isCorrect).length !== 1) errs.correct = "Markeer precies 1 correct antwoord."
      }
      if (Object.keys(errs).length > 0) return
      setSaveStatus("saving")
      setIsAutoSaving(true)
      const resolvedOptions: DraftOption[] =
        questionType === "open"
          ? [{ id: generateId(), text: openAnswer.trim(), isCorrect: true }]
          : options
      try {
        await onSave({
          questionText,
          questionType,
          roomName: roomName.trim() || null,
          roomTheme: roomTheme.trim() || null,
          roomIcon,
          roomTint,
          options: resolvedOptions,
        })
        setSaveStatus("saved")
      } catch {
        setSaveStatus("idle")
      } finally {
        setIsAutoSaving(false)
      }
    }, 1500)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, questionText, questionType, roomName, roomTheme, roomIcon, roomTint, options, openAnswer])

  // Auto-submit for new questions
  useEffect(() => {
    if (question) return
    if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current)
    const isValid =
      questionText.trim() !== "" &&
      (questionType === "open"
        ? openAnswer.trim() !== ""
        : options.every((o) => o.text.trim() !== "") && options.filter((o) => o.isCorrect).length === 1)
    if (!isValid) return
    autoSubmitTimer.current = setTimeout(async () => {
      setSaveStatus("saving")
      setIsAutoSaving(true)
      const resolvedOptions: DraftOption[] =
        questionType === "open"
          ? [{ id: generateId(), text: openAnswer.trim(), isCorrect: true }]
          : options
      try {
        await onSave({
          questionText,
          questionType,
          roomName: roomName.trim() || null,
          roomTheme: roomTheme.trim() || null,
          roomIcon,
          roomTint,
          options: resolvedOptions,
        })
        setSaveStatus("saved")
      } catch {
        setSaveStatus("idle")
      } finally {
        setIsAutoSaving(false)
      }
    }, 1500)
    return () => {
      if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionText, questionType, roomName, roomTheme, roomIcon, roomTint, options, openAnswer])

  const displayTint = roomTint ?? d.tint
  const displayName = roomName || d.name

  const currentIconEntry = roomIcon ? ROOM_ICONS.find((i) => i.name === roomIcon) : null
  const CurrentIconComp = roomIcon
    ? (Icons as unknown as Record<string, LucideIcon>)[roomIcon]
    : null

  // ── Handlers ──────────────────────────────────────────────────────────────

  function markCorrect(id: string) {
    setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: o.id === id })))
  }

  function updateOptionText(id: string, text: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)))
  }

  function addOption() {
    if (options.length >= 4) return
    setOptions((prev) => [
      ...prev,
      { id: generateId(), text: "", isCorrect: false },
    ])
  }

  function removeOption(id: string) {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((o) => o.id !== id))
  }

  function validate() {
    const errs: typeof errors = {}
    if (!questionText.trim()) errs.question = "Vul de vraag in."
    if (questionType === "open") {
      if (!openAnswer.trim()) errs.openAnswer = "Vul het referentie-antwoord in."
    } else {
      if (options.some((o) => !o.text.trim()))
        errs.options = "Alle antwoordvelden moeten ingevuld zijn."
      if (options.filter((o) => o.isCorrect).length !== 1)
        errs.correct = "Markeer precies 1 correct antwoord."
    }
    return errs
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})

    const roomNameVal = roomName.trim() || null
    const roomThemeVal = roomTheme.trim() || null
    const resolvedOptions: DraftOption[] =
      questionType === "open"
        ? [{ id: generateId(), text: openAnswer.trim(), isCorrect: true }]
        : options

    onSave({
      questionText,
      questionType,
      roomName: roomNameVal,
      roomTheme: roomThemeVal,
      roomIcon,
      roomTint,
      options: resolvedOptions,
    })
    onDirtyChange?.(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 text-xs font-medium"
            style={{ color: displayTint }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: displayTint }} />
            Kamer 0{level} · {displayName}
          </div>
          {/* Autosave indicator */}
          {isDirty && saveStatus !== "saving" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
              Niet opgeslagen
            </span>
          )}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Loader2 className="h-3 w-3 animate-spin" />
              Opslaan…
            </span>
          )}
          {saveStatus === "saved" && !isDirty && (
            <span className="flex items-center gap-1 text-xs text-green-500/80">
              <Check className="h-3 w-3" />
              Opgeslagen
            </span>
          )}
        </div>

        {question && (
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <>
                <span className="text-sm text-muted-foreground">Zeker?</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy && !isAutoSaving}
                  onClick={onDelete}
                >
                  Verwijder
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Annuleer
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy && !isAutoSaving}
                onClick={() => setConfirmDelete(true)}
                className="border border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"
              >
                Verwijderen
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Room settings */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
          Kamer instellingen
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-muted-foreground">Naam</label>
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={d.name}
              disabled={busy && !isAutoSaving}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-muted-foreground">Thema / Vak</label>
            <Input
              value={roomTheme}
              onChange={(e) => setRoomTheme(e.target.value)}
              placeholder={d.theme || "bv. Biologie"}
              disabled={busy && !isAutoSaving}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex items-end gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-muted-foreground">Kleur</label>
            <TintSwatchPicker value={roomTint} onChange={setRoomTint} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-muted-foreground">Icoon</label>
            <button
              type="button"
              disabled={busy && !isAutoSaving}
              onClick={() => setIconPickerOpen(true)}
              className="flex h-8 items-center gap-2 rounded-lg border border-border px-3 text-sm transition-colors hover:border-foreground/40 disabled:opacity-50"
            >
              {CurrentIconComp ? (
                <>
                  <CurrentIconComp size={14} className="shrink-0 text-muted-foreground" />
                  <span className="text-foreground">
                    {currentIconEntry?.label ?? roomIcon}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Kies icoon…</span>
              )}
              <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground" />
            </button>
          </div>
          {roomIcon && (
            <button
              type="button"
              onClick={() => setRoomIcon(null)}
              className="mb-0.5 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              Wissen
            </button>
          )}
        </div>
      </div>

      <IconPickerDialog
        open={iconPickerOpen}
        value={roomIcon}
        onSelect={setRoomIcon}
        onClose={() => setIconPickerOpen(false)}
      />

      {/* Question type toggle */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Vraagtype
        </label>
        {confirmTypeChange ? (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
            <span className="flex-1 text-sm text-amber-400">
              Wisselen naar{" "}
              <b>
                {confirmTypeChange === "open"
                  ? "Open antwoord"
                  : "Meerkeuze"}
              </b>{" "}
              wist de huidige antwoorden. Doorgaan?
            </span>
            <button
              type="button"
              onClick={() => {
                setQuestionType(confirmTypeChange)
                setConfirmTypeChange(null)
              }}
              className="rounded-md border border-amber-500/50 px-2.5 py-1 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              Ja, wissel
            </button>
            <button
              type="button"
              onClick={() => setConfirmTypeChange(null)}
              className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Annuleer
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                questionType !== "multiple_choice" &&
                setConfirmTypeChange("multiple_choice")
              }
              disabled={busy && !isAutoSaving}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                questionType === "multiple_choice"
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              Meerkeuze
            </button>
            <button
              type="button"
              onClick={() => questionType !== "open" && setConfirmTypeChange("open")}
              disabled={busy && !isAutoSaving}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                questionType === "open"
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              Open antwoord
            </button>
          </div>
        )}
        {typeChanged && !confirmTypeChange && (
          <p className="text-xs text-amber-400">
            Vraagtype gewijzigd — klik op "{question ? "Bijwerken" : "Toevoegen"}" om op te
            slaan.
          </p>
        )}
      </div>

      {/* Question text */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Vraag
        </label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Typ hier de vraag…"
          rows={3}
          disabled={busy && !isAutoSaving}
          className="resize-none rounded-xl border border-border bg-background px-4 py-3 text-base leading-relaxed text-foreground transition-colors outline-none placeholder:text-muted-foreground/50 focus:border-accent focus:ring-2 focus:ring-accent/10 disabled:opacity-50"
        />
        {errors.question && (
          <p className="text-sm text-destructive">{errors.question}</p>
        )}
      </div>

      {/* Open answer — reference for AI grading */}
      {questionType === "open" && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Correct antwoord{" "}
            <span className="font-sans font-normal tracking-normal text-muted-foreground/60 normal-case">
              — Gemini vergelijkt de ingetypte reactie hiertegen
            </span>
          </label>
          <Input
            value={openAnswer}
            onChange={(e) => setOpenAnswer(e.target.value)}
            placeholder="Typ het verwachte antwoord…"
            disabled={busy && !isAutoSaving}
          />
          {errors.openAnswer && (
            <p className="text-sm text-destructive">{errors.openAnswer}</p>
          )}
        </div>
      )}

      {/* Multiple choice answers */}
      {questionType === "multiple_choice" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Antwoorden{" "}
              <span className="font-sans font-normal tracking-normal text-muted-foreground/60 normal-case">
                — klik op de cirkel om het juiste te markeren
              </span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addOption}
              disabled={options.length >= 4 || busy}
              className="h-auto p-0 text-xs font-semibold text-accent hover:bg-transparent hover:text-accent/80 disabled:opacity-40"
            >
              + Antwoord toevoegen
            </Button>
          </div>

          {options.map((opt, idx) => (
            <div
              key={opt.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                opt.isCorrect
                  ? "border-accent/30 bg-accent/5"
                  : "border-border bg-background"
              }`}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => markCorrect(opt.id)}
                disabled={busy && !isAutoSaving}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 p-0 transition-colors hover:bg-transparent ${
                  opt.isCorrect ? "border-accent" : "border-muted-foreground/40"
                }`}
              >
                {opt.isCorrect && (
                  <span className="block h-2.5 w-2.5 rounded-full bg-accent" />
                )}
              </Button>
              <span className="w-4 text-xs font-semibold text-accent">
                {["A", "B", "C", "D"][idx]}
              </span>
              <Input
                value={opt.text}
                onChange={(e) => updateOptionText(opt.id, e.target.value)}
                placeholder={`Antwoord ${idx + 1}`}
                disabled={busy && !isAutoSaving}
                className="h-auto flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeOption(opt.id)}
                disabled={options.length <= 2 || busy}
                className="text-muted-foreground hover:bg-transparent hover:text-destructive disabled:opacity-20"
              >
                ✕
              </Button>
            </div>
          ))}

          {errors.options && (
            <p className="text-sm text-destructive">{errors.options}</p>
          )}
          {errors.correct && (
            <p className="text-sm text-destructive">{errors.correct}</p>
          )}
        </div>
      )}

      {/* Save */}
      <div className="mt-auto flex gap-3 border-t border-border pt-4">
        <Button
          type="submit"
          disabled={busy && !isAutoSaving}
          className="bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
        >
          {busy ? "Opslaan…" : question ? "Bijwerken" : "Toevoegen"}
        </Button>
      </div>
    </form>
  )
}

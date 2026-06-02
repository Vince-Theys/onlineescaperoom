import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSession } from "../../services/sessionService"
import type { Session } from "../../types"
import { usePageTitle } from "@/hooks/use-page-title"
import CreateSessionSuccess from "@/components/teacher/CreateSessionSuccess"
import { Minus, Plus } from "lucide-react"

type FormState = "idle" | "loading" | "success"

export default function CreateSessionPage() {
  usePageTitle("Nieuwe sessie")
  const [name, setName] = useState("")
  const [levelCount, setLevelCount] = useState(5)
  const [fieldError, setFieldError] = useState("")
  const [apiError, setApiError] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")
  const [session, setSession] = useState<Session | null>(null)
  const [copied, setCopied] = useState(false)

  const sessionUrl = session
    ? `${window.location.origin}/session/${session.id}`
    : ""

  function validate(value: string): string {
    if (!value.trim()) return "Geef de sessie een naam."
    if (value.trim().length < 2) return "Naam moet minstens 2 tekens lang zijn."
    if (value.trim().length > 60) return "Naam mag maximaal 60 tekens bevatten."
    return ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate(name)
    if (validationError) {
      setFieldError(validationError)
      return
    }
    setFormState("loading")
    setApiError("")
    try {
      const created = await createSession(name.trim(), levelCount)
      setSession(created)
      setFormState("success")
    } catch {
      setFormState("idle")
      setApiError("Er is iets misgegaan. Probeer opnieuw.")
    }
  }

  function handleReset() {
    setName("")
    setFieldError("")
    setApiError("")
    setSession(null)
    setFormState("idle")
    setCopied(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(sessionUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (formState === "success" && session) {
    return (
      <CreateSessionSuccess
        session={session}
        sessionUrl={sessionUrl}
        copied={copied}
        onCopy={handleCopy}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-foreground">
          Nieuwe sessie
        </h1>
        <p className="text-sm text-muted-foreground">
          Maak een sessie aan voor je klas.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="session-name" className="text-sm text-foreground">
            Naam van de klas of sessie
          </label>
          <Input
            id="session-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (fieldError) setFieldError(validate(e.target.value))
            }}
            placeholder="bv. Klas 5A — les 1"
            aria-invalid={!!fieldError}
          />
          {fieldError && (
            <p className="text-sm text-destructive">{fieldError}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-foreground">Aantal verdiepingen</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLevelCount((c) => Math.max(1, c - 1))}
              disabled={levelCount <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-base font-bold text-foreground">
              {levelCount}
            </span>
            <button
              type="button"
              onClick={() => setLevelCount((c) => Math.min(10, c + 1))}
              disabled={levelCount >= 10}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Standaard 5. Altijd aanpasbaar achteraf.
          </p>
        </div>

        {apiError && <p className="text-sm text-destructive">{apiError}</p>}

        <Button
          type="submit"
          variant="default"
          disabled={formState === "loading"}
        >
          {formState === "loading" ? "Bezig..." : "Aanmaken"}
        </Button>
      </form>

      <Link
        to="/dashboard/sessions"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Terug naar overzicht
      </Link>
    </div>
  )
}

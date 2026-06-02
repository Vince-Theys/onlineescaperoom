import { useState } from "react"
import { Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordStrengthBar } from "@/components/password-strength-bar"
import { supabase } from "@/utils/supabase"

export default function AccountPasswordForm() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mismatch = confirm.length > 0 && next !== confirm
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)

    // Verify current password by re-authenticating
    const { data: userData } = await supabase.auth.getUser()
    const email = userData.user?.email ?? ""
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    })
    if (authError) {
      setError("Huidig wachtwoord is onjuist.")
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: next,
    })
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }

    // Reset form on success
    setCurrent("")
    setNext("")
    setConfirm("")
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold text-foreground">
        Wachtwoord wijzigen
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="current-pw">
            Huidig wachtwoord
          </label>
          <div className="relative">
            <Input
              id="current-pw"
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
              className="pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="new-pw">
            Nieuw wachtwoord
          </label>
          <div className="relative">
            <Input
              id="new-pw"
              type={showNext ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="••••••••"
              className="pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNext((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrengthBar password={next} />
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="confirm-pw">
            Bevestig nieuw wachtwoord
          </label>
          <div className="relative">
            <Input
              id="confirm-pw"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={`pr-10 ${mismatch ? "border-destructive focus-visible:ring-destructive" : ""}`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mismatch && (
            <p className="text-xs text-destructive">Wachtwoorden komen niet overeen.</p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saving ? "Opslaan…" : saved ? "Opgeslagen!" : "Wachtwoord wijzigen"}
          </Button>
        </div>
      </form>
    </div>
  )
}

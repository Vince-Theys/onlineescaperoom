import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import { usePageTitle } from '@/hooks/use-page-title'
import { Button } from '@/components/ui/button'
import { PasswordStrengthBar } from '@/components/password-strength-bar'
import { Loader2, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHashError(): string | null {
  const hash = window.location.hash.slice(1)
  const params = new URLSearchParams(hash)
  const err = params.get('error_description') ?? params.get('error')
  return err ? decodeURIComponent(err.replace(/\+/g, ' ')) : null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Stage = 'loading' | 'form' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  usePageTitle('Nieuw wachtwoord instellen')
  const navigate = useNavigate()

  const [stage, setStage] = useState<Stage>(() => (parseHashError() ? 'invalid' : 'loading'))
  const [error, setError] = useState(() => parseHashError() ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  // Supabase JS automatically processes the #access_token=...&type=recovery hash
  // and fires PASSWORD_RECOVERY — distinct from SIGNED_IN (used by invite flow).
  useEffect(() => {
    if (stage === 'invalid') return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setEmail(session.user.email ?? '')
          setStage('form')
        }
      },
    )

    // Fast-client fallback: token already processed before listener attached
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setEmail(data.session.user.email ?? '')
        setStage('form')
      }
    })

    // Timeout: link missing, already used, or expired
    const timer = setTimeout(() => {
      setStage((s) => (s === 'loading' ? 'invalid' : s))
    }, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens lang zijn.')
      return
    }
    if (password !== confirm) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    setBusy(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setBusy(false)
      return
    }
    setStage('done')
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#001a33] px-4 py-12">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#003469_0%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img
            src="/escaperoom-logo.png"
            alt="TWA Escape Room"
            className="h-28 drop-shadow-[0_0_24px_rgba(43,194,226,0.4)]"
          />
        </div>

        <h1 className="mb-1 text-center text-3xl font-bold tracking-wide text-white">
          Escape room
        </h1>
        <p className="mb-8 text-center text-sm font-medium tracking-widest text-[#2bc2e2] uppercase">
          Docentenportaal
        </p>

        {/* ── Loading ── */}
        {stage === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#2bc2e2]" />
            <p className="text-sm text-white/50">Link valideren…</p>
          </div>
        )}

        {/* ── Invalid / expired ── */}
        {stage === 'invalid' && (
          <div className="rounded-xl border border-[#e91852]/30 bg-[#e91852]/10 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[#e91852]" />
            <h2 className="mb-2 text-base font-semibold text-white">
              Ongeldige resetlink
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-white/60">
              {error || 'Deze link is verlopen of al gebruikt. Vraag een nieuwe resetlink aan.'}
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-[#2bc2e2] hover:underline"
              >
                Opnieuw aanvragen →
              </Link>
              <Link
                to="/login"
                className="text-xs text-white/40 hover:text-[#2bc2e2] transition-colors"
              >
                Terug naar inloggen
              </Link>
            </div>
          </div>
        )}

        {/* ── Password form ── */}
        {stage === 'form' && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-6 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2bc2e2]/15">
                <KeyRound className="h-4 w-4 text-[#2bc2e2]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Nieuw wachtwoord instellen
                </h2>
                {email && (
                  <p className="mt-0.5 text-xs text-white/40">
                    Account: <span className="text-white/60">{email}</span>
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-white/60" htmlFor="pw">
                  Nieuw wachtwoord
                </label>
                <div className="relative">
                  <input
                    id="pw"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    placeholder="Minimaal 8 tekens"
                    autoFocus
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white outline-none placeholder:text-white/30 transition focus:border-[#2bc2e2] focus:ring-1 focus:ring-[#2bc2e2]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthBar password={password} />
              </div>

              {/* Confirm */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-white/60" htmlFor="confirm">
                  Bevestig wachtwoord
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError('') }}
                    placeholder="Herhaal je wachtwoord"
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white outline-none placeholder:text-white/30 transition focus:border-[#2bc2e2] focus:ring-1 focus:ring-[#2bc2e2]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirm && password && (
                  <p className={`text-xs font-medium ${password === confirm ? 'text-[#22c55e]' : 'text-[#e91852]'}`}>
                    {password === confirm ? '✓ Wachtwoorden komen overeen' : '✗ Wachtwoorden komen niet overeen'}
                  </p>
                )}
              </div>

              {error && (
                <p className="rounded-lg bg-[#e91852]/15 px-3 py-2 text-sm text-[#e91852]">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="mt-1 w-full rounded-lg bg-[#2bc2e2] py-3 text-sm font-bold tracking-widest text-[#001a33] uppercase transition hover:bg-[#13a7db] disabled:opacity-60"
              >
                {busy
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opslaan…</>
                  : 'Wachtwoord opslaan'}
              </Button>
            </form>
          </div>
        )}

        {/* ── Done ── */}
        {stage === 'done' && (
          <div className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-[#22c55e]" />
            <h2 className="mb-2 text-base font-semibold text-white">
              Wachtwoord bijgewerkt!
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-white/60">
              Je wachtwoord is bijgewerkt. Je wordt automatisch doorgestuurd…
            </p>
            <Link
              to="/dashboard"
              className="text-sm font-medium text-[#2bc2e2] hover:underline"
            >
              Ga naar het dashboard
            </Link>
          </div>
        )}
      </div>

      {/* UCLL / TWA footer */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <img
          src="/TWA-logo.png"
          alt="UCLL Hogeschool — TWA"
          className="h-20 w-auto opacity-60"
        />
      </div>
    </div>
  )
}

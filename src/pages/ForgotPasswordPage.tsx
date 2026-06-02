import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import { usePageTitle } from '@/hooks/use-page-title'
import { Button } from '@/components/ui/button'
import { Loader2, Mail } from 'lucide-react'

type Stage = 'form' | 'sent'

export default function ForgotPasswordPage() {
  usePageTitle('Wachtwoord vergeten')
  const [stage, setStage] = useState<Stage>('form')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Geef een geldig e-mailadres in.')
      return
    }
    setBusy(true)
    setError('')
    const { error: apiError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (apiError) {
      setError(apiError.message)
      setBusy(false)
      return
    }
    // Always show confirmation — never reveal whether the email exists
    setStage('sent')
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

        {/* ── Email form ── */}
        {stage === 'form' && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-5 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2bc2e2]/15">
                <Mail className="h-4 w-4 text-[#2bc2e2]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Wachtwoord vergeten?</h2>
                <p className="mt-0.5 text-xs text-white/40">
                  We sturen je een link om een nieuw wachtwoord in te stellen.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="naam@school.be"
                autoFocus
                required
                disabled={busy}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 transition focus:border-[#2bc2e2] focus:ring-1 focus:ring-[#2bc2e2] disabled:opacity-50"
              />

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
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Versturen…</>
                  : 'Resetlink versturen'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="text-xs text-white/40 transition-colors hover:text-[#2bc2e2]"
              >
                ← Terug naar inloggen
              </Link>
            </div>
          </div>
        )}

        {/* ── Confirmation ── */}
        {stage === 'sent' && (
          <div className="rounded-xl border border-[#2bc2e2]/20 bg-[#2bc2e2]/5 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2bc2e2]/15">
              <Mail className="h-6 w-6 text-[#2bc2e2]" />
            </div>
            <h2 className="mb-2 text-base font-semibold text-white">
              Controleer je e-mail
            </h2>
            <p className="mb-1 text-sm leading-relaxed text-white/60">
              Als <span className="text-white/80">{email}</span> bij ons bekend is, ontvang je
              een e-mail met een resetlink.
            </p>
            <p className="mb-5 text-xs text-white/40">
              De link is 1 uur geldig. Controleer ook je spammap.
            </p>
            <Link
              to="/login"
              className="text-sm font-medium text-[#2bc2e2] hover:underline"
            >
              ← Terug naar inloggen
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

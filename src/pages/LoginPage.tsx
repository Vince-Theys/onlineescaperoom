import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/utils/supabase"
import { usePageTitle } from "@/hooks/use-page-title"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  usePageTitle("Inloggen")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setError(error.message)
    } else {
      navigate("/dashboard")
    }
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#001a33] px-4 py-12">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#003469_0%,transparent_70%)]" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Escape room Avatar badge */}
        <div className="mb-6 flex justify-center">
          <img
            src="/escaperoom-logo.png"
            alt="Escape room Logo"
            className="h-28 drop-shadow-[0_0_24px_rgba(43,194,226,0.4)]"
          />
        </div>

        <h1 className="mb-1 text-center text-3xl font-bold tracking-wide text-white">
          Escape room
        </h1>
        <p className="mb-8 text-center text-sm font-medium tracking-widest text-[#2bc2e2] uppercase">
          Docentenportaal
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition outline-none placeholder:text-white/40 focus:border-[#2bc2e2] focus:ring-1 focus:ring-[#2bc2e2]"
          />
          <input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition outline-none placeholder:text-white/40 focus:border-[#2bc2e2] focus:ring-1 focus:ring-[#2bc2e2]"
          />
          {error && (
            <p className="rounded-lg bg-[#e91852]/15 px-3 py-2 text-sm text-[#e91852]">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-lg bg-[#2bc2e2] py-3 text-sm font-bold tracking-widest text-[#001a33] uppercase transition hover:bg-[#13a7db] disabled:opacity-60"
          >
            {loading ? "Bezig..." : "Inloggen"}
          </Button>
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-xs text-white/40 transition-colors hover:text-[#2bc2e2]"
            >
              Wachtwoord vergeten?
            </Link>
          </div>
        </form>
      </div>

      {/* UCLL / TWA footer banner */}
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

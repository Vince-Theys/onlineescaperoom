import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  getSession,
  resetSession,
  updateSession,
} from "@/services/sessionService"
import type { Session } from "@/types"
import FlyingSpaceship from "@/components/FlyingSpaceship"
import OrbitalDisplay from "@/components/session/OrbitalDisplay"
import EscapeControls from "@/components/session/EscapeControls"

export default function EscapeScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!id) return
    getSession(id)
      .then((s) => {
        if (!s) {
          setError("Sessie niet gevonden.")
          return
        }
        setSession(s)
      })
      .catch(() => setError("Kon de sessie niet laden."))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200)
    return () => clearTimeout(t)
  }, [])

  async function handleReset() {
    if (!id) return
    setBusy(true)
    try {
      await resetSession(id)
      navigate(`/session/${id}/play`)
    } catch {
      setError("Kon de sessie niet resetten.")
      setBusy(false)
    }
  }

  async function handleEnd() {
    if (!id) return
    setBusy(true)
    try {
      await updateSession(id, { status: "completed" })
      navigate("/dashboard/sessions")
    } catch {
      setError("Kon de sessie niet beëindigen.")
      setBusy(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, #00234a 0%, #001833 60%, #000e1f 100%)",
      }}
    >
      <style>{`
        @keyframes title-pop {
          0%   { transform: scale(0.4) translateY(40px); opacity: 0; filter: blur(8px); }
          55%  { transform: scale(1.08) translateY(0);   opacity: 1; filter: blur(0); }
          100% { transform: scale(1) translateY(0);      opacity: 1; }
        }
        @keyframes title-glow {
          0%, 100% { text-shadow: 0 0 32px rgba(43,194,226,0.9), 0 0 80px rgba(43,194,226,0.5); }
          50%      { text-shadow: 0 0 56px rgba(43,194,226,1),   0 0 140px rgba(43,194,226,0.8); }
        }
        @keyframes float-up {
          0%   { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        @keyframes orbit-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes aurora {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%      { opacity: 0.5;  transform: scale(1.1); }
        }
        @keyframes drift-bg {
          0%   { transform: translate(0, 0); }
          100% { transform: translate(48px, 48px); }
        }
      `}</style>

      {/* Animated grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(43,194,226,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(43,194,226,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "drift-bg 18s linear infinite",
        }}
      />

      {/* Aurora glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(43,194,226,0.35) 0%, transparent 45%), radial-gradient(circle at 70% 70%, rgba(19,167,219,0.3) 0%, transparent 45%)",
          animation: "aurora 4s ease-in-out infinite",
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 right-0 left-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, transparent, #2bc2e2, transparent)",
        }}
      />

      <FlyingSpaceship launchDelay={1200} />

      <div
        className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-8 py-10"
        style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
      >
        {/* TWA logo */}
        <img
          src="/TWA-logo.png"
          alt="TWA"
          draggable={false}
          className="h-16 w-auto"
          style={{
            opacity: revealed ? 0.95 : 0,
            transition: "opacity 0.8s ease 0.2s",
            filter: "drop-shadow(0 0 16px rgba(43,194,226,0.6))",
          }}
        />

        {/* Title area */}
        <div className="relative flex flex-col items-center gap-4 text-center">
          <OrbitalDisplay revealed={revealed} />

          <h1
            className="relative z-10 font-bold uppercase"
            style={{
              fontSize: "clamp(3rem, 9vw, 7rem)",
              color: "#ffffff",
              letterSpacing: "0.05em",
              animation: revealed
                ? "title-pop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, title-glow 2.4s ease-in-out 0.9s infinite"
                : "none",
              opacity: revealed ? 1 : 0,
              textShadow:
                "0 0 32px rgba(43,194,226,0.9), 0 0 80px rgba(43,194,226,0.5)",
            }}
          >
            Jullie zijn ontsnapt!
          </h1>

          <p
            className="relative z-10 font-bold tracking-[0.3em] uppercase"
            style={{
              fontSize: "clamp(1rem, 2vw, 1.4rem)",
              color: "rgba(43,194,226,0.85)",
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.8s ease 1.2s",
            }}
          >
            {session?.team_name
              ? `Goed gedaan, ${session.team_name}!`
              : "Goed gedaan!"}
          </p>
        </div>

        <EscapeControls
          revealed={revealed}
          busy={busy}
          loading={loading}
          error={error}
          onReset={handleReset}
          onEnd={handleEnd}
        />
      </div>

      {/* Mascot reserved zone */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-37.5 w-37.5"
        aria-hidden="true"
      />
    </div>
  )
}

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getSession, startSession } from "@/services/sessionService"
import type { Session } from "@/types"
import { usePageTitle } from "@/hooks/use-page-title"
import SessionBackground from "@/components/session/SessionBackground"
import SessionNamePanel from "@/components/session/SessionNamePanel"
import StartScreenCta from "@/components/session/StartScreenCta"

export default function StartScreen() {
  usePageTitle("Escape Room")
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [started, setStarted] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getSession(id)
      .then((s) => {
        setSession(s)
        if (s?.started_at) setStarted(true)
      })
      .catch(() => setLoadError("Sessie niet gevonden."))
      .finally(() => setLoading(false))
  }, [id])

  async function handleStart() {
    if (!id) return
    setStarting(true)
    setStartError(null)
    try {
      await startSession(id)
    } catch {
      // update may succeed even if SELECT afterwards fails (RLS)
    }
    try {
      const updated = await getSession(id)
      if (updated?.started_at) {
        setSession(updated)
        setStarted(true)
      } else {
        setStartError("Kon de sessie niet starten. Probeer opnieuw.")
      }
    } catch {
      setStartError("Kon de sessie niet starten. Probeer opnieuw.")
    } finally {
      setStarting(false)
    }
  }

  return (
    <SessionBackground>
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center">
        {/* TWA logo */}
        <img
          src="/TWA-logo.png"
          alt="TWA"
          className="h-16 w-auto opacity-90"
          draggable={false}
        />

        {/* Divider */}
        <div className="flex w-full max-w-md items-center gap-4">
          <div
            className="h-px flex-1"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(43,194,226,0.4))",
            }}
          />
          <span
            className="text-xs tracking-[0.3em] uppercase"
            style={{ color: "rgba(43,194,226,0.6)" }}
          >
            Welkom bij de
          </span>
          <div
            className="h-px flex-1"
            style={{
              background:
                "linear-gradient(90deg, rgba(43,194,226,0.4), transparent)",
            }}
          />
        </div>

        {/* Escape room logo */}
        <img
          src="/escaperoom-logo.png"
          alt="Escaperoom"
          className="h-40 w-auto drop-shadow-2xl"
          draggable={false}
        />

        <SessionNamePanel
          loading={loading}
          loadError={loadError}
          session={session}
        />

        {id && (
          <StartScreenCta
            started={started}
            loading={loading}
            loadError={loadError}
            starting={starting}
            startError={startError}
            sessionId={id}
            onStart={handleStart}
          />
        )}
      </div>

      {/* Bottom decorative line */}
      <div
        className="absolute right-0 bottom-0 left-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(43,194,226,0.3), transparent)",
        }}
      />

      {/* Mascot reserved zone */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-37.5 w-37.5"
        aria-hidden="true"
      />
    </SessionBackground>
  )
}

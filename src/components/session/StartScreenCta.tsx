import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

interface Props {
  started: boolean
  loading: boolean
  loadError: string | null
  starting: boolean
  startError: string | null
  sessionId: string
  onStart: () => void
}

export default function StartScreenCta({
  started,
  loading,
  loadError,
  starting,
  startError,
  sessionId,
  onStart,
}: Props) {
  const navigate = useNavigate()

  if (started) {
    return (
      <div className="mt-2 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <span style={{ color: "#2bc2e2", fontSize: "1.5rem" }}>✓</span>
          <p
            className="font-bold tracking-widest uppercase"
            style={{ fontSize: "1.25rem", color: "#2bc2e2" }}
          >
            Sessie gestart
          </p>
        </div>
        <Button
          onClick={() => navigate(`/session/${sessionId}/play`)}
          className="rounded-2xl px-16 font-bold tracking-widest text-white uppercase transition-all duration-200"
          style={{
            fontSize: "1.75rem",
            minHeight: "80px",
            background: "#2bc2e2",
            boxShadow:
              "0 0 40px rgba(43,194,226,0.6), 0 4px 20px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "#13a7db"
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 56px rgba(43,194,226,0.9), 0 4px 24px rgba(0,0,0,0.5)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = "#2bc2e2"
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 40px rgba(43,194,226,0.6), 0 4px 20px rgba(0,0,0,0.4)"
          }}
        >
          Verder →
        </Button>
        <Button
          onClick={() => navigate("/dashboard/sessions")}
          className="rounded-xl border px-8 py-3 text-sm font-bold tracking-widest text-white uppercase transition-colors duration-200 hover:bg-white/10"
          style={{ borderColor: "rgba(43,194,226,0.3)" }}
        >
          ← Terug naar overzicht
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-col items-center gap-4">
      <Button
        onClick={onStart}
        disabled={loading || !!loadError || starting}
        className="rounded-2xl px-16 font-bold tracking-widest text-white uppercase transition-all duration-200 select-none"
        style={{
          fontSize: "1.75rem",
          minHeight: "80px",
          background: "#2bc2e2",
          boxShadow:
            "0 0 32px rgba(43,194,226,0.5), 0 4px 16px rgba(0,0,0,0.4)",
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "#13a7db"
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 0 48px rgba(43,194,226,0.8), 0 4px 24px rgba(0,0,0,0.5)"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "#2bc2e2"
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 0 32px rgba(43,194,226,0.5), 0 4px 16px rgba(0,0,0,0.4)"
        }}
      >
        {starting ? "Bezig..." : "Start de escaperoom!"}
      </Button>
      {startError && (
        <p className="text-base font-bold" style={{ color: "#e91852" }}>
          {startError}
        </p>
      )}
      <Button
        onClick={() => navigate("/dashboard/sessions")}
        className="rounded-xl border px-8 py-3 text-sm font-bold tracking-widest text-white uppercase transition-colors duration-200 hover:bg-white/10"
        style={{ borderColor: "rgba(43,194,226,0.3)" }}
      >
        ← Terug naar overzicht
      </Button>
    </div>
  )
}

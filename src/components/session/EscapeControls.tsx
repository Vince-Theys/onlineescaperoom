import { Button } from "@/components/ui/button"

interface Props {
  revealed: boolean
  busy: boolean
  loading: boolean
  error: string | null
  onReset: () => void
  onEnd: () => void
}

export default function EscapeControls({
  revealed,
  busy,
  loading,
  error,
  onReset,
  onEnd,
}: Props) {
  return (
    <>
      <div
        className="mt-4 flex flex-wrap items-center justify-center gap-4"
        style={{
          animation: revealed
            ? "float-up 0.8s ease-out 1.6s backwards"
            : "none",
        }}
      >
        <Button
          onClick={onReset}
          disabled={busy || loading}
          className="rounded-2xl px-10 font-bold tracking-widest text-white uppercase transition-all duration-200"
          style={{
            fontSize: "1.2rem",
            minHeight: "64px",
            background: "linear-gradient(135deg, #2bc2e2 0%, #13a7db 100%)",
            boxShadow:
              "0 0 32px rgba(43,194,226,0.7), 0 4px 20px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.filter =
              "brightness(1.15)"
            ;(e.currentTarget as HTMLButtonElement).style.transform =
              "scale(1.03)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.filter = "none"
            ;(e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"
          }}
        >
          Opnieuw spelen
        </Button>

        <Button
          onClick={onEnd}
          disabled={busy || loading}
          className="rounded-2xl border-2 px-10 font-bold tracking-widest text-white uppercase transition-all duration-200 hover:bg-white/10"
          style={{
            fontSize: "1.2rem",
            minHeight: "64px",
            borderColor: "rgba(43,194,226,0.5)",
            background: "rgba(0,36,74,0.5)",
            backdropFilter: "blur(6px)",
          }}
        >
          Sessie beëindigen
        </Button>
      </div>

      {error && (
        <p className="mt-2 font-bold" style={{ color: "#e91852" }}>
          {error}
        </p>
      )}
    </>
  )
}

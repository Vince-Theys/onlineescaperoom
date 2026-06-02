import { Button } from "@/components/ui/button"

interface Props {
  onNavigate: () => void
}

export default function NotFoundContent({ onNavigate }: Props) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">
      {/* TWA logo */}
      <img
        src="/TWA-logo.png"
        alt="TWA"
        className="h-12 w-auto"
        style={{ opacity: 0.8, animation: "float-up 0.6s ease-out both" }}
        draggable={false}
      />

      {/* 404 number */}
      <div
        style={{
          fontSize: "clamp(7rem, 20vw, 14rem)",
          fontWeight: "900",
          letterSpacing: "0.05em",
          color: "#e91852",
          lineHeight: 1,
          animation:
            "flicker 3.5s linear infinite, float 6s ease-in-out infinite",
          userSelect: "none",
        }}
      >
        404
      </div>

      {/* Divider with label */}
      <div className="flex w-full max-w-xs items-center gap-3">
        <div
          className="h-px flex-1"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(233,24,82,0.5))",
          }}
        />
        <span
          className="text-xs tracking-[0.3em] uppercase"
          style={{ color: "rgba(233,24,82,0.75)" }}
        >
          Kamer niet gevonden
        </span>
        <div
          className="h-px flex-1"
          style={{
            background:
              "linear-gradient(90deg, rgba(233,24,82,0.5), transparent)",
          }}
        />
      </div>

      {/* Text */}
      <div
        className="flex flex-col items-center gap-2"
        style={{
          animation: "float-up 0.9s ease-out both",
          animationDelay: "0.1s",
        }}
      >
        <p
          className="font-bold tracking-wide uppercase"
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)",
            color: "#ffffff",
            textShadow: "0 2px 16px rgba(0,0,0,0.6)",
          }}
        >
          Oeps! Deze kamer bestaat niet.
        </p>
        <p
          className="max-w-sm"
          style={{
            fontSize: "1rem",
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.7,
          }}
        >
          De deur zit op slot. Controleer de URL of ga terug naar het begin.
        </p>
      </div>

      {/* CTA button */}
      <div
        style={{
          animation: "float-up 1s ease-out both",
          animationDelay: "0.2s",
        }}
      >
        <Button
          onClick={onNavigate}
          className="mt-2 rounded-2xl px-12 font-bold tracking-widest text-white uppercase transition-all duration-200"
          style={{
            fontSize: "1.2rem",
            minHeight: "60px",
            background: "#2bc2e2",
            animation: "pulse-glow 2.5s ease-in-out infinite",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.background = "#13a7db"
            btn.style.animation = "none"
            btn.style.boxShadow =
              "0 0 56px rgba(43,194,226,0.9), 0 4px 24px rgba(0,0,0,0.5)"
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.background = "#2bc2e2"
            btn.style.animation = "pulse-glow 2.5s ease-in-out infinite"
            btn.style.boxShadow = ""
          }}
        >
          ← Terug naar het begin
        </Button>
      </div>
    </div>
  )
}

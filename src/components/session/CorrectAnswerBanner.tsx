interface Props {
  explanation?: string | null
  loadingExplanation?: boolean
}

export default function CorrectAnswerBanner({ explanation, loadingExplanation }: Props) {
  return (
    <div
      className="mb-6 flex flex-col items-center gap-6 py-8"
      style={{ animation: "celebration-scale 0.4s ease-out forwards" }}
    >
      <style>{`
        @keyframes celebration-scale {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%           { transform: translateY(-6px); }
        }
        @keyframes ai-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes ai-appear {
          0%   { opacity: 0; transform: translateY(12px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>

      <p
        className="text-center font-bold tracking-widest uppercase"
        style={{
          fontSize: "clamp(3rem, 7vw, 5rem)",
          color: "#2bc2e2",
          textShadow: "0 0 40px rgba(43,194,226,0.9), 0 0 80px rgba(43,194,226,0.4)",
        }}
      >
        Juist!
      </p>

      {(loadingExplanation || explanation) && (
        <div
          className="w-full max-w-2xl rounded-2xl px-6 py-5 text-center"
          style={{
            background: "rgba(0,20,50,0.7)",
            border: "1px solid rgba(43,194,226,0.3)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 32px rgba(43,194,226,0.15)",
            animation: "ai-appear 0.4s ease-out forwards",
          }}
        >
          <div className="mb-3 flex items-center justify-center">
            <span
              className="rounded-full px-3 py-1 text-xs font-bold tracking-widest uppercase"
              style={{
                background:
                  "linear-gradient(90deg, rgba(43,194,226,0.2), rgba(43,194,226,0.1))",
                border: "1px solid rgba(43,194,226,0.4)",
                color: "#2bc2e2",
                backgroundSize: "200% auto",
                animation: "ai-shimmer 2s linear infinite",
              }}
            >
              ✦ AI Uitleg
            </span>
          </div>

          {loadingExplanation ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <span
                className="text-sm tracking-wide"
                style={{ color: "rgba(43,194,226,0.7)" }}
              >
                De AI denkt na
              </span>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: "#2bc2e2",
                    animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          ) : (
            <p
              className="leading-relaxed"
              style={{
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {explanation}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

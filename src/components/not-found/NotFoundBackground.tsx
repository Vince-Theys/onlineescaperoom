export default function NotFoundBackground() {
  return (
    <>
      <style>{`
        @keyframes drift-bg {
          0%   { transform: translate(0, 0); }
          100% { transform: translate(48px, 48px); }
        }
        @keyframes aurora-404 {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(1.08); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes flicker {
          0%, 18%, 22%, 25%, 53%, 57%, 100% {
            opacity: 1;
            text-shadow:
              0 0 40px rgba(233,24,82,0.9),
              0 0 80px rgba(233,24,82,0.55),
              0 0 140px rgba(233,24,82,0.3);
          }
          20%, 24%, 55% {
            opacity: 0.55;
            text-shadow: none;
          }
        }
        @keyframes float-up {
          0%   { transform: translateY(24px); opacity: 0; }
          100% { transform: translateY(0px);  opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 32px rgba(43,194,226,0.5), 0 4px 16px rgba(0,0,0,0.4); }
          50%      { box-shadow: 0 0 60px rgba(43,194,226,0.9), 0 4px 24px rgba(0,0,0,0.5); }
        }
      `}</style>

      {/* Drifting grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(43,194,226,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(43,194,226,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "drift-bg 18s linear infinite",
        }}
      />

      {/* Aurora — red/cyan tint to signal error state */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 25% 40%, rgba(233,24,82,0.18) 0%, transparent 45%), radial-gradient(circle at 75% 60%, rgba(43,194,226,0.18) 0%, transparent 45%)",
          animation: "aurora-404 5s ease-in-out infinite",
        }}
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      {/* Top accent line — red */}
      <div
        className="absolute top-0 right-0 left-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, transparent, #e91852, transparent)",
        }}
      />

      {/* Bottom accent line — red */}
      <div
        className="absolute right-0 bottom-0 left-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(233,24,82,0.35), transparent)",
        }}
      />

      {/* Faded escaperoom logo — background decoration */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <img
          src="/escaperoom-logo.png"
          alt=""
          className="h-[55vh] w-auto select-none"
          style={{ opacity: 0.04, filter: "grayscale(100%) brightness(2)" }}
          draggable={false}
        />
      </div>
    </>
  )
}

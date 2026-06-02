interface Props {
  revealed: boolean
}

export default function OrbitalDisplay({ revealed }: Props) {
  return (
    <div
      className="pointer-events-none absolute top-1/2 left-1/2 h-57.5 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed
          ? "translate(-50%, -50%) scale(1)"
          : "translate(-50%, -50%) scale(0.85)",
        transition: "all 0.9s ease 0.4s",
      }}
      aria-hidden="true"
    >
      <div className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_42px_rgba(255,255,255,0.8)]" />
      <div
        className="absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 rounded-[999px] border"
        style={{
          borderColor: "rgba(43,194,226,0.35)",
          animation: "orbit-spin 14s linear infinite",
          boxShadow: "0 0 34px rgba(43,194,226,0.18)",
        }}
      >
        <span className="absolute top-1/2 left-[12%] h-3 w-3 -translate-y-1/2 rounded-full bg-[#2bc2e2] shadow-[0_0_18px_rgba(43,194,226,1)]" />
      </div>
      <div
        className="absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 rounded-[999px] border"
        style={{
          borderColor: "rgba(255,216,77,0.35)",
          transform: "translateY(-50%) rotate(12deg)",
          animation: "orbit-spin 18s linear infinite reverse",
        }}
      >
        <span className="absolute top-1/2 right-[15%] h-3 w-3 -translate-y-1/2 rounded-full bg-[#ffd84d] shadow-[0_0_18px_rgba(255,216,77,1)]" />
      </div>
      <div
        className="absolute inset-x-8 top-1/2 h-44 -translate-y-1/2 rounded-[999px] border"
        style={{
          borderColor: "rgba(255,255,255,0.18)",
          transform: "translateY(-50%) rotate(-10deg)",
        }}
      />
    </div>
  )
}

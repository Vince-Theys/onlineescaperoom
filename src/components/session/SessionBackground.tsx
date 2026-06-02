interface Props {
  children: React.ReactNode
  className?: string
}

export default function SessionBackground({ children, className = "" }: Props) {
  return (
    <div
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(ellipse at center, #00234a 0%, #001833 60%, #000e1f 100%)",
      }}
    >
      {/* Grid texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(43,194,226,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(43,194,226,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)",
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
      {children}
    </div>
  )
}

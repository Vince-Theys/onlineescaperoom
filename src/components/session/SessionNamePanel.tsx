import type { Session } from "@/types"

interface Props {
  loading: boolean
  loadError: string | null
  session: Session | null
}

export default function SessionNamePanel({
  loading,
  loadError,
  session,
}: Props) {
  if (loading) {
    return (
      <div
        className="h-12 w-72 animate-pulse rounded-lg"
        style={{ background: "rgba(43,194,226,0.1)" }}
      />
    )
  }

  if (loadError) {
    return (
      <p className="text-xl font-bold" style={{ color: "#e91852" }}>
        {loadError}
      </p>
    )
  }

  return (
    <div
      className="rounded-xl px-8 py-3"
      style={{
        background: "rgba(43,194,226,0.08)",
        border: "1px solid rgba(43,194,226,0.25)",
      }}
    >
      <p
        className="mb-1 text-sm tracking-widest uppercase"
        style={{ color: "rgba(43,194,226,0.6)" }}
      >
        Klas
      </p>
      <h1
        className="font-bold tracking-wider uppercase"
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
          color: "#ffffff",
          textShadow: "0 0 24px rgba(43,194,226,0.5)",
        }}
      >
        {session?.team_name ?? ""}
      </h1>
    </div>
  )
}

import { Button } from "@/components/ui/button"

interface Props {
  onRetry: () => void
}

export default function WrongAnswerBanner({ onRetry }: Props) {
  return (
    <div className="mb-6 flex flex-col items-center gap-4">
      <p
        className="text-center font-bold tracking-widest uppercase"
        style={{
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          color: "#e91852",
          textShadow: "0 0 32px rgba(233,24,82,0.7)",
        }}
      >
        Fout!
      </p>
      <Button
        onClick={onRetry}
        className="rounded-xl border-2 px-10 py-3 font-bold tracking-widest text-white uppercase transition-colors duration-200 hover:bg-white/10"
        style={{ fontSize: "1.1rem", borderColor: "rgba(255,255,255,0.3)" }}
      >
        Probeer opnieuw
      </Button>
    </div>
  )
}

import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import type { Session } from "@/types"

interface Props {
  session: Session
  sessionUrl: string
  copied: boolean
  onCopy: () => void
  onReset: () => void
}

export default function CreateSessionSuccess({
  session,
  sessionUrl,
  copied,
  onCopy,
  onReset,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl text-accent">✓</span>
          <div>
            <p className="font-heading text-2xl tracking-wide text-foreground uppercase">
              Sessie aangemaakt
            </p>
            <p className="text-muted-foreground">{session.team_name}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Sessie-URL</p>
          <p className="break-all text-accent">{sessionUrl}</p>
          <Button
            variant="link"
            onClick={onCopy}
            className="h-auto self-start p-0 text-sm text-muted-foreground underline hover:text-accent"
          >
            {copied ? "Gekopieerd!" : "Kopieer URL"}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <Link to={`/dashboard/sessions/${session.id}`}>
            <Button variant="default">Ga naar sessie</Button>
          </Link>
          <Button variant="outline" onClick={onReset}>
            Nieuwe sessie aanmaken
          </Button>
          <Link
            to="/dashboard/sessions"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Terug naar overzicht
          </Link>
        </div>
      </div>
    </div>
  )
}

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { restartSession } from "@/services/sessionService"
import type { Session } from "@/types"

interface Props {
  session: Session
  onClose: () => void
  onReset: (updated: Session) => void
}

export default function ResetModal({ session, onClose, onReset }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleReset() {
    setBusy(true)
    try {
      const updated = await restartSession(session.id)
      onReset(updated)
      onClose()
    } catch {
      setError("Resetten mislukt. Probeer opnieuw.")
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sessie resetten</DialogTitle>
          <DialogDescription>
            Weet je zeker dat je{" "}
            <span className="font-semibold text-foreground">
              {session.team_name}
            </span>{" "}
            wilt resetten naar level 1? De huidige voortgang gaat verloren.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuleer
          </Button>
          <Button variant="destructive" onClick={handleReset} disabled={busy}>
            {busy ? "Resetten…" : "Ja, reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

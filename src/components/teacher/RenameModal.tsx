import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { updateSession } from "@/services/sessionService"
import type { Session } from "@/types"

interface Props {
  session: Session
  onClose: () => void
  onSaved: (s: Session) => void
}

export default function RenameModal({ session, onClose, onSaved }: Props) {
  const [name, setName] = useState(session.team_name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Naam mag niet leeg zijn.")
      return
    }
    if (trimmed === session.team_name) {
      onClose()
      return
    }
    setBusy(true)
    try {
      const updated = await updateSession(session.id, { team_name: trimmed })
      onSaved(updated)
      onClose()
    } catch {
      setError("Opslaan mislukt. Probeer opnieuw.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sessie hernoemen</DialogTitle>
          <DialogDescription>Geef de sessie een nieuwe naam.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError("")
            }}
            placeholder="Naam van de sessie"
            autoFocus
            disabled={busy}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={busy}
            >
              Annuleer
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Opslaan…" : "Opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

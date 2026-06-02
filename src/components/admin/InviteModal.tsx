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
import { inviteUser } from "@/services/adminService"
import type { AppUser } from "@/types"

interface Props {
  onClose: () => void
  onInvited: (u: AppUser) => void
}

export default function InviteModal({ onClose, onInvited }: Props) {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes("@")) {
      setError("Geef een geldig e-mailadres in.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await inviteUser(trimmed)
      // Optimistically add a pending row; the real one will be reconciled on next refresh
      onInvited({
        id: `pending-${trimmed}`,
        name: trimmed,
        app_role: "teacher",
        status: "pending",
        created_at: new Date().toISOString(),
      })
      onClose()
    } catch (err) {
      setError((err as Error).message || "Uitnodigen mislukt. Probeer opnieuw.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leerkracht uitnodigen</DialogTitle>
          <DialogDescription>
            We sturen een e-mail met een uitnodigingslink. De docent kan daarmee
            een account aanmaken en inloggen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError("")
            }}
            placeholder="naam@school.be"
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
              {busy ? "Versturen…" : "Uitnodiging versturen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

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
import { deleteUser } from "@/services/adminService"
import type { AppUser } from "@/types"

interface Props {
  user: AppUser
  onClose: () => void
  onDeleted: (id: string) => void
}

export default function DeleteUserModal({ user, onClose, onDeleted }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    setBusy(true)
    setError("")
    try {
      await deleteUser(user.id)
      onDeleted(user.id)
      onClose()
    } catch (err) {
      setError((err as Error).message || "Verwijderen mislukt.")
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gebruiker verwijderen</DialogTitle>
          <DialogDescription>
            Weet je zeker dat je{" "}
            <span className="font-semibold text-foreground">{user.name}</span>{" "}
            wilt verwijderen? Dit verwijdert ook al hun sessies en kan niet
            ongedaan worden gemaakt.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuleer
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={busy}>
            {busy ? "Verwijderen…" : "Ja, verwijder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

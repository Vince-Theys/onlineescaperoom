import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Session } from "@/types"

interface Props {
  session: Session
  onClose: () => void
  onDeleted: (id: string) => void
}

export default function DeleteModal({ session, onClose, onDeleted }: Props) {
  function handleDelete() {
    onDeleted(session.id)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sessie verwijderen</DialogTitle>
          <DialogDescription>
            Weet je zeker dat je{" "}
            <span className="font-semibold text-foreground">
              {session.team_name}
            </span>{" "}
            wilt verwijderen? Dit verwijdert ook alle bijbehorende vragen.{" "}
            Je hebt daarna 10 seconden om dit ongedaan te maken.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuleer
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Verwijder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { listQuestionsWithOptions } from "@/services/questionService"
import type { QuestionWithOptions, Session } from "@/types"
import { FLOOR_NAMES } from "@/lib/floorConstants"

interface Props {
  session: Session
  onClose: () => void
}

export default function StatsModal({ session, onClose }: Props) {
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [loadingQ, setLoadingQ] = useState(true)

  useEffect(() => {
    listQuestionsWithOptions(session.escape_room_id)
      .then(setQuestions)
      .finally(() => setLoadingQ(false))
  }, [session.escape_room_id])

  const attempts = session.level_attempts
  const totalAttempts = attempts
    ? Object.values(attempts).reduce((sum, n) => sum + n, 0)
    : null

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Statistieken — {session.team_name}</DialogTitle>
          <DialogDescription>
            Aantal pogingen per level voor het correcte antwoord.
          </DialogDescription>
        </DialogHeader>

        {!attempts ? (
          <p className="py-4 text-sm text-muted-foreground">
            Geen pogingen bijgehouden voor deze sessie. Start de sessie opnieuw
            om statistieken te verzamelen.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {[1, 2, 3, 4, 5].map((level) => {
              const count = attempts[String(level)] ?? null
              const q = questions.find((q) => q.level_number === level)
              return (
                <div
                  key={level}
                  className="flex gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
                    {level}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        {q?.room_name ?? FLOOR_NAMES[level - 1]}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {count === null ? "—" : (
                          <span className={`font-semibold ${count === 1 ? "text-accent" : count <= 3 ? "text-amber-400" : "text-destructive"}`}>
                            {count} {count === 1 ? "poging" : "pogingen"}
                          </span>
                        )}
                      </span>
                    </div>
                    {loadingQ ? (
                      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    ) : (
                      <span className="text-sm text-foreground">
                        {q?.question_text ?? "—"}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="mt-2 flex items-center justify-between border-t border-border px-4 pt-3">
              <span className="text-sm font-medium text-foreground">
                Totaal
              </span>
              <span className="text-sm font-bold text-foreground">
                {totalAttempts} {totalAttempts === 1 ? "poging" : "pogingen"}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Sluiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

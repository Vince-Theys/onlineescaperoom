import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { User } from "@supabase/supabase-js"

interface Props {
  user: User | null
  firstName: string
  lastName: string
  error: string | null
  saving: boolean
  saved: boolean
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
  onSave: () => void
}

export default function AccountProfileForm({
  user,
  firstName,
  lastName,
  error,
  saving,
  saved,
  onFirstNameChange,
  onLastNameChange,
  onSave,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold text-foreground">
        Profielinformatie
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="firstName"
            >
              Voornaam
            </label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              placeholder="Voornaam"
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="lastName"
            >
              Achternaam
            </label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              placeholder="Achternaam"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            E-mailadres
          </label>
          <Input
            value={user?.email ?? ""}
            disabled
            className="cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Het e-mailadres kan niet worden gewijzigd.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={onSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {saving ? "Opslaan…" : saved ? "Opgeslagen!" : "Opslaan"}
        </Button>
      </div>
    </div>
  )
}

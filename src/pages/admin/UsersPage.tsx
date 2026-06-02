import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePageTitle } from "@/hooks/use-page-title"
import { useRole } from "@/context/role-context"
import type { AppUser } from "@/types"
import { listUsers, updateUserRole } from "@/services/adminService"
import UserRow from "@/components/admin/UserRow"
import InviteModal from "@/components/admin/InviteModal"
import DeleteUserModal from "@/components/admin/DeleteUserModal"

export default function UsersPage() {
  usePageTitle("Gebruikers")
  const { userId } = useRole()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null) // userId of row being updated
  const [showInvite, setShowInvite] = useState(false)
  const [toDelete, setToDelete] = useState<AppUser | null>(null)

  // Initial load — loading is already true from useState(true) above, so no
  // synchronous setState is needed here; all state updates happen in callbacks.
  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => setError("Gebruikers konden niet geladen worden."))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggleRole(user: AppUser) {
    const newRole = user.app_role === "admin" ? "teacher" : "admin"
    setBusy(user.id)
    try {
      await updateUserRole(user.id, newRole)
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, app_role: newRole } : u))
      )
    } catch {
      setError("Rol bijwerken mislukt. Probeer opnieuw.")
    } finally {
      setBusy(null)
    }
  }

  function handleInvited(newUser: AppUser) {
    // Add an optimistic placeholder immediately for perceived speed, then reload
    // from the DB so the real UUID replaces the "pending-..." placeholder. Without
    // the reload, the fake id would cause a 400 "user_id must be an UUID" error if
    // someone tries to delete the row before navigating away.
    setUsers((prev) =>
      prev.some((u) => u.id === newUser.id) ? prev : [...prev, newUser]
    )
    listUsers()
      .then(setUsers)
      .catch(() => {
        /* non-critical — placeholder row is still visible */
      })
  }

  function handleDeleted(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Alle gebruikers
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {!loading &&
                `${users.length} gebruiker${users.length !== 1 ? "s" : ""}`}
            </span>
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-lg px-4 text-sm font-semibold"
              onClick={() => setShowInvite(true)}
            >
              + Leerkracht uitnodigen
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col gap-3 p-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && <p className="p-6 text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  E-mailadres
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Rol
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  profile={user}
                  isSelf={user.id === userId}
                  busy={busy === user.id}
                  onToggleRole={() => handleToggleRole(user)}
                  onDelete={() => setToDelete(user)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={handleInvited}
        />
      )}
      {toDelete && (
        <DeleteUserModal
          user={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}

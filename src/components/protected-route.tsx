import { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { supabase } from "@/utils/supabase"
import { RoleProvider } from "@/context/role-context"
import type { Session } from "@supabase/supabase-js"

export function ProtectedRoute() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null // loading
  if (!session) return <Navigate to="/login" replace />
  return (
    <RoleProvider>
      <Outlet />
    </RoleProvider>
  )
}

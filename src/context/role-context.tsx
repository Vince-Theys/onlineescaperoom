import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

type AppRole = 'teacher' | 'admin'

interface RoleContextValue {
  app_role: AppRole | null
  userId: string | null
  loading: boolean
}

const RoleContext = createContext<RoleContextValue>({
  app_role: null,
  userId: null,
  loading: true,
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [app_role, setAppRole] = useState<AppRole | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchRole(uid: string) {
    // Retry up to 3 times with back-off. The JWT may not be fully propagated
    // on the very first attempt after a token refresh, causing RLS to return
    // nothing. Without retries, a transient failure silently demotes admins.
    let data: { app_role: string } | null = null
    let lastError: { message: string } | null = null

    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase
        .from('user')
        .select('app_role')
        .eq('id', uid)
        .single()
      if (result.data) { data = result.data; break }
      lastError = result.error
      if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
    }

    if (!data) {
      // Still failed after retries — log but do NOT silently downgrade to
      // teacher. Keep whatever role is already in state; only mark loading done.
      console.warn('Could not fetch app_role:', lastError?.message)
      setUserId(uid)
      setLoading(false)
      return
    }

    setAppRole(data.app_role as AppRole)
    setUserId(uid)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchRole(user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        fetchRole(session.user.id)
      } else {
        setAppRole(null)
        setUserId(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <RoleContext.Provider value={{ app_role, userId, loading }}>
      {children}
    </RoleContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRole(): RoleContextValue {
  return useContext(RoleContext)
}

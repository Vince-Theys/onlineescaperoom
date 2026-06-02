import { Navigate, Outlet } from 'react-router-dom'
import { useRole } from '@/context/role-context'

export function AdminRoute() {
  const { app_role, loading } = useRole()
  if (loading) return null
  if (app_role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

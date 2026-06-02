import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import { Layout } from "@/components/layout"
import { Dashboard } from "@/pages/Dashboard"
import CreateSessionPage from "@/pages/teacher/CreateSessionPage"
import TeacherDashboardPage from "@/pages/teacher/TeacherDashboardPage"
import SessionDetailPage from "@/pages/teacher/SessionDetailPage"
import StartScreen from "@/pages/session/StartScreen"
import PlayScreen from "@/pages/session/PlayScreen"
import LoginPage from "./pages/LoginPage"
import { ProtectedRoute } from "./components/protected-route"
import { AdminRoute } from "./components/admin-route"
import EscapeScreen from "@/pages/session/EscapeScreen"
import UsersPage from "@/pages/admin/UsersPage"
import AccountPage from "@/pages/AccountPage"
import AcceptInvitePage from "@/pages/AcceptInvitePage"
import ForgotPasswordPage from "@/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import NotFoundPage from "@/pages/NotFoundPage"

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/accept-invite", element: <AcceptInvitePage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },

  // Student-facing session screens (no auth, no sidebar)
  { path: "/session/:id", element: <StartScreen /> },
  { path: "/session/:id/play", element: <PlayScreen /> },
  { path: "/session/:id/escape", element: <EscapeScreen /> },

  // Teacher & admin panel
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/dashboard/sessions", element: <TeacherDashboardPage /> },
          { path: "/dashboard/sessions/create", element: <CreateSessionPage /> },
          { path: "/dashboard/sessions/:id", element: <SessionDetailPage /> },
          {
            element: <AdminRoute />,
            children: [
              { path: "/admin/users", element: <UsersPage /> },
            ],
          },
          { path: "/account", element: <AccountPage /> },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
])

export function App() {
  return <RouterProvider router={router} />
}

export default App

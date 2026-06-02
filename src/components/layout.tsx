import {
  Link,
  matchPath,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom"
import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Plus, UserRound, Shield, User as UserIcon } from "lucide-react"
import { supabase } from "@/utils/supabase"
import { useRole } from "@/context/role-context"
import type { User } from "@supabase/supabase-js"

function getInitials(user: User): string {
  const name: string =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    ""
  return name
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("")
}

function getDisplayName(user: User): string {
  return (
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    ""
  )
}

const routeMatchers: { pattern: string; label: string }[] = [
  { pattern: "/dashboard/sessions/create", label: "Sessie aanmaken" },
  { pattern: "/dashboard/sessions/:id", label: "Sessiedetails" },
  { pattern: "/dashboard/sessions", label: "Sessies" },
  { pattern: "/dashboard", label: "Dashboard" },
  { pattern: "/admin/users", label: "Gebruikers" },
  { pattern: "/account", label: "Account" },
]

function getPageLabel(pathname: string): string {
  for (const { pattern, label } of routeMatchers) {
    if (matchPath(pattern, pathname)) return label
  }
  return pathname
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const pageLabel = getPageLabel(location.pathname)
  const [user, setUser] = useState<User | null>(null)
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url
  const { app_role } = useRole()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-foreground">{pageLabel}</h1>
          <div className="flex items-center gap-3">
            {location.pathname === "/dashboard" && (
              <Button
                asChild
                className="h-8 gap-1.5 rounded-lg px-3.5 text-sm font-semibold"
              >
                <Link to="/dashboard/sessions/create">
                  <Plus className="h-3.5 w-3.5" />
                  Nieuwe sessie
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-10 w-10 cursor-pointer">
                  {avatarUrl && (
                    <AvatarImage
                      src={avatarUrl}
                      alt="Avatar"
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                    {user ? getInitials(user) : "?"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-3 py-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    {avatarUrl && (
                      <AvatarImage
                        src={avatarUrl}
                        alt="Avatar"
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                      {user ? getInitials(user) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user ? getDisplayName(user) : ""}
                    </p>
                    <p className="truncate text-xs font-normal text-muted-foreground">
                      {user?.email ?? ""}
                    </p>
                    {app_role && (
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          app_role === "admin"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {app_role === "admin" ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <UserIcon className="h-3 w-3" />
                        )}
                        {app_role === "admin" ? "Admin" : "Leerkracht"}
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to="/account"
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <UserRound className="h-4 w-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

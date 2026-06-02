import { LayoutDashboard, CalendarDays, Users } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { version } from "../../package.json"
import { useRole } from "@/context/role-context"

const teacherItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/sessions", label: "Sessies", icon: CalendarDays, exact: false },
]

const adminItems = [
  { to: "/admin/users", label: "Gebruikers", icon: Users, exact: false },
]

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
  pathname,
}: {
  to: string
  label: string
  icon: React.ElementType
  exact: boolean
  pathname: string
}) {
  const isActive = exact ? pathname === to : pathname.startsWith(to)
  return (
    <NavLink
      to={to}
      end={exact}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        isActive
          ? "bg-accent/10 font-medium text-accent"
          : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

export function AppSidebar() {
  const { pathname } = useLocation()
  const { app_role } = useRole()

  return (
    <aside className="flex w-52 shrink-0 flex-col py-5">
      <div className="flex items-center gap-3 px-5 pb-8">
        <img
          src="/escaperoom-logo.png"
          alt="Escaperoom Logo"
          className="h-8 w-8 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-semibold text-foreground">
            Escape room
          </p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            v{version}
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {teacherItems.map((item) => (
          <NavItem key={item.to} {...item} pathname={pathname} />
        ))}

        {app_role === "admin" && (
          <>
            <div className="mx-2 my-2 border-t border-border/40" />
            {adminItems.map((item) => (
              <NavItem key={item.to} {...item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      <div className="mt-auto px-5 pb-1">
        <p className="text-[10px] tracking-widest text-muted-foreground/40 uppercase">
          {app_role === "admin" ? "Beheerdersportaal" : "Docentenportaal"}
        </p>
      </div>
    </aside>
  )
}

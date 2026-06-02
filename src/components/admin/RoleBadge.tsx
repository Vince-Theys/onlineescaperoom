import { Shield, User } from "lucide-react"

interface Props {
  app_role: "teacher" | "admin"
}

export default function RoleBadge({ app_role }: Props) {
  const isAdmin = app_role === "admin"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${
        isAdmin
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      {isAdmin ? (
        <Shield className="h-3.5 w-3.5" />
      ) : (
        <User className="h-3.5 w-3.5" />
      )}
      {isAdmin ? "Admin" : "Leerkracht"}
    </span>
  )
}

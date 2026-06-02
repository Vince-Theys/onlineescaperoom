import type { Session, SessionWithTeacher } from "@/types"
import type { SortKey } from "@/components/teacher/SortHeader"

export function compareSessions(
  a: Session | SessionWithTeacher,
  b: Session | SessionWithTeacher,
  key: SortKey,
  counts: Record<string, number>
): number {
  switch (key) {
    case "team_name":
      return a.team_name.localeCompare(b.team_name, "nl", {
        sensitivity: "base",
      })
    case "teacher_email": {
      const ea =
        ("teacher_email" in a ? (a as SessionWithTeacher).teacher_email : "") ??
        ""
      const eb =
        ("teacher_email" in b ? (b as SessionWithTeacher).teacher_email : "") ??
        ""
      return ea.localeCompare(eb, "nl", { sensitivity: "base" })
    }
    case "questionCount":
      return (counts[a.escape_room_id] ?? 0) - (counts[b.escape_room_id] ?? 0)
    case "current_level":
      return (a.current_level ?? 0) - (b.current_level ?? 0)
    case "status":
      if (a.status === b.status) return 0
      return a.status === "active" ? -1 : 1
  }
}

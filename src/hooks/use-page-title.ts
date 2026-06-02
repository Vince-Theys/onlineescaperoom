import { useEffect } from "react"

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} – TWA Escape Room` : "TWA Escape Room"
    return () => {
      document.title = "TWA Escape Room"
    }
  }, [title])
}

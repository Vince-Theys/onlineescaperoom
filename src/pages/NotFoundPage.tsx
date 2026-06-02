import { useNavigate } from "react-router-dom"
import { usePageTitle } from "@/hooks/use-page-title"
import FlyingSpaceship from "@/components/FlyingSpaceship"
import NotFoundBackground from "@/components/not-found/NotFoundBackground"
import NotFoundContent from "@/components/not-found/NotFoundContent"

export default function NotFoundPage() {
  usePageTitle("Pagina niet gevonden")
  const navigate = useNavigate()

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, #00234a 0%, #001833 60%, #000e1f 100%)",
      }}
    >
      <NotFoundBackground />
      <FlyingSpaceship />
      <NotFoundContent onNavigate={() => navigate("/dashboard")} />

      {/* TWA avatar — bottom-right mascot zone */}
      <img
        src="/TWA-avatar.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 select-none"
        style={{ height: "150px", width: "auto", opacity: 0.88 }}
        draggable={false}
      />
    </div>
  )
}

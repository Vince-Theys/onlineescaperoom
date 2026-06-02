import { useEffect, useRef } from "react"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

type RocketPath = {
  start: [number, number]
  mid: [number, number]
  end: [number, number]
  control1: [number, number]
  control2: [number, number]
}

function pickPath(): RocketPath {
  const w = window.innerWidth
  const h = window.innerHeight
  const paths: RocketPath[] = [
    {
      start: [-160, 120],
      control1: [w * 0.22, 40],
      mid: [w * 0.5, h * 0.48],
      control2: [w * 0.78, h - 40],
      end: [w + 160, h - 150],
    },
    {
      start: [w + 160, 120],
      control1: [w * 0.78, 40],
      mid: [w * 0.5, h * 0.5],
      control2: [w * 0.22, h - 40],
      end: [-160, h - 150],
    },
    {
      start: [-160, h - 120],
      control1: [w * 0.18, h - 20],
      mid: [w * 0.5, h * 0.52],
      control2: [w * 0.82, 40],
      end: [w + 160, 130],
    },
    {
      start: [w + 160, h - 120],
      control1: [w * 0.82, h - 20],
      mid: [w * 0.5, h * 0.5],
      control2: [w * 0.18, 40],
      end: [-160, 130],
    },
    {
      start: [90, h + 160],
      control1: [w * 0.08, h * 0.72],
      mid: [w * 0.5, h * 0.5],
      control2: [w * 0.92, h * 0.28],
      end: [w - 90, -160],
    },
    {
      start: [w - 90, -160],
      control1: [w * 0.92, h * 0.28],
      mid: [w * 0.5, h * 0.5],
      control2: [w * 0.08, h * 0.72],
      end: [90, h + 160],
    },
  ]
  return paths[Math.floor(Math.random() * paths.length)]
}

function point(path: RocketPath, t: number): [number, number] {
  const p0 = t < 0.5 ? path.start : path.mid
  const p1 = t < 0.5 ? path.control1 : path.control2
  const p2 = t < 0.5 ? path.mid : path.end
  const localT = t < 0.5 ? t * 2 : (t - 0.5) * 2
  const mt = 1 - localT
  return [
    mt ** 2 * p0[0] + 2 * mt * localT * p1[0] + localT ** 2 * p2[0],
    mt ** 2 * p0[1] + 2 * mt * localT * p1[1] + localT ** 2 * p2[1],
  ]
}

interface Props {
  launchDelay?: number
}

export default function FlyingSpaceship({ launchDelay = 800 }: Props) {
  const rocketRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function launch() {
      const rocket = rocketRef.current
      if (!rocket) return
      const path = pickPath()
      const start = performance.now()
      const duration = 14000

      function frame(now: number) {
        const t = Math.min((now - start) / duration, 1)
        const [x, y] = point(path, t)
        const [nextX, nextY] = point(path, Math.min(t + 0.01, 1))
        const angle = Math.atan2(nextY - y, nextX - x)
        rocket!.style.opacity = t < 0.04 || t > 0.96 ? "0" : "1"
        rocket!.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad)`
        if (t < 1) window.requestAnimationFrame(frame)
      }

      window.requestAnimationFrame(frame)
    }

    const firstLaunch = window.setTimeout(launch, launchDelay)
    const interval = window.setInterval(launch, 22000)
    return () => {
      window.clearTimeout(firstLaunch)
      window.clearInterval(interval)
    }
  }, [launchDelay])

  return (
    <div
      ref={rocketRef}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-50 h-24 w-24 opacity-0 md:h-28 md:w-28"
      style={{ transformOrigin: "center", willChange: "transform, opacity" }}
    >
      <div className="h-full w-full rotate-90">
        <DotLottieReact src="/Spaceship.lottie" autoplay loop />
      </div>
    </div>
  )
}

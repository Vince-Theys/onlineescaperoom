import { Suspense, useRef, useState, useEffect, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment, Lightformer } from "@react-three/drei"
import * as THREE from "three"
import RoomCamera from "./RoomCamera"
import type { RoomPhase, FocusTarget } from "./WorkshopScene"
import type { AnswerState } from "@/types"

// ════════════════════════════════════════════════════════════════════════════
//  HET ATELIER VAN ALVA — a realistic north-light painter's studio.
//  Built from references of classical ateliers: H-frame studio easel, taboret,
//  plaster casts, canvases stacked against the walls, a still-life corner.
//  Three glowing clickable objects, each in its own zone:
//    board → painter's easel (in-progress canvas)
//    clock → electric potter's wheel
//    book  → brass refractor telescope under the skylight
//  The breathing green glow marks an active/clickable object.
// ════════════════════════════════════════════════════════════════════════════

// ─── Realistic palette ──────────────────────────────────────────────────────────
const WOOD       = "#7c5733"   // beech/walnut studio furniture
const WOOD_DARK  = "#5a3d22"
const WOOD_LIGHT = "#9c7245"
const FLOOR_COL  = "#b39468"   // aged oak boards
const WALL       = "#d9cdb6"   // warm plaster (north-light studio)
const WALL_LOW   = "#cabda3"
const BRASS      = "#b3914f"
const METAL_DARK = "#3d4148"
const LINEN      = "#e7dcc4"   // raw canvas
const TERRA      = "#b06a45"   // clay
const TEAL       = "#2bc2e2"
const GLOW_COLOR = "#00ff88"

// ─── Shared glow curve ─────────────────────────────────────────────────────────
const glowBreath = (t: number) => Math.sin(t * 1.5) * 0.5 + 0.5
function glowEmissive(t: number, active: boolean, completed: boolean, hoverP: number): number {
  if (completed) return 0.45
  if (!active) return 0
  return glowBreath(t) * 1.15 * (1 - hoverP)
}
function glowLight(t: number, active: boolean, completed: boolean, hoverP: number): number {
  if (completed) return 2.5
  if (!active) return 0
  return glowBreath(t) * 19 * (1 - hoverP)
}

// ─── Room dimensions ────────────────────────────────────────────────────────────
const ROOM_W = 40   // x: -20 .. 20
const ROOM_D = 32   // z: -16 .. 16
const ROOM_H = 11   // y:   0 .. 11

// ─── Camera positions ──────────────────────────────────────────────────────────
const EXPLORE_CAM = { position: [0, 6, 14.5] as [number, number, number], lookAt: [0, 3.8, -3] as [number, number, number] }
const EASEL_CAM   = { position: [-11, 4.5, 8] as [number, number, number], lookAt: [-11, 4.0, 1] as [number, number, number] }
const WHEEL_CAM   = { position: [-3, 4.0, 11] as [number, number, number], lookAt: [-3, 2.1, 5]  as [number, number, number] }
const TELE_CAM    = { position: [12, 4.8, 6]  as [number, number, number], lookAt: [12, 3.9, -1] as [number, number, number] }
const DOOR_CAM    = { position: [0, 3.7, -7]  as [number, number, number], lookAt: [0, 3.3, -16] as [number, number, number] }

// ─── Object anchor points ───────────────────────────────────────────────────────
const EASEL_POS: [number, number, number] = [-11, 0,    1]
const WHEEL_POS: [number, number, number] = [-3,  0,    5]
const TELE_POS:  [number, number, number] = [12,  0,   -1]
const DOOR_POS:  [number, number, number] = [0,   3.1, -15.7]

// ════════════════════════════════════════════════════════════════════════════
//  Procedural painting textures — drawn on a 2D canvas so the canvases read as
//  real paintings (skies, hills, still-life, night sky) with canvas weave + varnish
// ════════════════════════════════════════════════════════════════════════════

type PaintStyle = "landscape" | "sunset" | "seascape" | "stilllife" | "night" | "abstract" | "unfinished"

/** Deterministic PRNG (mulberry32) — keeps paintings stable across renders. */
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function addCanvasWeave(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  ctx.globalAlpha = 0.05
  ctx.strokeStyle = "#000"
  for (let x = 0; x < w; x += 3) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  ctx.strokeStyle = "#fff"
  for (let y = 0; y < h; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
  ctx.restore()
}

function addBrushNoise(ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, n = 240) {
  ctx.save()
  for (let i = 0; i < n; i++) {
    const x = rng() * w, y = rng() * h
    const len = 4 + rng() * 14, a = (rng() - 0.5) * Math.PI
    ctx.globalAlpha = 0.04 + rng() * 0.06
    ctx.strokeStyle = rng() > 0.5 ? "#ffffff" : "#000000"
    ctx.lineWidth = 1 + rng() * 1.5
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke()
  }
  ctx.restore()
}

function addVarnishVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72)
  g.addColorStop(0, "rgba(0,0,0,0)")
  g.addColorStop(1, "rgba(20,12,4,0.32)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function vGradient(ctx: CanvasRenderingContext2D, w: number, y0: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.fillRect(0, y0, w, y1 - y0)
}

function drawHills(ctx: CanvasRenderingContext2D, w: number, baseY: number, height: number, color: string, rng: () => number) {
  ctx.fillStyle = color
  ctx.beginPath(); ctx.moveTo(0, baseY)
  const steps = 8
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w
    const y = baseY - Math.abs(Math.sin(i * 1.3 + rng() * 2)) * height
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, baseY + 200); ctx.lineTo(0, baseY + 200); ctx.closePath(); ctx.fill()
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, scale: number, rng: () => number) {
  ctx.fillStyle = "#4a3322"
  ctx.fillRect(x - 3 * scale, groundY - 40 * scale, 6 * scale, 40 * scale)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? "#3c5a2e" : "#4f7339"
    const cx = x + (rng() - 0.5) * 30 * scale
    const cy = groundY - 45 * scale - rng() * 26 * scale
    ctx.beginPath(); ctx.arc(cx, cy, (10 + rng() * 10) * scale, 0, Math.PI * 2); ctx.fill()
  }
}

/** Paint one style onto the 2D context. */
function paintScene(ctx: CanvasRenderingContext2D, w: number, h: number, style: PaintStyle, seed: number) {
  const rng = makeRng(seed * 9301 + 49297)
  const horizon = h * 0.6

  if (style === "landscape") {
    vGradient(ctx, w, 0, horizon, [[0, "#7fb0d8"], [0.7, "#bfe0f0"], [1, "#eaf3ee"]])
    ctx.fillStyle = "rgba(255,250,235,0.9)"
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(rng() * w, h * (0.12 + rng() * 0.2), 30 + rng() * 40, 12 + rng() * 10, 0, 0, Math.PI * 2); ctx.fill() }
    drawHills(ctx, w, horizon + 6, 36, "#8fa9bf", rng)
    drawHills(ctx, w, horizon + 24, 30, "#6f8f63", rng)
    vGradient(ctx, w, horizon + 20, h, [[0, "#7a9550"], [1, "#5c7038"]])
    drawTree(ctx, w * 0.78, h * 0.82, 1.6, rng)
    drawTree(ctx, w * 0.2, h * 0.86, 1.1, rng)
  } else if (style === "sunset") {
    vGradient(ctx, w, 0, horizon, [[0, "#3b3b6e"], [0.45, "#c8627a"], [0.8, "#f0a25a"], [1, "#ffd98a"]])
    const sx = w * 0.5, sy = horizon * 0.78
    const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 70); sg.addColorStop(0, "#fff3c4"); sg.addColorStop(1, "rgba(255,200,120,0)")
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 70, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#fff0c0"; ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI * 2); ctx.fill()
    drawHills(ctx, w, horizon + 10, 40, "#5a3f63", rng)
    vGradient(ctx, w, horizon, h, [[0, "#6a4a66"], [1, "#33233a"]])
    ctx.strokeStyle = "rgba(255,210,150,0.5)"; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(sx, horizon); ctx.lineTo(sx - 10, h); ctx.stroke()
  } else if (style === "seascape") {
    vGradient(ctx, w, 0, horizon, [[0, "#9cc6e6"], [1, "#e8f1e8"]])
    vGradient(ctx, w, horizon, h, [[0, "#2f6f86"], [0.6, "#3d87a0"], [1, "#bfae86"]])
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2
    for (let i = 0; i < 14; i++) { const y = horizon + 8 + rng() * (h - horizon - 40); ctx.beginPath(); ctx.moveTo(rng() * w, y); ctx.lineTo(rng() * w * 0.3 + rng() * w * 0.4, y); ctx.stroke() }
    ctx.fillStyle = "#d8c79a"; ctx.beginPath(); ctx.moveTo(0, h); ctx.quadraticCurveTo(w * 0.5, h - 24, w, h); ctx.lineTo(w, h); ctx.closePath(); ctx.fill()
  } else if (style === "stilllife") {
    vGradient(ctx, w, 0, h, [[0, "#5a4636"], [1, "#3a2c22"]])
    ctx.fillStyle = "#6e5236"; ctx.fillRect(0, h * 0.66, w, h * 0.34)
    ctx.fillStyle = "rgba(255,240,210,0.08)"; ctx.beginPath(); ctx.ellipse(w * 0.4, h * 0.35, w * 0.4, h * 0.3, 0, 0, Math.PI * 2); ctx.fill()
    // vase
    ctx.fillStyle = "#23506b"; ctx.beginPath(); ctx.moveTo(w * 0.4, h * 0.66)
    ctx.bezierCurveTo(w * 0.30, h * 0.62, w * 0.30, h * 0.42, w * 0.42, h * 0.40)
    ctx.bezierCurveTo(w * 0.54, h * 0.42, w * 0.54, h * 0.62, w * 0.46, h * 0.66); ctx.closePath(); ctx.fill()
    // flowers
    const fc = ["#d2453f", "#e8b54a", "#c76fa0", "#e8e0d0"]
    for (let i = 0; i < 7; i++) { ctx.fillStyle = fc[i % fc.length]; const fx = w * (0.34 + rng() * 0.2); const fy = h * (0.22 + rng() * 0.18); ctx.beginPath(); ctx.arc(fx, fy, 8 + rng() * 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#3c5a2e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(w * 0.43, h * 0.42); ctx.stroke() }
    // fruit
    ctx.fillStyle = "#b5472f"; ctx.beginPath(); ctx.arc(w * 0.62, h * 0.7, 18, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#c8a23a"; ctx.beginPath(); ctx.arc(w * 0.7, h * 0.73, 14, 0, Math.PI * 2); ctx.fill()
  } else if (style === "night") {
    vGradient(ctx, w, 0, h, [[0, "#0b1330"], [0.6, "#1c2a52"], [1, "#33406b"]])
    for (let i = 0; i < 80; i++) { ctx.fillStyle = `rgba(255,255,${200 + rng() * 55},${0.5 + rng() * 0.5})`; ctx.beginPath(); ctx.arc(rng() * w, rng() * h * 0.7, rng() * 1.6, 0, Math.PI * 2); ctx.fill() }
    const mx = w * 0.72, my = h * 0.22
    const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 50); mg.addColorStop(0, "#fff7d8"); mg.addColorStop(1, "rgba(255,247,216,0)")
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 50, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#fdf3c8"; ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = "#0a0f1e"; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.78)
    for (let i = 0; i <= 10; i++) { ctx.lineTo((i / 10) * w, h * 0.78 - Math.abs(Math.sin(i)) * 24) } ctx.lineTo(w, h); ctx.closePath(); ctx.fill()
  } else if (style === "abstract") {
    const pal = ["#c2552f", "#d99a3e", "#6f8a5a", "#3f6079", "#8a3b50", "#e6dcc2", "#6d5b86"]
    ctx.fillStyle = pal[seed % pal.length]; ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 9; i++) { ctx.fillStyle = pal[Math.floor(rng() * pal.length)]; const bx = rng() * w, by = rng() * h, bw = 30 + rng() * (w * 0.4), bh = 20 + rng() * (h * 0.4); ctx.save(); ctx.translate(bx, by); ctx.rotate((rng() - 0.5) * 0.6); ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.restore() }
    ctx.lineWidth = 6; ctx.strokeStyle = "#23201c"
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(rng() * w, rng() * h); ctx.bezierCurveTo(rng() * w, rng() * h, rng() * w, rng() * h, rng() * w, rng() * h); ctx.stroke() }
  } else { // unfinished — left half painted landscape, right half charcoal sketch on raw canvas
    ctx.fillStyle = LINEN; ctx.fillRect(0, 0, w, h)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w * 0.52, h); ctx.clip()
    vGradient(ctx, w, 0, horizon, [[0, "#7fb0d8"], [1, "#dCeaf0"]])
    drawHills(ctx, w, horizon + 16, 30, "#6f8f63", rng)
    vGradient(ctx, w, horizon + 12, h, [[0, "#7a9550"], [1, "#5c7038"]])
    const sx = w * 0.22, sy = horizon * 0.5
    ctx.fillStyle = "#f4d36a"; ctx.beginPath(); ctx.arc(sx, sy, 22, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    // charcoal contour lines on the unpainted side
    ctx.strokeStyle = "rgba(70,60,50,0.7)"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(w * 0.52, horizon); ctx.lineTo(w, horizon - 8); ctx.stroke()
    ctx.beginPath(); ctx.arc(w * 0.78, horizon * 0.55, 18, 0, Math.PI * 2); ctx.stroke()
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w * (0.6 + i * 0.08), horizon); ctx.lineTo(w * (0.62 + i * 0.08), horizon + 30 + i * 8); ctx.stroke() }
    // grid registration ticks
    ctx.strokeStyle = "rgba(120,110,95,0.35)"
    for (let gx = w * 0.55; gx < w; gx += w * 0.12) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke() }
  }

  addBrushNoise(ctx, w, h, rng)
  addCanvasWeave(ctx, w, h)
  addVarnishVignette(ctx, w, h)
}

// Shared cache so identical paintings reuse one GPU texture (we draw many canvases).
const _paintTexCache = new Map<string, THREE.CanvasTexture>()
function usePaintingTexture(style: PaintStyle, seed: number, aspect: number) {
  return useMemo(() => {
    const key = `${style}|${seed}|${aspect.toFixed(3)}`
    const cached = _paintTexCache.get(key)
    if (cached) return cached
    const W = 512
    const H = Math.max(192, Math.round(W / aspect))
    const cv = document.createElement("canvas")
    cv.width = W; cv.height = H
    const ctx = cv.getContext("2d")
    if (ctx) paintScene(ctx, W, H, style, seed)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    _paintTexCache.set(key, tex)
    return tex
  }, [style, seed, aspect])
}

// ════════════════════════════════════════════════════════════════════════════
//  Scene root
// ════════════════════════════════════════════════════════════════════════════

interface Props {
  answerState:      AnswerState
  roomPhase:        RoomPhase
  focusTarget:      FocusTarget | null
  activeObjects:    FocusTarget[]
  completedObjects: Set<FocusTarget>
  onObjectClick:    (t: FocusTarget) => void
  doorUnlocked:     boolean
  onDoorClick:      () => void
  children:         React.ReactNode
}

export default function AtelierScene({
  answerState, roomPhase, focusTarget, activeObjects, completedObjects,
  onObjectClick, doorUnlocked, onDoorClick, children,
}: Props) {
  const camProps =
    roomPhase === "door" ? DOOR_CAM
    : roomPhase === "focused"
      ? (focusTarget === "clock" ? WHEEL_CAM : focusTarget === "book" ? TELE_CAM : EASEL_CAM)
      : EXPLORE_CAM

  const exploring  = roomPhase === "exploring"
  const lerpFactor = roomPhase === "door" ? 0.03 : 0.013

  const easelActive = exploring && !completedObjects.has("board") && activeObjects.includes("board")
  const wheelActive = exploring && !completedObjects.has("clock") && activeObjects.includes("clock")
  const teleActive  = exploring && !completedObjects.has("book")  && activeObjects.includes("book")

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="fixed inset-0 z-0">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.15, powerPreference: "high-performance" }}
          camera={{ fov: 60, near: 0.1, far: 140 }}
          style={{ background: "#dbe6ea" }}
        >
          <Suspense fallback={null}>
            <RoomCamera targetPos={camProps.position} targetLookAt={camProps.lookAt} exploring={exploring} lerpFactor={lerpFactor} />
            <AtelierLighting answerState={answerState} />

            <AtelierShell />
            <AtelierDecor />

            <Easel        active={easelActive} completed={completedObjects.has("board")} onClick={() => onObjectClick("board")} />
            <PottersWheel active={wheelActive} completed={completedObjects.has("clock")} onClick={() => onObjectClick("clock")} />
            <Telescope    active={teleActive}  completed={completedObjects.has("book")}  onClick={() => onObjectClick("book")} />

            <DoorLock unlocked={doorUnlocked} roomPhase={roomPhase} onDoorClick={onDoorClick} />
          </Suspense>
        </Canvas>
      </div>

      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{ background: "radial-gradient(ellipse at center, transparent 62%, rgba(20,16,8,0.3) 100%)" }}
      />

      <div className="pointer-events-none relative z-[2] min-h-screen">
        {children}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Framed / leaning painting using a generated texture
// ════════════════════════════════════════════════════════════════════════════

function Painting({ position, rotation = 0, w = 2.6, h = 2, style = "landscape", seed = 1, framed = true, frameColor = "#caa15a" }: {
  position: [number, number, number]; rotation?: number; w?: number; h?: number
  style?: PaintStyle; seed?: number; framed?: boolean; frameColor?: string
}) {
  const tex = usePaintingTexture(style, seed, w / h)
  const fw = 0.14   // frame border width
  const fd = 0.12   // frame depth (proud of the canvas)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* solid backing board (always behind the art, never occludes it) */}
      <mesh position={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[w, h, 0.06]} />
        <meshStandardMaterial color={framed ? "#3a2c1c" : LINEN} roughness={0.95} />
      </mesh>

      {/* the painted canvas, sitting just in front of the backing */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>

      {/* a real picture frame built from four mitred border bars (no solid box over the art) */}
      {framed && (
        <group>
          <mesh position={[0, h / 2 + fw / 2, 0.02]} castShadow><boxGeometry args={[w + fw * 2, fw, fd]} /><meshStandardMaterial color={frameColor} metalness={0.3} roughness={0.45} /></mesh>
          <mesh position={[0, -h / 2 - fw / 2, 0.02]} castShadow><boxGeometry args={[w + fw * 2, fw, fd]} /><meshStandardMaterial color={frameColor} metalness={0.3} roughness={0.45} /></mesh>
          <mesh position={[-w / 2 - fw / 2, 0, 0.02]} castShadow><boxGeometry args={[fw, h, fd]} /><meshStandardMaterial color={frameColor} metalness={0.3} roughness={0.45} /></mesh>
          <mesh position={[w / 2 + fw / 2, 0, 0.02]} castShadow><boxGeometry args={[fw, h, fd]} /><meshStandardMaterial color={frameColor} metalness={0.3} roughness={0.45} /></mesh>
        </group>
      )}
    </group>
  )
}

/** Freestanding A-frame stand holding a stretched canvas. */
function CanvasStand({ position, rotation = 0, w = 2.2, h = 2.8, style = "landscape", seed = 1 }: {
  position: [number, number, number]; rotation?: number; w?: number; h?: number; style?: PaintStyle; seed?: number
}) {
  const legH = h + 2.1
  const trayY = 1.05
  const canvasY = trayY + h / 2 + 0.08
  const canvasZ = 0.25
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* front legs — set back so they don't cut through the canvas */}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, legH / 2, -0.05]} rotation={[0.05, 0, 0]} castShadow>
          <boxGeometry args={[0.14, legH, 0.18]} />
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </mesh>
      ))}
      {/* rear leg */}
      <mesh position={[0, legH / 2, -0.65]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.14, legH, 0.16]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      {/* cross braces */}
      <mesh position={[0, 0.7, -0.18]}><boxGeometry args={[1.4, 0.12, 0.18]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>
      <mesh position={[0, 2.8, -0.14]}><boxGeometry args={[1.5, 0.12, 0.16]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>
      {/* tray ledge */}
      <mesh position={[0, trayY, 0.12]} castShadow><boxGeometry args={[1.8, 0.14, 0.44]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.55} /></mesh>
      <mesh position={[0, trayY + 0.08, 0.28]}><boxGeometry args={[1.8, 0.12, 0.06]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>
      {/* top clamp */}
      <mesh position={[0, h + 1.7, 0.06]}><boxGeometry args={[1.6, 0.14, 0.1]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>

      {/* canvas */}
      <group position={[0, canvasY, canvasZ]} rotation={[0.05, 0, 0]}>
        <Painting position={[0, 0, 0]} w={w} h={h} style={style} seed={seed} framed={false} />
      </group>
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Room shell — floor, walls, ceiling, big north-light skylight, side window
// ════════════════════════════════════════════════════════════════════════════

function AtelierShell() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={FLOOR_COL} roughness={0.85} metalness={0} />
      </mesh>
      {Array.from({ length: 19 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-ROOM_W / 2 + 1 + i * 2 + 0.05, 0.01, 0]}>
          <planeGeometry args={[0.05, ROOM_D]} />
          <meshBasicMaterial color="#9c7e54" />
        </mesh>
      ))}

      {/* Back wall */}
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh position={[0, 1.4, -ROOM_D / 2 + 0.05]}>
        <planeGeometry args={[ROOM_W, 2.8]} />
        <meshStandardMaterial color={WALL_LOW} roughness={1} />
      </mesh>

      {/* Side walls */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, ROOM_H]} /><meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, ROOM_H]} /><meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh position={[-ROOM_W / 2 + 0.05, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, 2.8]} /><meshStandardMaterial color={WALL_LOW} roughness={1} />
      </mesh>
      <mesh position={[ROOM_W / 2 - 0.05, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, 2.8]} /><meshStandardMaterial color={WALL_LOW} roughness={1} />
      </mesh>

      {/* Skirting + picture rail */}
      <mesh position={[0, 0.18, -ROOM_D / 2 + 0.12]}><boxGeometry args={[ROOM_W, 0.36, 0.18]} /><meshStandardMaterial color="#c4b496" roughness={0.8} /></mesh>
      <mesh position={[-ROOM_W / 2 + 0.12, 0.18, 0]}><boxGeometry args={[0.18, 0.36, ROOM_D]} /><meshStandardMaterial color="#c4b496" roughness={0.8} /></mesh>
      <mesh position={[ROOM_W / 2 - 0.12, 0.18, 0]}><boxGeometry args={[0.18, 0.36, ROOM_D]} /><meshStandardMaterial color="#c4b496" roughness={0.8} /></mesh>
      <mesh position={[0, 8.4, -ROOM_D / 2 + 0.1]}><boxGeometry args={[ROOM_W, 0.12, 0.14]} /><meshStandardMaterial color="#bfae8e" roughness={0.8} /></mesh>

      {/* Ceiling */}
      <mesh position={[0, ROOM_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} /><meshStandardMaterial color="#efe9da" roughness={1} />
      </mesh>

      {/* North-light skylight */}
      <group position={[3, ROOM_H - 0.05, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[10, 7]} /><meshBasicMaterial color="#eaf4fc" side={THREE.DoubleSide} /></mesh>
        {[-3.3, 0, 3.3].map((x) => (<mesh key={`v${x}`} position={[x, -0.06, 0]}><boxGeometry args={[0.12, 0.16, 7]} /><meshStandardMaterial color={WOOD_DARK} /></mesh>))}
        {[-2, 2].map((z) => (<mesh key={`h${z}`} position={[0, -0.06, z]}><boxGeometry args={[10, 0.16, 0.12]} /><meshStandardMaterial color={WOOD_DARK} /></mesh>))}
        <mesh position={[0, -0.1, 0]}><boxGeometry args={[10.5, 0.2, 7.5]} /><meshStandardMaterial color={WOOD} roughness={0.8} /></mesh>
      </group>

      {/* Tall side window (extra cool light for the telescope corner) */}
      <group position={[ROOM_W / 2 - 0.1, 6, -6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh><planeGeometry args={[4.4, 5]} /><meshBasicMaterial color="#d6e8f4" /></mesh>
        {[-1.1, 0, 1.1].map((x) => (<mesh key={x} position={[x, 0, 0.03]}><boxGeometry args={[0.1, 5, 0.06]} /><meshStandardMaterial color="#e6dcc6" /></mesh>))}
        {[-1.2, 1.2].map((y) => (<mesh key={y} position={[0, y, 0.03]}><boxGeometry args={[4.4, 0.1, 0.06]} /><meshStandardMaterial color="#e6dcc6" /></mesh>))}
        <mesh position={[0, 0, -0.05]}><boxGeometry args={[4.8, 5.4, 0.16]} /><meshStandardMaterial color="#d2c4ac" roughness={0.8} /></mesh>
      </group>
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  STUBS — filled in by subsequent edits
// ════════════════════════════════════════════════════════════════════════════

/** Small paint pot with visible pigment and a few drips. */
function PaintPot({ position, color = "#b5472f", size = 1 }: { position: [number, number, number]; color?: string; size?: number }) {
  return (
    <group position={position} scale={size}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.32, 18]} />
        <meshStandardMaterial color="#d9d1c2" roughness={0.6} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.04, 18]} />
        <meshStandardMaterial color="#efe7d9" roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <circleGeometry args={[0.16, 18]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.06, 0.18]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.08, 0.18, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0.08, -0.02, 0.17]} rotation={[0.15, 0.3, 0]}>
        <boxGeometry args={[0.05, 0.12, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Wheeled artist taboret with paint tubes, brushes and a palette. */
function Taboret({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const tubes = ["#b5472f", "#c8a23a", "#3f6079", "#6f8a5a", "#8a3b50", "#d9d2c2"]
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow><boxGeometry args={[1.6, 0.1, 1.0]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.5} /></mesh>
      <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[1.5, 0.9, 0.95]} /><meshStandardMaterial color={WOOD} roughness={0.55} /></mesh>
      {/* two drawers */}
      <mesh position={[0, 1.2, 0.49]}><boxGeometry args={[1.4, 0.34, 0.02]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.5} /></mesh>
      <mesh position={[0, 0.82, 0.49]}><boxGeometry args={[1.4, 0.34, 0.02]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.5} /></mesh>
      {[1.2, 0.82].map((y, i) => (<mesh key={i} position={[0, y, 0.51]}><sphereGeometry args={[0.04, 10, 10]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} /></mesh>))}
      {/* castors */}
      {[[-0.65, -0.4], [0.65, -0.4], [-0.65, 0.4], [0.65, 0.4]].map(([x, z], i) => (<mesh key={i} position={[x, 0.5, z]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color={METAL_DARK} metalness={0.5} roughness={0.5} /></mesh>))}
      {/* paint tubes scattered on top */}
      {tubes.map((c, i) => (
        <group key={i} position={[-0.55 + i * 0.2, 1.58, -0.2 + (i % 2) * 0.1]} rotation={[Math.PI / 2, 0, i * 0.7]}>
          <mesh><cylinderGeometry args={[0.05, 0.05, 0.3, 12]} /><meshStandardMaterial color="#d7d2c8" metalness={0.3} roughness={0.5} /></mesh>
          <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.03, 0.03, 0.06, 10]} /><meshStandardMaterial color={c} roughness={0.4} /></mesh>
        </group>
      ))}
      {/* a brush jar */}
      <group position={[0.5, 1.55, 0.25]}>
        <mesh><cylinderGeometry args={[0.13, 0.11, 0.34, 14]} /><meshStandardMaterial color="#cfe0e6" transparent opacity={0.45} roughness={0.1} /></mesh>
        {["#b5472f", "#3f6079", "#6f8a5a", "#c8a23a"].map((c, i) => (
          <group key={i} rotation={[0.1 * (i - 2), i * 1.4, 0.1]}>
            <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.015, 0.015, 0.7, 6]} /><meshStandardMaterial color={WOOD} roughness={0.6} /></mesh>
            <mesh position={[0, 0.74, 0]}><cylinderGeometry args={[0.022, 0.016, 0.12, 6]} /><meshStandardMaterial color={c} roughness={0.5} /></mesh>
          </group>
        ))}
      </group>
      <PaintPot position={[-0.4, 1.6, 0.28]} size={0.75} color="#b5472f" />
      <PaintPot position={[0.1, 1.6, -0.25]} size={0.7} color="#3f6079" />
    </group>
  )
}

/** A draped still-life table with a vase, fruit and a book. */
function StillLifeTable({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* draped cloth over a box */}
      <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[2.4, 1.6, 1.6]} /><meshStandardMaterial color="#8a3b50" roughness={0.9} /></mesh>
      <mesh position={[0, 1.62, 0]}><boxGeometry args={[2.6, 0.1, 1.8]} /><meshStandardMaterial color="#9c4760" roughness={0.9} /></mesh>
      <mesh position={[0, 1.0, 0.85]} rotation={[0.2, 0, 0]}><planeGeometry args={[2.5, 1.4]} /><meshStandardMaterial color="#7d3247" roughness={0.95} side={THREE.DoubleSide} /></mesh>
      {/* ceramic vase */}
      <group position={[-0.4, 1.67, 0]}>
        <mesh castShadow><sphereGeometry args={[0.32, 20, 20]} /><meshStandardMaterial color="#23506b" roughness={0.35} metalness={0.1} /></mesh>
        <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.12, 0.2, 0.34, 16]} /><meshStandardMaterial color="#2b5e7d" roughness={0.35} /></mesh>
        {/* branches */}
        {[-0.3, 0, 0.35].map((a, i) => (<mesh key={i} position={[Math.sin(a) * 0.1, 0.6, 0]} rotation={[a, 0, a * 1.2]}><cylinderGeometry args={[0.01, 0.015, 0.7, 6]} /><meshStandardMaterial color="#5a4322" roughness={0.8} /></mesh>))}
      </group>
      {/* fruit */}
      <mesh position={[0.5, 1.78, 0.2]} castShadow><sphereGeometry args={[0.16, 16, 16]} /><meshStandardMaterial color="#b5472f" roughness={0.5} /></mesh>
      <mesh position={[0.72, 1.76, -0.1]} castShadow><sphereGeometry args={[0.13, 16, 16]} /><meshStandardMaterial color="#c8a23a" roughness={0.5} /></mesh>
      <mesh position={[0.34, 1.74, -0.25]} castShadow><sphereGeometry args={[0.12, 16, 16]} /><meshStandardMaterial color="#7d8c4a" roughness={0.5} /></mesh>
      {/* an old book */}
      <mesh position={[0.2, 1.7, 0.5]} rotation={[0, 0.3, 0]} castShadow><boxGeometry args={[0.5, 0.1, 0.36]} /><meshStandardMaterial color="#5a4322" roughness={0.7} /></mesh>
    </group>
  )
}

/** Several finished canvases leaning in a stack against a wall. */
function CanvasStack({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const styles: PaintStyle[] = ["sunset", "seascape", "abstract", "landscape"]
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {styles.map((s, i) => {
        const w = 2.0 + (i % 2) * 0.4, h = 2.6 - (i % 2) * 0.4
        // Space the canvases well apart in depth so frames never overlap/z-fight,
        // and give each a slightly different lean + sideways shuffle (real stack).
        const lean = -0.13 - i * 0.015
        return (
          <group key={i} position={[i * 0.22, 0, i * 0.34]} rotation={[0, (i % 2 ? 0.06 : -0.05), 0]}>
            <group position={[0, h / 2, 0]} rotation={[lean, 0, 0]}>
              <Painting position={[0, 0, 0]} w={w} h={h} style={s} seed={20 + i * 5} framed={i % 2 === 0} />
            </group>
          </group>
        )
      })}
    </group>
  )
}

/** A potted plant (terracotta pot, simple foliage). */
function PottedPlant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.38, 0]} castShadow><cylinderGeometry args={[0.42, 0.3, 0.76, 18]} /><meshStandardMaterial color="#b06a3f" roughness={0.7} /></mesh>
      <mesh position={[0, 0.74, 0]}><cylinderGeometry args={[0.44, 0.42, 0.1, 18]} /><meshStandardMaterial color="#9c5a34" roughness={0.7} /></mesh>
      <mesh position={[0, 0.78, 0]}><cylinderGeometry args={[0.38, 0.38, 0.06, 16]} /><meshStandardMaterial color="#4a3322" roughness={1} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.3) * 0.16, 1.2 + (i % 3) * 0.28, Math.sin(i * 1.3) * 0.16]} rotation={[0.3, i, 0.4]}>
          <coneGeometry args={[0.13, 0.95, 5]} /><meshStandardMaterial color={i % 2 ? "#4f7339" : "#5f8a47"} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/** A three-legged studio stool. */
function Stool({ position }: { position: [number, number, number] }) {
  const seatY = 1.1
  const legH = 1.1
  const legOffset = 0.36
  return (
    <group position={position}>
      {/* thick round seat */}
      <mesh position={[0, seatY, 0]} castShadow><cylinderGeometry args={[0.52, 0.52, 0.14, 20]} /><meshStandardMaterial color={WOOD} roughness={0.6} /></mesh>
      <mesh position={[0, seatY - 0.08, 0]}><cylinderGeometry args={[0.46, 0.46, 0.06, 20]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.65} /></mesh>

      {/* four sturdy legs */}
      {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
        <mesh
          key={`${sx}-${sz}`}
          position={[sx * legOffset, legH / 2, sz * legOffset]}
          rotation={[sx * 0.08, 0, -sz * 0.08]}
          castShadow
        >
          <boxGeometry args={[0.08, legH, 0.08]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
      )))}

      {/* stretchers */}
      <mesh position={[0, 0.45, legOffset]}><boxGeometry args={[legOffset * 2, 0.05, 0.05]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.65} /></mesh>
      <mesh position={[0, 0.45, -legOffset]}><boxGeometry args={[legOffset * 2, 0.05, 0.05]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.65} /></mesh>
      <mesh position={[legOffset, 0.45, 0]}><boxGeometry args={[0.05, 0.05, legOffset * 2]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.65} /></mesh>
      <mesh position={[-legOffset, 0.45, 0]}><boxGeometry args={[0.05, 0.05, legOffset * 2]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.65} /></mesh>
    </group>
  )
}

/** Sturdy wooden workbench with a few studio tools. */
function Workbench({ position, rotation = 0, width = 4.8, depth = 1.9 }: {
  position: [number, number, number]; rotation?: number; width?: number; depth?: number
}) {
  const topY = 1.05
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, topY, 0]} castShadow><boxGeometry args={[width, 0.16, depth]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.6} /></mesh>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[width - 0.5, 0.1, depth - 0.3]} /><meshStandardMaterial color={WOOD} roughness={0.7} /></mesh>
      {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
        <mesh key={`${sx}-${sz}`} position={[sx * (width / 2 - 0.2), 0.55, sz * (depth / 2 - 0.2)]} castShadow>
          <boxGeometry args={[0.16, 1.1, 0.16]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.65} />
        </mesh>
      )))}
      <mesh position={[0, 0.3, depth / 2 - 0.1]}><boxGeometry args={[width - 0.6, 0.08, 0.08]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.65} /></mesh>
      <mesh position={[0, 0.3, -depth / 2 + 0.1]}><boxGeometry args={[width - 0.6, 0.08, 0.08]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.65} /></mesh>
      <mesh position={[-0.6, 0.85, depth / 2 - 0.06]}><boxGeometry args={[1.2, 0.26, 0.04]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>
      <mesh position={[-0.2, 0.9, depth / 2 - 0.02]}><sphereGeometry args={[0.04, 10, 10]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} /></mesh>

      <PaintPot position={[-0.9, topY + 0.12, 0.3]} size={0.85} color="#b5472f" />
      <PaintPot position={[0.2, topY + 0.12, -0.35]} size={0.8} color="#3f6079" />
      <PaintPot position={[1.0, topY + 0.12, 0.1]} size={0.7} color="#6f8a5a" />
      <mesh position={[0.6, topY + 0.05, -0.55]} rotation={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.04, 18]} />
        <meshStandardMaterial color="#9c7548" roughness={0.55} />
      </mesh>
      {["#b5472f", "#c8a23a", "#3f6079", "#6f8a5a", "#e6dcc2", "#8a3b50"].map((c, i) => {
        const a = (i / 6) * Math.PI * 1.4 - 0.7
        return (
          <mesh key={c} position={[0.6 + Math.cos(a) * 0.22, topY + 0.07, -0.55 + Math.sin(a) * 0.22]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshStandardMaterial color={c} roughness={0.35} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Low storage cabinet with drawers for supplies. */
function StorageCabinet({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[2.2, 1.6, 0.8]} /><meshStandardMaterial color={WOOD} roughness={0.7} /></mesh>
      <mesh position={[0, 1.75, 0]} castShadow><boxGeometry args={[2.4, 0.16, 0.9]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.6} /></mesh>
      {([0.35, 0.9, 1.35] as const).map((y, i) => (
        <group key={i}>
          <mesh position={[0, y, 0.41]}><boxGeometry args={[2.0, 0.38, 0.02]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>
          {[-0.7, 0.7].map((x) => (
            <mesh key={x} position={[x, y, 0.44]}><sphereGeometry args={[0.05, 10, 10]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} /></mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.1, 0]}><boxGeometry args={[2.3, 0.2, 0.9]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.7} /></mesh>
      <PaintPot position={[-0.6, 1.9, 0.1]} size={0.8} color="#3f6079" />
      <PaintPot position={[0.2, 1.9, -0.2]} size={0.7} color="#c8a23a" />
      <PaintPot position={[0.8, 1.9, 0.18]} size={0.7} color="#b5472f" />
    </group>
  )
}

/** A wall shelf displaying finished ceramic pots (drying / on show). */
function PotteryShelf({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const pots = [
    { x: -1.4, c: TERRA,     r: 0.24, h: 0.55 },
    { x: -0.9, c: "#cdbb9a", r: 0.18, h: 0.36 },
    { x: -0.2, c: "#3a6e7d", r: 0.28, h: 0.62 },
    { x: 0.55, c: "#9c5e3c", r: 0.18, h: 0.46 },
    { x: 1.1,  c: "#7d8c6a", r: 0.2,  h: 0.34 },
    { x: 1.5,  c: "#c27b4d", r: 0.15, h: 0.32 },
  ]
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* two timber shelf planks on brackets */}
      {[0, 1.1].map((y, i) => (
        <group key={i}>
          <mesh position={[0, y, 0]} castShadow><boxGeometry args={[3.4, 0.1, 0.6]} /><meshStandardMaterial color={WOOD} roughness={0.6} /></mesh>
          {[-1.5, 1.5].map((x) => (<mesh key={x} position={[x, y - 0.2, -0.18]} rotation={[0.6, 0, 0]}><boxGeometry args={[0.08, 0.5, 0.08]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>))}
        </group>
      ))}
      {/* pots on the lower shelf */}
      {pots.map((p, i) => (
        <group key={i} position={[p.x, 0.14 + p.h / 2, 0.06]}>
          <mesh castShadow><cylinderGeometry args={[p.r * 0.72, p.r, p.h, 20]} /><meshStandardMaterial color={p.c} roughness={0.55} metalness={0.05} /></mesh>
          <mesh position={[0, p.h / 2 - 0.02, 0]}><torusGeometry args={[p.r * 0.72, 0.02, 8, 20]} /><meshStandardMaterial color={p.c} roughness={0.5} /></mesh>
          <mesh position={[0, -p.h / 2 + 0.04, 0]}><torusGeometry args={[p.r * 0.42, 0.02, 8, 20]} /><meshStandardMaterial color={p.c} roughness={0.55} /></mesh>
        </group>
      ))}
      {/* a couple of bowls/mugs on the upper shelf */}
      <mesh position={[-0.8, 1.28, 0]} castShadow><cylinderGeometry args={[0.26, 0.18, 0.2, 20]} /><meshStandardMaterial color="#b8743f" roughness={0.55} /></mesh>
      <mesh position={[0.5, 1.32, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 0.28, 18]} /><meshStandardMaterial color="#cdbb9a" roughness={0.55} /></mesh>
      <mesh position={[0.5, 1.32, 0.16]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.09, 0.02, 8, 16]} /><meshStandardMaterial color="#cdbb9a" roughness={0.55} /></mesh>
      <mesh position={[1.05, 1.34, 0]} castShadow><cylinderGeometry args={[0.12, 0.18, 0.34, 18]} /><meshStandardMaterial color="#7d8c6a" roughness={0.55} /></mesh>
      <mesh position={[-0.1, 1.38, 0]} castShadow><cylinderGeometry args={[0.1, 0.14, 0.48, 18]} /><meshStandardMaterial color="#3a6e7d" roughness={0.55} /></mesh>
    </group>
  )
}

/** A paint-splattered canvas drop cloth on the floor. */
function DropCloth({ position }: { position: [number, number, number] }) {
  const splats = [[-1.2, 0.6, "#b5472f"], [0.8, -0.5, "#3f6079"], [1.4, 0.9, "#c8a23a"], [-0.6, -1.0, "#6f8a5a"], [0.2, 0.3, "#8a3b50"]] as const
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0.06]} position={[0, 0.02, 0]}><planeGeometry args={[5.5, 4.5]} /><meshStandardMaterial color="#d9cdb2" roughness={0.98} /></mesh>
      {splats.map(([x, z, c], i) => (<mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, z]}><circleGeometry args={[0.3 + (i % 3) * 0.12, 14]} /><meshBasicMaterial color={c} transparent opacity={0.7} depthWrite={false} /></mesh>))}
    </group>
  )
}

function PaintSpill({ position, color = "#b5472f", scale = 1 }: { position: [number, number, number]; color?: string; scale?: number }) {
  const blobs = [
    { x: -0.2, z: 0.15, r: 0.26, o: 0.7 },
    { x: 0.25, z: -0.05, r: 0.18, o: 0.65 },
    { x: 0.5, z: 0.2, r: 0.12, o: 0.6 },
  ]
  return (
    <group position={position} scale={scale}>
      {blobs.map((b, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[b.x, 0.02, b.z]}>
          <circleGeometry args={[b.r, 14]} />
          <meshBasicMaterial color={color} transparent opacity={b.o} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function ClaySack({ position, rotation = 0, scale = 1 }: { position: [number, number, number]; rotation?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.9, 0.35, 0.55]} />
        <meshStandardMaterial color="#d8c98a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.42, 0]}><boxGeometry args={[0.6, 0.08, 0.36]} /><meshStandardMaterial color="#cbb981" roughness={0.95} /></mesh>
    </group>
  )
}

function WallSplatter({ position, rotation = [0, 0, 0], scale = 1, color = "#b5472f" }: {
  position: [number, number, number]; rotation?: [number, number, number]; scale?: number; color?: string
}) {
  const splats = [
    { x: -0.4, y: 0.2, r: 0.35, o: 0.75 },
    { x: 0.25, y: -0.1, r: 0.22, o: 0.7 },
    { x: 0.55, y: 0.4, r: 0.18, o: 0.6 },
    { x: -0.15, y: -0.35, r: 0.14, o: 0.55 },
  ]
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {splats.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, 0.02]}>
          <circleGeometry args={[s.r, 16]} />
          <meshStandardMaterial color={color} transparent opacity={s.o} roughness={0.85} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0.2, -0.7, 0.02]} rotation={[0, 0, 0.1]}>
        <planeGeometry args={[0.08, 0.5]} />
        <meshStandardMaterial color={color} transparent opacity={0.6} roughness={0.85} depthWrite={false} />
      </mesh>
    </group>
  )
}

function AtelierDecor() {
  const stands: { pos: [number, number, number]; rot: number; style: PaintStyle; seed: number; w: number; h: number }[] = [
    { pos: [-18, 0, -11], rot: 0.32, style: "landscape", seed: 21, w: 2.2, h: 2.9 },
    { pos: [-18, 0, -3],  rot: 0.18, style: "abstract",  seed: 22, w: 2.0, h: 2.6 },
    { pos: [-18, 0, 6],   rot: 0.1,  style: "stilllife", seed: 23, w: 2.1, h: 2.7 },
    { pos: [-16, 0, 12],  rot: -0.15, style: "sunset",   seed: 24, w: 2.2, h: 2.9 },
    { pos: [-8, 0, -12],  rot: 0.1,  style: "night",     seed: 25, w: 2.0, h: 2.6 },
    { pos: [8, 0, -12],   rot: -0.12, style: "seascape", seed: 26, w: 2.3, h: 2.7 },
    { pos: [18, 0, -9],   rot: -1.15, style: "landscape", seed: 27, w: 2.1, h: 2.8 },
    { pos: [18, 0, -1],   rot: -1.05, style: "abstract", seed: 28, w: 2.2, h: 2.6 },
    { pos: [18, 0, 7],    rot: -1.25, style: "sunset",   seed: 29, w: 2.0, h: 2.5 },
    { pos: [12, 0, 12],   rot: -0.45, style: "stilllife", seed: 30, w: 2.2, h: 2.7 },
  ]

  return (
    <group>
      {/* salon-hung framed paintings on the walls */}
      <Painting position={[-ROOM_W / 2 + 0.18, 6.4, -4]} rotation={Math.PI / 2} w={3.0} h={2.2} style="landscape" seed={2} />
      <Painting position={[-ROOM_W / 2 + 0.18, 3.9, -7.5]} rotation={Math.PI / 2} w={2.0} h={2.6} style="stilllife" seed={5} />
      <Painting position={[-ROOM_W / 2 + 0.18, 6.6, 9]} rotation={Math.PI / 2} w={2.4} h={1.8} style="seascape" seed={9} />
      <Painting position={[-5, 7.0, -ROOM_D / 2 + 0.18]} rotation={0} w={3.2} h={2.3} style="sunset" seed={3} />
      <Painting position={[8, 7.2, -ROOM_D / 2 + 0.18]} rotation={0} w={2.2} h={2.8} style="night" seed={11} />
      <Painting position={[ROOM_W / 2 - 0.18, 7.0, 4]} rotation={-Math.PI / 2} w={2.6} h={2.0} style="abstract" seed={6} />

      {/* canvases leaning against the walls (atelier hallmark) */}
      <CanvasStack position={[-16, 0, -2]} rotation={0.3} />
      <CanvasStack position={[6, 0, -13]} rotation={-0.2} />
      <CanvasStack position={[17, 0, 4]} rotation={-1.1} />

      {/* freestanding stands everywhere for the classroom feel */}
      {stands.map((s, i) => (
        <CanvasStand key={i} position={s.pos} rotation={s.rot} w={s.w} h={s.h} style={s.style} seed={s.seed} />
      ))}

      {/* a shelf of finished student pottery on the back wall */}
      <PotteryShelf position={[9, 4.2, -ROOM_D / 2 + 0.4]} rotation={0} />

      {/* extra potter stations */}
      <PottersWheel active={false} completed={false} onClick={() => {}} position={[-14, 0, -9]} />
      <PottersWheel active={false} completed={false} onClick={() => {}} position={[10.5, 0, 9]} />
      <ClaySack position={[-12.6, 0, -7.8]} rotation={0.2} scale={1.1} />
      <ClaySack position={[-2.2, 0, 6.4]} rotation={-0.4} scale={0.9} />

      {/* storage cabinet (replaces the white pedestal) */}
      <StorageCabinet position={[-9, 0, -6]} rotation={0.25} />

      {/* still-life corner */}
      <StillLifeTable position={[15, 0, 9]} rotation={-0.5} />
      <Stool position={[12.5, 0, 10.5]} />

      {/* taboret beside the easel */}
      <Taboret position={[-14.5, 0, 3.2]} rotation={0.4} />

      {/* a workbench with paint pots */}
      <Workbench position={[15.5, 0, -8.5]} rotation={-Math.PI / 2} />

      {/* a stool to throw clay / sit at the easel */}
      <Stool position={[-3, 0, 8.4]} />
      <Stool position={[16, 0, 1]} />
      {/* a little cluster of pupils' stools — the "klas" feel */}
      <Stool position={[1.5, 0, 9.5]} />
      <Stool position={[4, 0, 8]} />
      <Stool position={[-6.5, 0, 10]} />

      {/* plants */}
      <PottedPlant position={[-17.5, 0, 12]} scale={1.3} />
      <PottedPlant position={[17.5, 0, -11]} scale={1.1} />

      {/* worn drop cloth grounding the centre */}
      <DropCloth position={[-3, 0, 6]} />
      <DropCloth position={[-13.5, 0, -7.5]} />

      {/* loose paint pots around the studio */}
      <PaintPot position={[-2, 0.1, 7.2]} size={0.9} color="#8a3b50" />
      <PaintPot position={[-1.2, 0.1, 6.2]} size={0.8} color="#c8a23a" />
      <PaintPot position={[-4.6, 0.1, 6.4]} size={0.85} color="#3f6079" />
      <PaintPot position={[8.6, 0.1, 7.8]} size={0.8} color="#6f8a5a" />
      <PaintPot position={[11.2, 0.1, -6.6]} size={0.9} color="#b5472f" />
      <PaintSpill position={[13.8, 0, -7.6]} color="#3f6079" scale={1.1} />
      <PaintSpill position={[-1.5, 0, 5.2]} color="#b5472f" scale={0.9} />

      {/* paint-splattered walls */}
      <WallSplatter position={[-10, 4.6, -ROOM_D / 2 + 0.14]} color="#b5472f" scale={1.2} />
      <WallSplatter position={[9, 3.3, -ROOM_D / 2 + 0.14]} color="#3f6079" scale={1.0} />
      <WallSplatter position={[13, 5.4, -ROOM_D / 2 + 0.14]} color="#c8a23a" scale={0.9} />
      <WallSplatter position={[-ROOM_W / 2 + 0.14, 4.2, 6]} rotation={[0, Math.PI / 2, 0]} color="#8a3b50" scale={1.1} />
      <WallSplatter position={[-ROOM_W / 2 + 0.14, 2.2, -5]} rotation={[0, Math.PI / 2, 0]} color="#6f8a5a" scale={0.9} />
      <WallSplatter position={[ROOM_W / 2 - 0.14, 3.6, -3]} rotation={[0, -Math.PI / 2, 0]} color="#3f6079" scale={1.0} />
      <WallSplatter position={[ROOM_W / 2 - 0.14, 5.8, 8]} rotation={[0, -Math.PI / 2, 0]} color="#b5472f" scale={0.8} />
    </group>
  )
}

interface InteractiveProps { active: boolean; completed: boolean; onClick: () => void }

function Easel({ active, completed, onClick }: InteractiveProps) {
  const [hovered, setHovered] = useState(false)
  const hoverP = useRef(0)
  const glowMats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const lightRef = useRef<THREE.PointLight>(null!)
  const tex = usePaintingTexture("unfinished", 7, 1.18)

  useEffect(() => { if (!active) document.body.style.cursor = "auto" }, [active])
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    hoverP.current = THREE.MathUtils.damp(hoverP.current, hovered ? 1 : 0, 8, delta)
    const eint = glowEmissive(t, active, completed, hoverP.current)
    for (const m of glowMats.current) { if (m) m.emissiveIntensity = eint }
    if (lightRef.current) lightRef.current.intensity = glowLight(t, active, completed, hoverP.current)
  })

  // H-frame studio easel: two front masts joined by rails, a splayed back leg,
  // a forward canvas tray, an adjustable top clamp and a side crank. Canvas faces +z.
  const mast = (x: number, gi: number) => (
    <mesh position={[x, 3.0, 0]} castShadow>
      <boxGeometry args={[0.18, 6.0, 0.16]} />
      <meshStandardMaterial ref={(m) => { glowMats.current[gi] = m }} color={WOOD} emissive={GLOW_COLOR} emissiveIntensity={0} roughness={0.55} metalness={0.05} toneMapped={false} />
    </mesh>
  )

  return (
    <group position={EASEL_POS}>
      <pointLight ref={lightRef} position={[0, 4, 1.6]} color={GLOW_COLOR} intensity={0} distance={9} decay={2} />

      {/* feet */}
      <mesh position={[-0.6, 0.08, 0.5]} castShadow><boxGeometry args={[0.5, 0.16, 1.6]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>
      <mesh position={[0.6, 0.08, 0.5]} castShadow><boxGeometry args={[0.5, 0.16, 1.6]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>

      {/* two front masts + rails */}
      {mast(-0.6, 0)}
      {mast(0.6, 1)}
      <mesh position={[0, 5.6, 0]}><boxGeometry args={[1.5, 0.16, 0.16]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[1.5, 0.14, 0.14]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>

      {/* forward canvas tray (the ledge the painting rests on) */}
      <mesh position={[0, 2.55, 0.34]} castShadow>
        <boxGeometry args={[1.7, 0.16, 0.5]} />
        <meshStandardMaterial ref={(m) => { glowMats.current[2] = m }} color={WOOD_LIGHT} emissive={GLOW_COLOR} emissiveIntensity={0} roughness={0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.7, 0.57]}><boxGeometry args={[1.7, 0.18, 0.05]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>

      {/* adjustable top clamp bar + knobs */}
      <mesh position={[0, 5.05, 0.18]}><boxGeometry args={[1.5, 0.16, 0.1]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>
      {[-0.55, 0.55].map((x) => (<mesh key={x} position={[x, 5.05, 0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 0.12, 12]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>))}

      {/* side crank wheel */}
      <group position={[0.78, 3.3, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.06, 18]} /><meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.35} /></mesh>
        <mesh position={[0.18, -0.1, 0]}><cylinderGeometry args={[0.03, 0.03, 0.18, 10]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.5} /></mesh>
      </group>

      {/* splayed back leg */}
      <mesh position={[0, 3.0, -1.0]} rotation={[0.32, 0, 0]} castShadow><boxGeometry args={[0.16, 6.2, 0.16]} /><meshStandardMaterial color={WOOD} roughness={0.55} /></mesh>
      <mesh position={[0, 1.0, -0.5]} rotation={[0.5, 0, 0]}><boxGeometry args={[0.1, 0.1, 1.3]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>

      {/* the in-progress painting resting on the tray, leaning back slightly */}
      <group position={[0, 4.0, 0.28]} rotation={[0.06, 0, 0]}>
        <mesh position={[0, 0, -0.05]} castShadow><boxGeometry args={[2.5, 3.0, 0.08]} /><meshStandardMaterial color={LINEN} roughness={0.95} /></mesh>
        <mesh position={[0, 0, 0.01]}><planeGeometry args={[2.34, 2.84]} /><meshStandardMaterial map={tex} roughness={0.92} /></mesh>
      </group>

      {/* a wooden palette hung on the front mast */}
      <group position={[-0.95, 2.1, 0.5]} rotation={[1.2, 0.2, 0.3]}>
        <mesh><cylinderGeometry args={[0.46, 0.46, 0.03, 22]} /><meshStandardMaterial color="#9c7548" roughness={0.5} /></mesh>
        {["#b5472f", "#c8a23a", "#3f6079", "#6f8a5a", "#e6dcc2", "#8a3b50"].map((c, i) => {
          const a = (i / 6) * Math.PI * 1.4 - 0.7
          return <mesh key={i} position={[Math.cos(a) * 0.28, 0.025, Math.sin(a) * 0.28]}><sphereGeometry args={[0.06, 10, 10]} /><meshStandardMaterial color={c} roughness={0.35} /></mesh>
        })}
      </group>

      {active && (
        <mesh position={[0, 4, 0.5]} onClick={(e) => { e.stopPropagation(); onClick() }}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer" }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto" }}>
          <boxGeometry args={[2.8, 5.4, 1.6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
function PottersWheel({ active, completed, onClick, position = WHEEL_POS }: InteractiveProps & { position?: [number, number, number] }) {
  const [hovered, setHovered] = useState(false)
  const hoverP = useRef(0)
  const glowMats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const lightRef = useRef<THREE.PointLight>(null!)

  useEffect(() => { if (!active) document.body.style.cursor = "auto" }, [active])
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    hoverP.current = THREE.MathUtils.damp(hoverP.current, hovered ? 1 : 0, 8, delta)
    const eint = glowEmissive(t, active, completed, hoverP.current)
    for (const m of glowMats.current) { if (m) m.emissiveIntensity = eint }
    if (lightRef.current) lightRef.current.intensity = glowLight(t, active, completed, hoverP.current)
  })

  const clayProfile = useMemo(() => ([
    new THREE.Vector2(0.02, 0.0),
    new THREE.Vector2(0.16, 0.02),
    new THREE.Vector2(0.34, 0.12),
    new THREE.Vector2(0.38, 0.32),
    new THREE.Vector2(0.32, 0.5),
    new THREE.Vector2(0.22, 0.6),
    new THREE.Vector2(0.1, 0.64),
    new THREE.Vector2(0.02, 0.6),
  ]), [])

  // Realistic electric wheel (Shimpo/Brent style): painted steel frame on tubular
  // legs, a moulded two-piece splash pan, a metal wheel head with a bat + clay,
  // a motor housing below and a foot pedal on the floor.
  return (
    <group position={position}>
      <pointLight ref={lightRef} position={[0, 1.6, 1.2]} color={GLOW_COLOR} intensity={0} distance={7} decay={2} />

      {/* frame top plate */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.7, 0.14, 1.5]} />
        <meshStandardMaterial ref={(m) => { glowMats.current[0] = m }} color="#34618a" emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.4} roughness={0.45} toneMapped={false} />
      </mesh>
      {/* tubular legs */}
      {[[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.55, z]} castShadow><cylinderGeometry args={[0.07, 0.07, 1.1, 12]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>
      ))}
      {/* leg cross-braces */}
      <mesh position={[0, 0.3, -0.6]}><boxGeometry args={[1.4, 0.06, 0.06]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0.3, 0.6]}><boxGeometry args={[1.4, 0.06, 0.06]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>

      {/* motor housing under the plate */}
      <mesh position={[0, 0.78, -0.35]} castShadow><boxGeometry args={[0.7, 0.4, 0.5]} /><meshStandardMaterial color="#2b2f35" metalness={0.5} roughness={0.5} /></mesh>

      {/* two-piece splash pan */}
      <mesh position={[0, 1.32, 0]}><cylinderGeometry args={[0.95, 0.9, 0.34, 32, 1, true]} /><meshStandardMaterial color="#cfd2d6" metalness={0.1} roughness={0.6} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 1.49, 0]}><torusGeometry args={[0.92, 0.05, 12, 32]} /><meshStandardMaterial color="#b6bac0" roughness={0.5} /></mesh>
      <mesh position={[0, 1.17, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.34, 0.95, 32]} /><meshStandardMaterial color="#c4c8cd" roughness={0.6} side={THREE.DoubleSide} /></mesh>

      {/* metal wheel head */}
      <mesh position={[0, 1.36, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.06, 28]} />
        <meshStandardMaterial ref={(m) => { glowMats.current[1] = m }} color="#aab0b8" emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.7} roughness={0.3} toneMapped={false} />
      </mesh>
      {/* concentric centring rings on the head */}
      {[0.12, 0.22, 0.3].map((r, i) => (<mesh key={i} position={[0, 1.4, 0]}><torusGeometry args={[r, 0.005, 6, 28]} /><meshStandardMaterial color="#7d838b" metalness={0.6} roughness={0.4} /></mesh>))}

      {/* clay being thrown — a single lathe form to avoid z-fighting */}
      <group position={[0, 1.4, 0]}>
        <mesh castShadow>
          <latheGeometry args={[clayProfile, 32]} />
          <meshStandardMaterial color={TERRA} roughness={0.9} />
        </mesh>
      </group>

      {/* foot pedal + cord */}
      <mesh position={[0.9, 0.06, 0.9]} rotation={[0, -0.4, 0.04]} castShadow><boxGeometry args={[0.6, 0.1, 0.36]} /><meshStandardMaterial color="#2b2f35" metalness={0.4} roughness={0.6} /></mesh>
      <mesh position={[0.55, 0.05, 0.6]}><boxGeometry args={[0.5, 0.03, 0.04]} /><meshStandardMaterial color="#1c1e22" roughness={0.8} /></mesh>

      {/* water bucket + sponge + a rib tool on a stool beside */}
      <group position={[1.55, 0, 0.3]}>
        <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.3, 0.26, 0.8, 18]} /><meshStandardMaterial color="#7d8c6a" roughness={0.6} /></mesh>
        <mesh position={[0, 0.78, 0]}><cylinderGeometry args={[0.27, 0.27, 0.03, 18]} /><meshStandardMaterial color="#3a5a6e" transparent opacity={0.7} roughness={0.1} metalness={0.1} /></mesh>
        <mesh position={[0.06, 0.82, 0]}><boxGeometry args={[0.18, 0.09, 0.14]} /><meshStandardMaterial color="#d8c98a" roughness={1} /></mesh>
      </group>

      {active && (
        <mesh position={[0, 1.6, 0]} onClick={(e) => { e.stopPropagation(); onClick() }}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer" }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto" }}>
          <cylinderGeometry args={[1.1, 1.1, 2.2, 16]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
function Telescope({ active, completed, onClick }: InteractiveProps) {
  const [hovered, setHovered] = useState(false)
  const hoverP = useRef(0)
  const glowMats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const lightRef = useRef<THREE.PointLight>(null!)

  useEffect(() => { if (!active) document.body.style.cursor = "auto" }, [active])
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    hoverP.current = THREE.MathUtils.damp(hoverP.current, hovered ? 1 : 0, 8, delta)
    const eint = glowEmissive(t, active, completed, hoverP.current)
    for (const m of glowMats.current) { if (m) m.emissiveIntensity = eint }
    if (lightRef.current) lightRef.current.intensity = glowLight(t, active, completed, hoverP.current)
  })

  // Vintage brass refractor on a wooden tripod with alt-az head, dew shield,
  // rack-and-pinion focuser, star diagonal + eyepiece and a finder scope.
  return (
    <group position={TELE_POS}>
      <pointLight ref={lightRef} position={[0, 4, 1.4]} color={GLOW_COLOR} intensity={0} distance={8} decay={2} />

      {/* wooden tripod legs + spreader + accessory tray */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.4
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * 0.95, 1.45, Math.sin(a) * 0.95]} rotation={[Math.sin(a) * 0.34, 0, -Math.cos(a) * 0.34]} castShadow>
              <boxGeometry args={[0.12, 3.2, 0.12]} /><meshStandardMaterial color={WOOD} roughness={0.5} />
            </mesh>
            <mesh position={[Math.cos(a) * 0.55, 0.9, Math.sin(a) * 0.55]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.5, 0.06, 0.06]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.34, 0.34, 0.05, 18]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>

      {/* equatorial-style pillar + mount head on top of the tripod */}
      <mesh position={[0, 2.7, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.22, 0.9, 18]} />
        <meshStandardMaterial ref={(m) => { glowMats.current[0] = m }} color={METAL_DARK} emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.6} roughness={0.4} toneMapped={false} />
      </mesh>
      {/* angled polar/declination axis block in brass */}
      <mesh position={[0, 3.25, 0]} rotation={[0.5, 0, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 0.55, 16]} /><meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.3} /></mesh>
      {/* setting-circle disc */}
      <mesh position={[0, 3.45, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05, 24]} /><meshStandardMaterial color="#d8c074" metalness={0.8} roughness={0.35} /></mesh>
      {/* slow-motion flexible control with a knurled brass knob */}
      <mesh position={[0.28, 3.0, 0.2]} rotation={[0.3, 0, -0.5]}><cylinderGeometry args={[0.018, 0.018, 0.55, 8]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0.42, 2.78, 0.28]}><cylinderGeometry args={[0.06, 0.06, 0.07, 16]} /><meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.3} /></mesh>
      {/* counterweight shaft + weight (equatorial hallmark) */}
      <mesh position={[-0.32, 3.05, -0.18]} rotation={[0.5, 0, 0.9]}><cylinderGeometry args={[0.03, 0.03, 0.8, 10]} /><meshStandardMaterial color="#9aa0a8" metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[-0.55, 2.78, -0.32]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.2, 18]} /><meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.35} /></mesh>

      {/* the brass optical tube, angled up toward the skylight */}
      <group position={[0, 3.55, 0]} rotation={[-0.7, 0.35, 0]}>
        {/* main tube — long & slender, the way a refractor reads */}
        <mesh castShadow>
          <cylinderGeometry args={[0.17, 0.17, 3.4, 32]} />
          <meshStandardMaterial ref={(m) => { glowMats.current[1] = m }} color={BRASS} emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.85} roughness={0.26} toneMapped={false} />
        </mesh>
        {/* cradle rings clamping the tube to the mount */}
        {[-0.25, 0.25].map((y, i) => (<mesh key={i} position={[0, y, 0]}><torusGeometry args={[0.185, 0.035, 10, 28]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>))}

        {/* objective lens cell + dew shield at the top (front) */}
        <mesh position={[0, 1.78, 0]}><cylinderGeometry args={[0.205, 0.18, 0.55, 32]} /><meshStandardMaterial color="#c7a25e" metalness={0.85} roughness={0.28} /></mesh>
        <mesh position={[0, 1.74, 0]}><torusGeometry args={[0.185, 0.022, 10, 32]} /><meshStandardMaterial color="#8a6a32" metalness={0.8} roughness={0.32} /></mesh>
        {/* the objective glass — faint blue coated lens */}
        <mesh position={[0, 1.7, 0]}><circleGeometry args={[0.17, 32]} /><meshStandardMaterial color="#1a3a5c" metalness={0.2} roughness={0.08} emissive="#0b2238" emissiveIntensity={0.25} /></mesh>

        {/* reinforcing ring bands along the tube */}
        {[-0.9, 0, 0.9].map((y, i) => (<mesh key={i} position={[0, y, 0]}><torusGeometry args={[0.173, 0.018, 8, 28]} /><meshStandardMaterial color="#8a6a32" metalness={0.8} roughness={0.35} /></mesh>))}

        {/* rack-and-pinion focuser block + drawtube at the eyepiece end */}
        <mesh position={[0, -1.78, 0]}><cylinderGeometry args={[0.14, 0.17, 0.45, 20]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.32} /></mesh>
        <mesh position={[0, -2.04, 0]}><cylinderGeometry args={[0.1, 0.1, 0.22, 18]} /><meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.28} /></mesh>
        {/* two opposing focus knobs */}
        {[0.17, -0.17].map((x, i) => (<mesh key={i} position={[x, -1.7, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.055, 0.055, 0.09, 14]} /><meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.3} /></mesh>))}
        {/* 90° star diagonal so you look in from the side */}
        <mesh position={[0, -2.18, 0]}><boxGeometry args={[0.2, 0.2, 0.2]} /><meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[0.2, -2.18, 0]} rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[0.07, 0.08, 0.24, 16]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.32} /></mesh>
        <mesh position={[0.34, -2.18, 0]} rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[0.055, 0.055, 0.06, 14]} /><meshStandardMaterial color="#10131a" metalness={0.3} roughness={0.2} /></mesh>

        {/* finder scope on twin rings, parallel to the main tube */}
        <group position={[0.28, 0.35, 0]}>
          <mesh rotation={[0, 0, 0.04]}><cylinderGeometry args={[0.045, 0.045, 1.0, 14]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.05, 0.045, 0.12, 14]} /><meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.3} /></mesh>
          <mesh position={[0, -0.5, 0]}><cylinderGeometry args={[0.04, 0.04, 0.1, 12]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.35} /></mesh>
          {[0.22, -0.22].map((y, i) => (<mesh key={i} position={[-0.05, y, 0]}><boxGeometry args={[0.14, 0.03, 0.03]} /><meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} /></mesh>))}
        </group>
      </group>

      {/* a small taboret with an open star chart beside the scope */}
      <group position={[1.4, 0, 0.9]}>
        <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[1.2, 0.1, 0.9]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.6} /></mesh>
        {[[-0.5, -0.35], [0.5, -0.35], [-0.5, 0.35], [0.5, 0.35]].map(([x, z], i) => (<mesh key={i} position={[x, 0.5, z]}><boxGeometry args={[0.08, 1, 0.08]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.6} /></mesh>))}
        <mesh position={[0, 1.06, 0]} rotation={[-Math.PI / 2, 0, 0.2]}><planeGeometry args={[0.95, 0.72]} /><meshStandardMaterial color="#10243f" roughness={0.85} /></mesh>
        {[[-0.2, 0.1], [0.1, -0.15], [0.25, 0.2], [-0.1, -0.05], [0.0, 0.25], [0.18, -0.22]].map(([x, z], i) => (<mesh key={i} position={[x, 1.075, z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.022, 6]} /><meshBasicMaterial color="#ffe89a" /></mesh>))}
      </group>

      {active && (
        <mesh position={[0, 3.6, 0]} onClick={(e) => { e.stopPropagation(); onClick() }}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer" }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto" }}>
          <boxGeometry args={[2.6, 3.6, 2.6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Door + lock (back wall)
// ════════════════════════════════════════════════════════════════════════════

interface DoorLockProps { unlocked: boolean; roomPhase: RoomPhase; onDoorClick: () => void }

function DoorLock({ unlocked, roomPhase, onDoorClick }: DoorLockProps) {
  const lightRef = useRef<THREE.PointLight>(null!)
  const [hovered, setHovered] = useState(false)
  const visible = roomPhase !== "focused"

  useFrame(({ clock }) => {
    if (!lightRef.current) return
    const t = clock.getElapsedTime()
    const pulse = (1 + Math.sin(t * 2.5)) / 2
    lightRef.current.color.set(unlocked ? "#00e87a" : "#ff4444")
    lightRef.current.intensity = !visible ? 0 : unlocked ? (hovered ? 22 : 3 + pulse * 9) : 0.4 + pulse * 1.8
  })

  if (!visible) return null

  const col      = unlocked ? "#00e87a" : "#cc2222"
  const emissive = unlocked ? (hovered ? 2.5 : 0.8) : 0.3
  const shacklePos: [number, number, number] = unlocked ? [0.55, 1.1, 0] : [0, 0.78, 0]
  const shackleRot: [number, number, number] = unlocked ? [0, 0, 0.65]   : [0, 0, 0]

  return (
    <group position={DOOR_POS}>
      <pointLight ref={lightRef} position={[0, 0, 1.2]} distance={10} decay={2} intensity={0} />
      <mesh position={[0, 0.1, -0.35]}><boxGeometry args={[4.2, 6.6, 0.3]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.85} /></mesh>
      <mesh position={[0, 0, -0.2]}><boxGeometry args={[3.6, 6.2, 0.3]} /><meshStandardMaterial color={WOOD} roughness={0.8} /></mesh>
      {[-1.1, 0, 1.1].map((x) => (<mesh key={x} position={[x, 0, -0.03]}><boxGeometry args={[0.08, 6.2, 0.32]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.85} /></mesh>))}
      {[-1.8, 1.8].map((y) => (<mesh key={y} position={[0, y, 0]}><boxGeometry args={[3.6, 0.25, 0.34]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>))}
      <mesh position={[0, 0, 0.1]}><boxGeometry args={[1.2, 1.5, 0.55]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={emissive} metalness={0.8} roughness={0.2} /></mesh>
      <mesh position={[0, 0.15, 0.4]}><circleGeometry args={[0.18, 20]} /><meshBasicMaterial color="#000a14" /></mesh>
      <mesh position={[0, -0.14, 0.4]}><boxGeometry args={[0.12, 0.30, 0.01]} /><meshBasicMaterial color="#000a14" /></mesh>
      <group position={shacklePos} rotation={shackleRot}>
        <mesh position={[0, 0, 0.1]}><torusGeometry args={[0.40, 0.13, 10, 20, Math.PI]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={emissive} metalness={0.85} roughness={0.15} /></mesh>
      </group>
      {unlocked && (
        <mesh position={[0, 0, 0.6]} onClick={(e) => { e.stopPropagation(); onDoorClick() }}
          onPointerOver={() => { document.body.style.cursor = "pointer"; setHovered(true) }}
          onPointerOut={() => { document.body.style.cursor = "auto"; setHovered(false) }}>
          <sphereGeometry args={[2, 16, 16]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Lighting — soft, even north light + warm sun shaft (single shadow caster)
// ════════════════════════════════════════════════════════════════════════════

function AtelierLighting({ answerState }: { answerState: AnswerState }) {
  const correctGlow = answerState === "correct"
  return (
    <>
      <ambientLight intensity={0.5} color="#eef0ee" />
      <hemisphereLight intensity={0.7} color="#eaf2fb" groundColor="#9c8460" />

      {/* image-based lighting for realistic reflections (procedural, no network) */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#fbf3e2" position={[3, 9, 0]} scale={[10, 7, 1]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={1.3} color="#cfe0ee" position={[18, 6, -6]} scale={[6, 6, 1]} rotation={[0, -Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={0.6} color="#d8cdb6" position={[0, 6, 18]} scale={[20, 8, 1]} />
        <Lightformer form="rect" intensity={0.25} color="#6b5a44" position={[0, 0.1, 0]} scale={[40, 32, 1]} rotation={[-Math.PI / 2, 0, 0]} />
      </Environment>

      {/* the warm sun shaft through the skylight — the single shadow caster */}
      <directionalLight
        position={[4, 16, 3]} intensity={1.8} color="#fff1d6" castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-near={1} shadow-camera-far={40}
        shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={18} shadow-camera-bottom={-18}
      />
      {/* gentle fills (no shadows) */}
      <pointLight position={[0, 7, 12]} intensity={2.2} color="#fff0d8" distance={34} decay={2} />
      <pointLight position={[14, 5, -6]} intensity={2.0} color="#cfe6f4" distance={26} decay={2} />
      <pointLight position={[-13, 5, 2]} intensity={1.8} color="#ffe7c4" distance={24} decay={2} />

      {correctGlow && (
        <>
          <pointLight position={[0, 4, 2]} intensity={5} color={GLOW_COLOR} distance={16} />
          <pointLight position={[0, 1.5, 0]} intensity={3} color={TEAL} distance={12} />
        </>
      )}
    </>
  )
}

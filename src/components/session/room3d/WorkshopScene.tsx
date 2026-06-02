import { Suspense, useRef, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import * as THREE from "three"
import RoomCamera from "./RoomCamera"
import type { AnswerState } from "@/types"

// ════════════════════════════════════════════════════════════════════════════
//  EZRA'S MAAKPLAATS — a hand-built (procedural) inventor's workshop.
//  Three glowing clickable objects, each in its own clearly separated zone:
//    board → idea/blueprint board (left wall)
//    clock → half-built robot      (centre workbench)
//    book  → 3D printer            (right workbench)
//  Internal keys reuse the FocusTarget union so PlayScreen's question logic is
//  generic. The breathing green glow indicates an active/clickable object.
// ════════════════════════════════════════════════════════════════════════════

// ─── Shared room types (re-exported through index.ts) ──────────────────────────
export type RoomPhase = "exploring" | "focused" | "door"
export type FocusTarget = "board" | "clock" | "book"

// ─── Palette ──────────────────────────────────────────────────────────────────
const WOOD       = "#7a4f2b"
const WOOD_DARK  = "#583820"
const WOOD_LIGHT = "#9c6a3c"
const METAL      = "#8b919b"
const METAL_DARK = "#565c66"
const BRASS      = "#c98a3c"
const WALL       = "#3b3228"
const WALL_LOW   = "#2c251d"
const FLOOR_COL  = "#4a3825"
const TEAL       = "#2bc2e2"
const GLOW_COLOR = "#00ff88"

// ─── Shared glow curve ─────────────────────────────────────────────────────────
const glowBreath = (t: number) => Math.sin(t * 1.5) * 0.5 + 0.5
/** Emissive intensity for a clickable object's own materials. */
function glowEmissive(t: number, active: boolean, completed: boolean, hoverP: number): number {
  if (completed) return 0.45
  if (!active) return 0
  return glowBreath(t) * 1.15 * (1 - hoverP)   // breathe from 0, fade on hover
}
/** Matching point-light intensity (projects the glow onto nearby surfaces). */
function glowLight(t: number, active: boolean, completed: boolean, hoverP: number): number {
  if (completed) return 2.5
  if (!active) return 0
  return glowBreath(t) * 19 * (1 - hoverP)   // breathe from 0
}

// ─── Room dimensions ────────────────────────────────────────────────────────────
const ROOM_W = 40   // x: -20 .. 20
const ROOM_D = 32   // z: -16 .. 16
const ROOM_H = 11   // y:   0 .. 11

// ─── Camera positions ──────────────────────────────────────────────────────────
const EXPLORE_CAM = {
  position: [0, 6, 14.5] as [number, number, number],
  lookAt:   [0, 3.8, -3] as [number, number, number],
}
const BOARD_CAM = {
  position: [-11.5, 6.8, 1.5] as [number, number, number],
  lookAt:   [-19.6, 6.8, 1.5] as [number, number, number],
}
const ROBOT_CAM = {
  position: [-4, 4.4, 11.5] as [number, number, number],
  lookAt:   [-4, 3.6, 5]    as [number, number, number],
}
const PRINTER_CAM = {
  position: [12, 4.6, 5]  as [number, number, number],
  lookAt:   [12, 3.7, -3] as [number, number, number],
}
const DOOR_CAM = {
  position: [0, 3.7, -7]   as [number, number, number],
  lookAt:   [0, 3.3, -16]  as [number, number, number],
}

// ─── Object anchor points ───────────────────────────────────────────────────────
const BOARD_POS:   [number, number, number] = [-19.6, 6.8,  1.5]
const ROBOT_POS:   [number, number, number] = [-4,    2.91, 5]
const PRINTER_POS: [number, number, number] = [12,    2.91, -3]
const DOOR_POS:    [number, number, number] = [0,     3.1,  -15.7]

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

export default function WorkshopScene({
  answerState, roomPhase, focusTarget, activeObjects, completedObjects,
  onObjectClick, doorUnlocked, onDoorClick, children,
}: Props) {
  const camProps =
    roomPhase === "door" ? DOOR_CAM
    : roomPhase === "focused"
      ? (focusTarget === "clock" ? ROBOT_CAM
         : focusTarget === "book" ? PRINTER_CAM
         : BOARD_CAM)
      : EXPLORE_CAM

  const exploring  = roomPhase === "exploring"
  const lerpFactor = roomPhase === "door" ? 0.03 : 0.013

  const boardActive   = exploring && !completedObjects.has("board") && activeObjects.includes("board")
  const robotActive   = exploring && !completedObjects.has("clock") && activeObjects.includes("clock")
  const printerActive = exploring && !completedObjects.has("book")  && activeObjects.includes("book")

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="fixed inset-0 z-0">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.65, powerPreference: "high-performance" }}
          camera={{ fov: 60, near: 0.1, far: 140 }}
          style={{ background: "#0c0a07" }}
        >
          <Suspense fallback={null}>
            <RoomCamera targetPos={camProps.position} targetLookAt={camProps.lookAt} exploring={exploring} lerpFactor={lerpFactor} />
            <WorkshopLighting answerState={answerState} />

            <WorkshopShell />
            <WorkshopDecor />

            <IdeaBoard   active={boardActive}   completed={completedObjects.has("board")} onClick={() => onObjectClick("board")} />
            <RobotBuild  active={robotActive}   completed={completedObjects.has("clock")} onClick={() => onObjectClick("clock")} />
            <Printer3D   active={printerActive} completed={completedObjects.has("book")}  onClick={() => onObjectClick("book")} />

            <DoorLock unlocked={doorUnlocked} roomPhase={roomPhase} onDoorClick={onDoorClick} />
          </Suspense>
        </Canvas>
      </div>

      {/* Vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.4) 100%)" }}
      />

      {/* HTML overlay */}
      <div className="pointer-events-none relative z-[2] min-h-screen">
        {children}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Room shell — floor, walls, ceiling, beams, skirting
// ════════════════════════════════════════════════════════════════════════════

function WorkshopShell() {
  return (
    <group>
      {/* Floor — wooden planks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={FLOOR_COL} roughness={0.92} metalness={0} />
      </mesh>
      {/* plank seams (run along z) */}
      {Array.from({ length: 19 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-ROOM_W / 2 + 1 + i * 2 + 0.05, 0.01, 0]}>
          <planeGeometry args={[0.07, ROOM_D]} />
          <meshBasicMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      {/* a few cross-plank butt joints for realism */}
      {[[-12, -4], [3, 6], [10, -8], [-6, 9], [15, 2]].map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.011, z]}>
          <planeGeometry args={[2, 0.07]} />
          <meshBasicMaterial color={WOOD_DARK} />
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

      {/* Left + right walls */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      {/* side-wall wainscot */}
      <mesh position={[-ROOM_W / 2 + 0.05, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, 2.8]} />
        <meshStandardMaterial color={WALL_LOW} roughness={1} />
      </mesh>
      <mesh position={[ROOM_W / 2 - 0.05, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, 2.8]} />
        <meshStandardMaterial color={WALL_LOW} roughness={1} />
      </mesh>

      {/* Skirting boards */}
      <mesh position={[0, 0.18, -ROOM_D / 2 + 0.12]}><boxGeometry args={[ROOM_W, 0.36, 0.18]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.8} /></mesh>
      <mesh position={[-ROOM_W / 2 + 0.12, 0.18, 0]}><boxGeometry args={[0.18, 0.36, ROOM_D]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.8} /></mesh>
      <mesh position={[ROOM_W / 2 - 0.12, 0.18, 0]}><boxGeometry args={[0.18, 0.36, ROOM_D]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.8} /></mesh>

      {/* Ceiling */}
      <mesh position={[0, ROOM_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#1c1812" roughness={1} />
      </mesh>
      {/* Ceiling beams (run along z) */}
      {[-14, -7, 0, 7, 14].map((x) => (
        <mesh key={x} position={[x, ROOM_H - 0.4, 0]}>
          <boxGeometry args={[0.6, 0.6, ROOM_D]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
        </mesh>
      ))}

      {/* Window on the back wall (warm glow from outside) */}
      <group position={[8, 6, -ROOM_D / 2 + 0.1]}>
        <mesh><planeGeometry args={[5, 3.4]} /><meshBasicMaterial color="#3a4a5a" /></mesh>
        {/* cross frame */}
        <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.14, 3.4, 0.1]} /><meshStandardMaterial color={WOOD_DARK} /></mesh>
        <mesh position={[0, 0, 0.02]}><boxGeometry args={[5, 0.14, 0.1]} /><meshStandardMaterial color={WOOD_DARK} /></mesh>
        {/* outer frame */}
        <mesh position={[0, 0, -0.06]}><boxGeometry args={[5.3, 3.7, 0.18]} /><meshStandardMaterial color={WOOD} roughness={0.8} /></mesh>
        {/* sill */}
        <mesh position={[0, -1.85, 0.18]}><boxGeometry args={[5.6, 0.18, 0.5]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.8} /></mesh>
      </group>
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Reusable furniture / props
// ════════════════════════════════════════════════════════════════════════════

function Workbench({ position, width = 6, depth = 2.4, rotation = 0 }: {
  position: [number, number, number]; width?: number; depth?: number; rotation?: number
}) {
  const legX = width / 2 - 0.25
  const legZ = depth / 2 - 0.25
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 2.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.32, depth]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.45, depth / 2 - 0.1]}>
        <boxGeometry args={[width, 0.5, 0.16]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      {[[-legX, -legZ], [legX, -legZ], [-legX, legZ], [legX, legZ]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.3, z]} castShadow>
          <boxGeometry args={[0.28, 2.6, 0.28]} />
          <meshStandardMaterial color={METAL_DARK} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[width - 0.6, 0.12, depth - 0.4]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
    </group>
  )
}

function Pegboard({ position, rotation = 0, width = 6, height = 4 }: {
  position: [number, number, number]; rotation?: number; width?: number; height?: number
}) {
  // base layout authored for a 6×4 board, then scaled to the requested size
  const sx = width / 6, sy = height / 4
  const tools = [
    { type: "wrench",      x: -2.1, y:  1.1 },
    { type: "screwdriver", x: -1.3, y:  1.2 },
    { type: "screwdriver", x: -0.9, y:  1.2 },
    { type: "hammer",      x:  0.2, y:  1.0 },
    { type: "saw",         x:  1.6, y:  0.85 },
    { type: "wrench",      x:  2.1, y: -0.5 },
    { type: "screwdriver", x: -1.9, y: -0.6 },
    { type: "hammer",      x: -0.3, y: -0.7 },
  ] as const
  const cols = Math.max(3, Math.round(width / 0.5) - 1)
  const rows = Math.max(3, Math.round(height / 0.5) - 1)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* wooden frame behind the board */}
      <mesh position={[0, 0, -0.06]} castShadow>
        <boxGeometry args={[width + 0.26, height + 0.26, 0.1]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>
      {/* perforated board panel (light hardboard) */}
      <mesh>
        <boxGeometry args={[width, height, 0.1]} />
        <meshStandardMaterial color="#c7a06a" roughness={0.88} />
      </mesh>
      {/* hole grid */}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <mesh key={`${r}-${c}`} position={[-width / 2 + 0.5 + c * 0.5, height / 2 - 0.4 - r * 0.5, 0.06]}>
            <circleGeometry args={[0.04, 8]} />
            <meshBasicMaterial color="#3a2a18" />
          </mesh>
        ))
      )}
      {/* tools, each on a little steel peg-hook */}
      {tools.map((t, i) => (
        <group key={i} position={[t.x * sx, t.y * sy, 0]}>
          <mesh position={[0, 0.14, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.2, 6]} />
            <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} />
          </mesh>
          <Tool type={t.type} position={[0, 0, 0.2]} />
        </group>
      ))}
      {/* bottom tool tray */}
      <mesh position={[0, -height / 2 + 0.16, 0.28]}>
        <boxGeometry args={[width - 0.5, 0.08, 0.42]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.32, 0.48]}>
        <boxGeometry args={[width - 0.5, 0.36, 0.05]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
    </group>
  )
}

function Tool({ type, position }: { type: "wrench" | "screwdriver" | "hammer" | "saw"; position: [number, number, number] }) {
  if (type === "wrench") {
    return (
      <group position={position} rotation={[0, 0, 0.3]}>
        <mesh><boxGeometry args={[0.12, 0.9, 0.06]} /><meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[0, 0.5, 0]}><torusGeometry args={[0.13, 0.05, 8, 16, Math.PI * 1.4]} /><meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} /></mesh>
      </group>
    )
  }
  if (type === "screwdriver") {
    return (
      <group position={position}>
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.07, 0.07, 0.45, 10]} /><meshStandardMaterial color="#c0392b" roughness={0.5} /></mesh>
        <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.025, 0.025, 0.45, 8]} /><meshStandardMaterial color={METAL} metalness={0.85} roughness={0.2} /></mesh>
      </group>
    )
  }
  if (type === "hammer") {
    return (
      <group position={position}>
        <mesh position={[0, -0.1, 0]}><cylinderGeometry args={[0.05, 0.05, 0.8, 8]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} /></mesh>
        <mesh position={[0, 0.32, 0]}><boxGeometry args={[0.34, 0.16, 0.16]} /><meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.4} /></mesh>
      </group>
    )
  }
  return (
    <group position={position} rotation={[0, 0, -0.2]}>
      <mesh><boxGeometry args={[0.9, 0.34, 0.04]} /><meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[-0.55, 0, 0]}><boxGeometry args={[0.22, 0.4, 0.08]} /><meshStandardMaterial color="#8a5a2b" roughness={0.7} /></mesh>
    </group>
  )
}

function Crate({ position, size = 1.3, color = WOOD }: { position: [number, number, number]; size?: number; color?: string }) {
  return (
    <group position={position}>
      <mesh castShadow><boxGeometry args={[size, size, size]} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz], i) => (
        <mesh key={i} position={[sx * size / 2, 0, sz * size / 2]}>
          <boxGeometry args={[0.08, size + 0.02, 0.08]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Shelf({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const jars = [-1.6, -0.9, -0.2, 0.5, 1.2, 1.9]
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[4.5, 0.14, 0.7]} /><meshStandardMaterial color={WOOD} roughness={0.8} /></mesh>
      <mesh position={[0, 1.4, 0]}><boxGeometry args={[4.5, 0.14, 0.7]} /><meshStandardMaterial color={WOOD} roughness={0.8} /></mesh>
      {[-2, 2].map((x) => (
        <mesh key={x} position={[x, 0.7, -0.25]}><boxGeometry args={[0.1, 1.6, 0.1]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} /></mesh>
      ))}
      {jars.map((x, i) => (
        <group key={i} position={[x, 0.32, 0]}>
          <mesh><cylinderGeometry args={[0.18, 0.18, 0.5, 12]} /><meshStandardMaterial color="#9fc6d6" transparent opacity={0.35} roughness={0.1} /></mesh>
          <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[0.16, 0.16, 0.24, 12]} /><meshStandardMaterial color={i % 2 ? BRASS : METAL_DARK} roughness={0.6} metalness={0.5} /></mesh>
        </group>
      ))}
    </group>
  )
}

function HangingBulb({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null!)
  useFrame(({ clock }) => {
    if (!lightRef.current) return
    const f = 0.9 + Math.sin(clock.getElapsedTime() * 7 + position[0]) * 0.04
    lightRef.current.intensity = 9 * f
  })
  return (
    <group position={position}>
      <mesh position={[0, (ROOM_H - position[1]) / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, ROOM_H - position[1], 6]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* metal shade */}
      <mesh position={[0, 0.18, 0]}>
        <coneGeometry args={[0.5, 0.45, 18, 1, true]} />
        <meshStandardMaterial color={METAL_DARK} metalness={0.5} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#fff3c8" emissive="#ffcf7a" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} color="#ffcf8a" intensity={9} distance={16} decay={2} />
    </group>
  )
}

function ToolCabinet({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow><boxGeometry args={[2, 3, 1.2]} /><meshStandardMaterial color="#3a4654" metalness={0.5} roughness={0.4} /></mesh>
      {Array.from({ length: 4 }).map((_, i) => (
        <group key={i}>
          <mesh position={[0, 1.05 - i * 0.7, 0.61]}><boxGeometry args={[1.8, 0.6, 0.04]} /><meshStandardMaterial color="#2c3642" metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0, 1.05 - i * 0.7, 0.64]}><boxGeometry args={[0.5, 0.08, 0.06]} /><meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} /></mesh>
        </group>
      ))}
    </group>
  )
}

function Ladder({ position, rotation = 0, lean = 0.14 }: { position: [number, number, number]; rotation?: number; lean?: number }) {
  return (
    <group position={position} rotation={[lean, rotation, 0]}>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 2.2, 0]}><boxGeometry args={[0.12, 4.4, 0.12]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.8} /></mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, 0.6 + i * 0.7, 0]}><boxGeometry args={[1.02, 0.08, 0.12]} /><meshStandardMaterial color={WOOD} roughness={0.8} /></mesh>
      ))}
    </group>
  )
}

function PaintCan({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh castShadow><cylinderGeometry args={[0.28, 0.28, 0.5, 16]} /><meshStandardMaterial color={color} metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.29, 0.29, 0.04, 16]} /><meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.24, 0.02, 8, 16, Math.PI]} /><meshStandardMaterial color={METAL_DARK} metalness={0.7} /></mesh>
    </group>
  )
}

function Barrel({ position, color = "#3a6b4a" }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh castShadow><cylinderGeometry args={[0.6, 0.6, 1.6, 22]} /><meshStandardMaterial color={color} metalness={0.3} roughness={0.6} /></mesh>
      {[-0.5, 0, 0.5].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.61, 0.04, 8, 22]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>
      ))}
    </group>
  )
}

function Stool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* seat */}
      <mesh position={[0, 1.7, 0]} castShadow><cylinderGeometry args={[0.58, 0.58, 0.18, 20]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} /></mesh>
      <mesh position={[0, 1.58, 0]}><cylinderGeometry args={[0.5, 0.42, 0.1, 20]} /><meshStandardMaterial color={WOOD} roughness={0.8} /></mesh>
      {/* legs */}
      {([[0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]] as const).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.82, z]} rotation={[z > 0 ? 0.09 : -0.09, 0, x > 0 ? -0.09 : 0.09]}>
          <cylinderGeometry args={[0.06, 0.08, 1.7, 8]} /><meshStandardMaterial color={WOOD} roughness={0.8} />
        </mesh>
      ))}
      {/* foot ring */}
      <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.44, 0.035, 8, 20]} /><meshStandardMaterial color={METAL_DARK} metalness={0.5} roughness={0.5} /></mesh>
    </group>
  )
}

function Sawhorse({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1, 0]}><boxGeometry args={[2, 0.18, 0.3]} /><meshStandardMaterial color={WOOD} roughness={0.8} /></mesh>
      {[-0.8, 0.8].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.5, 0.25]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.12, 1.1, 0.12]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.8} /></mesh>
          <mesh position={[x, 0.5, -0.25]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.12, 1.1, 0.12]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.8} /></mesh>
        </group>
      ))}
    </group>
  )
}

function LumberStack({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[(i % 2) * 0.06, 0.15 + i * 0.14, 0]} castShadow>
          <boxGeometry args={[3.4, 0.12, 0.5]} />
          <meshStandardMaterial color={i % 2 ? WOOD : WOOD_LIGHT} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

function WallClock({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.95, 0.95, 0.16, 32]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.7} /></mesh>
      <mesh position={[0, 0, 0.09]}><circleGeometry args={[0.82, 32]} /><meshStandardMaterial color="#f3ecd8" roughness={0.9} /></mesh>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.68, Math.cos(a) * 0.68, 0.1]} rotation={[0, 0, -a]}>
            <boxGeometry args={[0.04, 0.12, 0.01]} /><meshBasicMaterial color="#3a2c1a" />
          </mesh>
        )
      })}
      <mesh position={[0.1, 0.16, 0.12]} rotation={[0, 0, -0.5]}><boxGeometry args={[0.05, 0.42, 0.01]} /><meshBasicMaterial color="#1a1a1a" /></mesh>
      <mesh position={[-0.06, 0.26, 0.13]} rotation={[0, 0, 0.35]}><boxGeometry args={[0.035, 0.6, 0.01]} /><meshBasicMaterial color="#1a1a1a" /></mesh>
      <mesh position={[0, 0, 0.14]}><sphereGeometry args={[0.06, 10, 10]} /><meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.3} /></mesh>
    </group>
  )
}

// ─── Framed blueprint on the wall (technical drawing) ───────────────────────────
function WallFrame({ position, rotation = 0, w = 2.4, h = 3, color = "#16335a", variant = "gear" }: {
  position: [number, number, number]; rotation?: number; w?: number; h?: number; color?: string
  variant?: "gear" | "bulb"
}) {
  const LINE = "#cfe8ff"
  const nV = 4, nH = 5
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* wooden frame + blueprint paper */}
      <mesh><boxGeometry args={[w + 0.22, h + 0.22, 0.08]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.8} /></mesh>
      <mesh position={[0, 0, 0.045]}><planeGeometry args={[w, h]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>

      {/* faint measurement grid */}
      {Array.from({ length: nV }).map((_, i) => (
        <mesh key={`v${i}`} position={[-w / 2 + (i + 1) * (w / (nV + 1)), 0, 0.05]}>
          <planeGeometry args={[0.008, h - 0.12]} /><meshBasicMaterial color={LINE} transparent opacity={0.14} />
        </mesh>
      ))}
      {Array.from({ length: nH }).map((_, i) => (
        <mesh key={`h${i}`} position={[0, -h / 2 + (i + 1) * (h / (nH + 1)), 0.05]}>
          <planeGeometry args={[w - 0.12, 0.008]} /><meshBasicMaterial color={LINE} transparent opacity={0.14} />
        </mesh>
      ))}
      {/* inner border */}
      {([[0, (h - 0.18) / 2, w - 0.18, 0.01], [0, -(h - 0.18) / 2, w - 0.18, 0.01],
         [-(w - 0.18) / 2, 0, 0.01, h - 0.18], [(w - 0.18) / 2, 0, 0.01, h - 0.18]] as const).map((b, i) => (
        <mesh key={i} position={[b[0], b[1], 0.051]}><planeGeometry args={[b[2], b[3]]} /><meshBasicMaterial color={LINE} transparent opacity={0.4} /></mesh>
      ))}

      {variant === "gear" ? (
        <group position={[0, 0.22, 0.06]}>
          {/* crosshair (behind) */}
          <mesh position={[0, 0, -0.002]}><planeGeometry args={[1.5, 0.006]} /><meshBasicMaterial color={LINE} transparent opacity={0.45} /></mesh>
          <mesh position={[0, 0, -0.002]}><planeGeometry args={[0.006, 1.5]} /><meshBasicMaterial color={LINE} transparent opacity={0.45} /></mesh>
          {/* teeth */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2
            return <mesh key={i} position={[Math.cos(a) * 0.58, Math.sin(a) * 0.58, 0]} rotation={[0, 0, a]}><planeGeometry args={[0.13, 0.11]} /><meshBasicMaterial color={LINE} /></mesh>
          })}
          {/* rings + hub */}
          <mesh><torusGeometry args={[0.52, 0.016, 8, 40]} /><meshBasicMaterial color={LINE} /></mesh>
          <mesh><torusGeometry args={[0.27, 0.014, 8, 30]} /><meshBasicMaterial color={LINE} /></mesh>
          <mesh><torusGeometry args={[0.09, 0.012, 8, 20]} /><meshBasicMaterial color={LINE} /></mesh>
        </group>
      ) : (
        <group position={[0, 0.28, 0.06]}>
          {/* glass bulb outline */}
          <mesh position={[0, 0.18, 0]}><torusGeometry args={[0.4, 0.016, 8, 40]} /><meshBasicMaterial color={LINE} /></mesh>
          {/* neck (two angled lines down to the base) */}
          <mesh position={[-0.16, -0.24, 0]} rotation={[0, 0, 0.55]}><planeGeometry args={[0.014, 0.36]} /><meshBasicMaterial color={LINE} /></mesh>
          <mesh position={[0.16, -0.24, 0]} rotation={[0, 0, -0.55]}><planeGeometry args={[0.014, 0.36]} /><meshBasicMaterial color={LINE} /></mesh>
          {/* screw base + threads */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, -0.42 - i * 0.08, 0]}><planeGeometry args={[0.26 - i * 0.01, 0.012]} /><meshBasicMaterial color={LINE} /></mesh>
          ))}
          <mesh position={[-0.13, -0.54, 0]}><planeGeometry args={[0.014, 0.26]} /><meshBasicMaterial color={LINE} /></mesh>
          <mesh position={[0.13, -0.54, 0]}><planeGeometry args={[0.014, 0.26]} /><meshBasicMaterial color={LINE} /></mesh>
          {/* filament zig-zag inside the glass */}
          {([-0.12, -0.04, 0.04, 0.12] as const).map((x, i) => (
            <mesh key={i} position={[x, 0.16, 0]} rotation={[0, 0, i % 2 ? 0.7 : -0.7]}><planeGeometry args={[0.012, 0.2]} /><meshBasicMaterial color={LINE} /></mesh>
          ))}
        </group>
      )}

      {/* title block (bottom-right corner) */}
      <mesh position={[w / 2 - 0.52, -h / 2 + 0.32, 0.052]}><planeGeometry args={[0.78, 0.4]} /><meshBasicMaterial color={LINE} transparent opacity={0.1} /></mesh>
      {[0.1, 0.0, -0.1].map((y, i) => (
        <mesh key={i} position={[w / 2 - 0.66, -h / 2 + 0.32 + y, 0.055]}><planeGeometry args={[0.42, 0.018]} /><meshBasicMaterial color={LINE} transparent opacity={0.45} /></mesh>
      ))}
    </group>
  )
}

// ─── Ezra's mascot robot (based on the reference art) ───────────────────────────
function CuteRobot({ position, rotation = 0, scale = 1, accent = "#27325c", eyeColor = "#8fe3ff", powered = true, stage = "done" }: {
  position: [number, number, number]; rotation?: number; scale?: number; accent?: string; eyeColor?: string; powered?: boolean; stage?: "frame" | "partial" | "done"
}) {
  const lit = stage === "done" && powered
  const eyeRef = useRef<THREE.MeshStandardMaterial>(null!)
  useFrame(({ clock }) => {
    if (eyeRef.current) eyeRef.current.emissiveIntensity = lit ? 1.4 + Math.sin(clock.getElapsedTime() * 2 + position[0]) * 0.5 : 0
  })
  const SHELL = "#ece9f2", SHELL_D = "#cfd0e0", EAR = "#9fc4e2"
  const eyeInt = lit ? 1.6 : 0
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* legs */}
      {[-0.28, 0.28].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 0.5, 0]}><sphereGeometry args={[0.13, 12, 12]} /><meshStandardMaterial color={accent} roughness={0.5} metalness={0.3} /></mesh>
          <mesh position={[0, 0.36, 0]}><cylinderGeometry args={[0.1, 0.1, 0.3, 10]} /><meshStandardMaterial color={SHELL} roughness={0.4} /></mesh>
          <mesh position={[0, 0.22, 0]}><sphereGeometry args={[0.11, 12, 12]} /><meshStandardMaterial color={accent} roughness={0.5} metalness={0.3} /></mesh>
          <mesh position={[0, 0.12, 0.02]}><cylinderGeometry args={[0.09, 0.1, 0.2, 10]} /><meshStandardMaterial color={SHELL} roughness={0.4} /></mesh>
          <mesh position={[0, 0.04, 0.06]} castShadow><boxGeometry args={[0.22, 0.1, 0.34]} /><meshStandardMaterial color={SHELL} roughness={0.4} /></mesh>
          <mesh position={[0, -0.01, 0.07]}><boxGeometry args={[0.24, 0.06, 0.36]} /><meshStandardMaterial color={accent} roughness={0.5} /></mesh>
        </group>
      ))}
      {/* body */}
      <mesh position={[0, 0.82, 0]} castShadow><sphereGeometry args={[0.34, 20, 20]} /><meshStandardMaterial color={SHELL} roughness={0.35} metalness={0.1} /></mesh>
      <mesh position={[0, 0.62, 0]} scale={[1, 0.7, 1]}><sphereGeometry args={[0.31, 20, 20]} /><meshStandardMaterial color={SHELL} roughness={0.35} /></mesh>
      <mesh position={[0, 1.02, 0]}><cylinderGeometry args={[0.14, 0.18, 0.1, 16]} /><meshStandardMaterial color={accent} roughness={0.5} metalness={0.3} /></mesh>
      {/* arms — only once past the bare-frame stage */}
      {stage !== "frame" && ([-1, 1] as const).map((s, i) => (
        <group key={i} position={[s * 0.36, 0.86, 0]} rotation={[0, 0, s * 0.18]}>
          <mesh><sphereGeometry args={[0.12, 12, 12]} /><meshStandardMaterial color={accent} roughness={0.5} metalness={0.3} /></mesh>
          <mesh position={[s * 0.06, -0.16, 0]}><cylinderGeometry args={[0.08, 0.08, 0.26, 10]} /><meshStandardMaterial color={SHELL} roughness={0.4} /></mesh>
          {/* the partial build is still missing its forearm + hand */}
          {stage === "done" && <>
            <mesh position={[s * 0.1, -0.3, 0]}><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color={accent} roughness={0.5} /></mesh>
            <mesh position={[s * 0.12, -0.44, 0.02]}><cylinderGeometry args={[0.07, 0.08, 0.2, 10]} /><meshStandardMaterial color={SHELL} roughness={0.4} /></mesh>
            <mesh position={[s * 0.14, -0.56, 0.02]}><sphereGeometry args={[0.09, 10, 10]} /><meshStandardMaterial color={SHELL_D} roughness={0.45} /></mesh>
          </>}
        </group>
      ))}

      {/* bare metal frame — exposed skeleton while still being built */}
      {stage === "frame" && (
        <group>
          {/* spine + ribs poking out of the open body */}
          <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.03, 0.03, 0.9, 6]} /><meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} /></mesh>
          {[0.7, 0.95, 1.2].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.18, 0.02, 6, 16]} /><meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.4} /></mesh>
          ))}
          {/* loose wires sprouting from the neck */}
          {([-1, 1] as const).map((s, i) => (
            <mesh key={i} position={[s * 0.08, 1.5, 0.04]} rotation={[0.3, 0, s * 0.5]}><cylinderGeometry args={[0.012, 0.012, 0.4, 5]} /><meshStandardMaterial color={i ? "#c0392b" : "#e8c34a"} roughness={0.6} /></mesh>
          ))}
          {/* a single mounted shoulder servo */}
          <mesh position={[-0.34, 0.86, 0]}><boxGeometry args={[0.14, 0.16, 0.14]} /><meshStandardMaterial color={accent} metalness={0.4} roughness={0.5} /></mesh>
        </group>
      )}

      {/* head — only once past the bare-frame stage */}
      {stage !== "frame" && (
        <group position={[0, 1.42, 0]}>
          <mesh scale={[1, 0.92, 0.96]} castShadow><sphereGeometry args={[0.4, 24, 24]} /><meshStandardMaterial color={SHELL} roughness={0.3} metalness={0.1} /></mesh>
          <mesh position={[0, 0.26, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={accent} roughness={0.5} /></mesh>
          {/* face screen */}
          <mesh position={[0, -0.02, 0.34]} scale={[1, 0.85, 1]}><circleGeometry args={[0.26, 28]} /><meshStandardMaterial color="#1c2746" roughness={0.3} /></mesh>
          {/* eyes */}
          {[-0.1, 0.1].map((ex, i) => (
            <mesh key={i} position={[ex, 0.02, 0.36]}>
              <torusGeometry args={[0.06, 0.018, 10, 20]} />
              {i === 0
                ? <meshStandardMaterial ref={eyeRef} color={eyeColor} emissive={eyeColor} emissiveIntensity={eyeInt} toneMapped={false} />
                : <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={eyeInt} toneMapped={false} />}
            </mesh>
          ))}
          {/* smile */}
          <mesh position={[0, -0.13, 0.36]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.05, 0.012, 8, 16, Math.PI]} /><meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={lit ? 1.2 : 0} toneMapped={false} /></mesh>
          {/* ears */}
          {([-1, 1] as const).map((s, i) => (
            <mesh key={i} position={[s * 0.4, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.08, 16]} /><meshStandardMaterial color={EAR} roughness={0.4} metalness={0.2} /></mesh>
          ))}
          {/* antenna */}
          <mesh position={[0.12, 0.38, 0]} rotation={[0, 0, -0.2]}><cylinderGeometry args={[0.012, 0.012, 0.3, 6]} /><meshStandardMaterial color={accent} /></mesh>
          <mesh position={[0.16, 0.55, 0]}><sphereGeometry args={[0.05, 10, 10]} /><meshStandardMaterial color={accent} roughness={0.4} /></mesh>
        </group>
      )}
    </group>
  )
}

// ─── Small realistic workshop props ─────────────────────────────────────────────
function Vise({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh><boxGeometry args={[0.5, 0.3, 0.4]} /><meshStandardMaterial color="#3a4a5a" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0.28, 0.18]}><boxGeometry args={[0.5, 0.26, 0.1]} /><meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.28, -0.05]}><boxGeometry args={[0.5, 0.26, 0.1]} /><meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.28, -0.35]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.5, 8]} /><meshStandardMaterial color={METAL} metalness={0.8} roughness={0.2} /></mesh>
      <mesh position={[0, 0.28, -0.6]}><cylinderGeometry args={[0.08, 0.08, 0.12, 10]} /><meshStandardMaterial color="#c0392b" roughness={0.5} /></mesh>
    </group>
  )
}

function DeskLamp({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh><cylinderGeometry args={[0.22, 0.26, 0.08, 18]} /><meshStandardMaterial color="#444" metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.03, 0.03, 1, 8]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} /></mesh>
      <mesh position={[0.35, 0.95, 0]} rotation={[0, 0, -0.5]}><cylinderGeometry args={[0.03, 0.03, 0.8, 8]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} /></mesh>
      <group position={[0.7, 1.15, 0]} rotation={[0, 0, -1.1]}>
        <mesh><coneGeometry args={[0.22, 0.3, 18, 1, true]} /><meshStandardMaterial color="#c0392b" roughness={0.5} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.05, 0]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color="#fff3c8" emissive="#ffcf7a" emissiveIntensity={1.6} toneMapped={false} /></mesh>
        <pointLight position={[0, -0.2, 0]} color="#ffe0a0" intensity={2.5} distance={6} decay={2} />
      </group>
    </group>
  )
}

function PartsBin({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const colors = ["#c0392b", "#e8c34a", "#2b7de2", "#3a9b5a", "#9b59b6", "#e67e22"]
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh><boxGeometry args={[1.1, 0.9, 0.5]} /><meshStandardMaterial color="#4a4f57" metalness={0.4} roughness={0.5} /></mesh>
      {colors.map((c, i) => {
        const col = i % 3, row = Math.floor(i / 3)
        return (
          <group key={i} position={[-0.36 + col * 0.36, 0.22 - row * 0.42, 0.26]}>
            <mesh><boxGeometry args={[0.32, 0.34, 0.18]} /><meshStandardMaterial color={c} roughness={0.6} /></mesh>
            <mesh position={[0, 0.1, 0.1]}><boxGeometry args={[0.18, 0.05, 0.04]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          </group>
        )
      })}
    </group>
  )
}

function FireExtinguisher({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow><cylinderGeometry args={[0.22, 0.22, 0.9, 18]} /><meshStandardMaterial color="#c0392b" metalness={0.3} roughness={0.5} /></mesh>
      <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.08, 0.12, 0.18, 12]} /><meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[0.1, 0.62, 0]}><boxGeometry args={[0.22, 0.06, 0.08]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0.24, 0.2, 0]} rotation={[0, 0, -0.5]}><cylinderGeometry args={[0.02, 0.02, 0.5, 6]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0, 0.05, 0.21]}><boxGeometry args={[0.22, 0.3, 0.02]} /><meshStandardMaterial color="#f3ecd8" roughness={0.8} /></mesh>
    </group>
  )
}

function Mug({ position, color = "#2b7de2" }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh><cylinderGeometry args={[0.1, 0.09, 0.22, 14]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
      <mesh position={[0.12, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.06, 0.018, 8, 14, Math.PI]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
    </group>
  )
}

function Fan({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const bladeRef = useRef<THREE.Group>(null!)
  useFrame((_, delta) => { if (bladeRef.current) bladeRef.current.rotation.z += delta * 6 })
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh><cylinderGeometry args={[0.4, 0.45, 0.08, 18]} /><meshStandardMaterial color={METAL_DARK} metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.05, 0.05, 1.8, 10]} /><meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} /></mesh>
      <group position={[0, 1.75, 0.1]}>
        <mesh><cylinderGeometry args={[0.12, 0.12, 0.18, 12]} /><meshStandardMaterial color="#333" metalness={0.5} /></mesh>
        <group ref={bladeRef} position={[0, 0, 0.1]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, 0, (i / 4) * Math.PI * 2]} position={[Math.cos((i / 4) * Math.PI * 2) * 0.3, Math.sin((i / 4) * Math.PI * 2) * 0.3, 0]}>
              <boxGeometry args={[0.5, 0.22, 0.02]} /><meshStandardMaterial color="#9aa3ad" metalness={0.4} roughness={0.5} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.62, 0.02, 8, 28]} /><meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} /></mesh>
      </group>
    </group>
  )
}

function Broom({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, 0, 0.18]}>
      <group rotation={[0, rotation, 0]}>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.05, 0.05, 3.2, 8]} /><meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} /></mesh>
        <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.5, 0.2, 0.18]} /><meshStandardMaterial color="#3a4a5a" roughness={0.6} /></mesh>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[-0.22 + i * 0.055, -0.18, 0]}><cylinderGeometry args={[0.012, 0.012, 0.4, 5]} /><meshStandardMaterial color="#c9a45a" roughness={0.8} /></mesh>
        ))}
      </group>
    </group>
  )
}

// ─── Industrial robot arm on a ceiling rail (stationary) ────────────────────────
function CeilingArm({ position, rotation = 0, railLength = 10 }: {
  position: [number, number, number]; rotation?: number; railLength?: number
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* twin rails */}
      {[-0.35, 0.35].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, railLength, 12]} /><meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* rail end brackets up to the ceiling */}
      {[-railLength / 2, railLength / 2].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]}><boxGeometry args={[0.3, 1, 0.9]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>
      ))}
      {/* carriage + arm (parked mid-rail) */}
      <group>
        <mesh position={[0, -0.05, 0]}><boxGeometry args={[0.8, 0.4, 0.95]} /><meshStandardMaterial color="#d98c2b" metalness={0.4} roughness={0.5} /></mesh>
        <mesh position={[0, -0.32, 0]}><cylinderGeometry args={[0.16, 0.16, 0.3, 16]} /><meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} /></mesh>
        {/* upper arm */}
        <group position={[0, -0.45, 0]} rotation={[0, 0, -0.4]}>
          <mesh position={[0, -0.7, 0]}><boxGeometry args={[0.26, 1.5, 0.26]} /><meshStandardMaterial color="#d98c2b" metalness={0.4} roughness={0.5} /></mesh>
          {/* elbow */}
          <group position={[0, -1.4, 0]} rotation={[0, 0, 1.0]}>
            <mesh><sphereGeometry args={[0.18, 14, 14]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>
            <mesh position={[0, -0.6, 0]}><boxGeometry args={[0.2, 1.2, 0.2]} /><meshStandardMaterial color="#e8a23c" metalness={0.4} roughness={0.5} /></mesh>
            {/* gripper / welding head */}
            <group position={[0, -1.3, 0]}>
              <mesh><cylinderGeometry args={[0.12, 0.08, 0.22, 10]} /><meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} /></mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.08, -0.18, 0]} rotation={[0, 0, s * 0.25]}><boxGeometry args={[0.04, 0.22, 0.06]} /><meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.3} /></mesh>
              ))}
              {/* hot welding spark glow */}
              <mesh position={[0, -0.3, 0]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#fff" emissive="#79c8ff" emissiveIntensity={2.4} toneMapped={false} /></mesh>
              <pointLight position={[0, -0.3, 0]} color="#8fd2ff" intensity={2} distance={4} decay={2} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

// ─── Ezra's little companion drone (parked on a bench) ──────────────────────────
function Drone({ position, rotation = 0 }: {
  position: [number, number, number]; rotation?: number
}) {
  const ROTORS: [number, number][] = [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* hull */}
      <mesh castShadow><sphereGeometry args={[0.3, 18, 18]} /><meshStandardMaterial color="#ece9f2" roughness={0.35} metalness={0.1} /></mesh>
      <mesh position={[0, -0.12, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.26, 16, 16]} /><meshStandardMaterial color="#9fc4e2" roughness={0.4} /></mesh>
      {/* camera eye */}
      <mesh position={[0, -0.05, 0.26]}><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color="#1c2746" roughness={0.2} /></mesh>
      <mesh position={[0, -0.05, 0.32]}><circleGeometry args={[0.05, 16]} /><meshStandardMaterial color="#8fe3ff" emissive="#8fe3ff" emissiveIntensity={1.6} toneMapped={false} /></mesh>
      {/* underside indicator light */}
      <mesh position={[0, -0.24, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#00ff88" emissive={GLOW_COLOR} emissiveIntensity={2} toneMapped={false} /></mesh>
      <pointLight position={[0, -0.3, 0]} color="#8fe3ff" intensity={1.2} distance={4} decay={2} />
      {/* arms + rotors */}
      {ROTORS.map(([x, z], i) => (
        <group key={i} position={[x, 0.08, z]}>
          <mesh position={[x * 0.4, -0.04, z * 0.4]} rotation={[0, -Math.atan2(z, x), 0]}><boxGeometry args={[0.5, 0.05, 0.07]} /><meshStandardMaterial color="#27325c" metalness={0.4} roughness={0.5} /></mesh>
          <mesh><cylinderGeometry args={[0.05, 0.05, 0.1, 8]} /><meshStandardMaterial color="#27325c" metalness={0.4} roughness={0.5} /></mesh>
          <group position={[0, 0.08, 0]}>
            {[0, 1].map((b) => (
              <mesh key={b} rotation={[0, (b * Math.PI) / 2, 0]}><boxGeometry args={[0.42, 0.012, 0.06]} /><meshStandardMaterial color="#33384a" roughness={0.4} /></mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Static decor cluster
// ════════════════════════════════════════════════════════════════════════════

function WorkshopDecor() {
  return (
    <group>
      {/* Hanging bulbs spread across the larger ceiling */}
      <HangingBulb position={[-6, 7.8, 2]} />
      <HangingBulb position={[6, 7.8, -2]} />
      <HangingBulb position={[-10, 7.8, -9]} />
      <HangingBulb position={[12, 7.8, 6]} />

      {/* Interactive-object benches */}
      <Workbench position={[-4, 0, 5]} width={5.5} depth={2.6} rotation={0} />
      <Workbench position={[12, 0, -3]} width={6} depth={2.6} rotation={0} />
      {/* Extra benches against the walls */}
      <Workbench position={[17, 0, -10]} width={6} depth={2.4} rotation={-Math.PI / 2} />
      {/* Left-wall bench under the material pegboard (z = 8) */}
      <Workbench position={[-17, 0, 8]} width={6} depth={2.4} rotation={Math.PI / 2} />
      {/* Second left-wall bench on the other side of the idea board (z = -5),
          so the clickable board (z = 1.5) sits centred between the two benches */}
      <Workbench position={[-17, 0, -5]} width={6} depth={2.4} rotation={Math.PI / 2} />
      <group position={[-17, 2.91, -5]}>
        {/* stacked planks */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[(i % 2) * 0.08, 0.07 + i * 0.13, 1]} castShadow>
            <boxGeometry args={[0.45, 0.11, 2.4]} />
            <meshStandardMaterial color={i % 2 ? WOOD : WOOD_LIGHT} roughness={0.85} />
          </mesh>
        ))}
        {/* sheet of metal stock */}
        <mesh position={[-0.7, 0.05, 1]}><boxGeometry args={[0.6, 0.05, 2.2]} /><meshStandardMaterial color={METAL} metalness={0.5} roughness={0.4} /></mesh>
      </group>
      <PaintCan position={[-16.7, 3.16, -3.4]} color="#2b7de2" />
      <PaintCan position={[-17.4, 3.16, -3.1]} color="#c0392b" />
      <Crate position={[-17, 3.31, -6.6]} size={0.8} color={WOOD_DARK} />

      {/* Rug under the centre bench */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4, 0.02, 7]}><planeGeometry args={[9, 6]} /><meshStandardMaterial color="#5a3a52" roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4, 0.03, 7]}><planeGeometry args={[8.2, 5.2]} /><meshStandardMaterial color="#6b4a62" roughness={0.95} /></mesh>

      {/* Pegboards — hung on the wall above their workbenches */}
      <Pegboard position={[ROOM_W / 2 - 0.4, 6.2, -10]} rotation={-Math.PI / 2} width={6} height={4} />
      <Pegboard position={[-ROOM_W / 2 + 0.4, 6.2, 8]} rotation={Math.PI / 2} width={4} height={3.2} />

      {/* Shelf + framed blueprints + clock on the back wall (clear of the centred door) */}
      <Shelf position={[-6, 6.8, -ROOM_D / 2 + 0.4]} />
      <WallFrame position={[-10.5, 4.8, -ROOM_D / 2 + 0.15]} rotation={0} w={2.4} h={3} variant="gear" />
      <WallClock position={[13, 7.4, -ROOM_D / 2 + 0.2]} rotation={0} />

      {/* Framed blueprint + tool cabinet on the right wall */}
      <WallFrame position={[ROOM_W / 2 - 0.15, 6, 5]} rotation={-Math.PI / 2} w={2.6} h={3.2} color="#1a2d4a" variant="bulb" />
      <ToolCabinet position={[ROOM_W / 2 - 0.7, 1.5, 9]} rotation={-Math.PI / 2} />

      {/* Tool cabinet on the left wall (near the board) */}
      <ToolCabinet position={[-ROOM_W / 2 + 0.7, 1.5, -11]} rotation={Math.PI / 2} />

      {/* Crates / chaos in the back-left corner */}
      <Crate position={[-17, 0.65, -13]} size={1.3} />
      <Crate position={[-15.5, 0.55, -13.4]} size={1.1} color={WOOD_DARK} />
      <Crate position={[-17, 1.85, -13]} size={0.9} color={WOOD_LIGHT} />
      {/* Crates back-right */}
      <Crate position={[16.5, 0.7, 12]} size={1.4} />
      <Crate position={[15, 0.6, 13]} size={1.0} color={WOOD_DARK} />

      {/* Toolbox + cable spool on the floor */}
      <group position={[-1, 0.4, 9.5]}>
        <mesh castShadow><boxGeometry args={[1.6, 0.7, 0.8]} /><meshStandardMaterial color="#b23b2e" roughness={0.5} metalness={0.3} /></mesh>
        <mesh position={[0, 0.45, 0]}><boxGeometry args={[1.5, 0.2, 0.7]} /><meshStandardMaterial color="#8a2a20" roughness={0.5} /></mesh>
        <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.9, 8]} /><meshStandardMaterial color={METAL} metalness={0.7} /></mesh>
      </group>
      <mesh position={[8, 0.6, 10]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.32, 12, 24]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.9} />
      </mesh>

      {/* Ladder leaning on the right wall */}
      <Ladder position={[ROOM_W / 2 - 1.2, 0, -6]} rotation={-Math.PI / 2} lean={0.12} />

      {/* Paint / oil cans clustered */}
      <PaintCan position={[16, 0.25, 13.5]} color="#c0392b" />
      <PaintCan position={[16.6, 0.25, 12.9]} color="#2b7de2" />
      <PaintCan position={[15.4, 0.25, 13.1]} color="#e8c34a" />

      {/* Barrels / drums */}
      <Barrel position={[-18, 0.8, 13]} color="#3a6b4a" />
      <Barrel position={[18, 0.8, -14]} color="#7a4f2b" />

      {/* Stools pulled up to the workbenches */}
      <Stool position={[-5.5, 0, 6.9]} />
      <Stool position={[12.5, 0, -0.4]} />

      {/* Sawhorse + lumber stack (left side) */}
      <Sawhorse position={[-13, 0, 11]} rotation={0.3} />
      <LumberStack position={[-13, 0, 13.5]} rotation={0.1} />

      {/* Pipe runs near the ceiling */}
      <mesh position={[0, 9, -ROOM_D / 2 + 0.4]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, ROOM_W - 1, 12]} /><meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[ROOM_W / 2 - 0.4, 8.4, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.13, 0.13, ROOM_D - 1, 12]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>

      {/* Loose tools lying on the printer bench */}
      <group position={[12, 3.05, -3]}>
        <Tool type="wrench" position={[-2, 0, 0.5]} />
        <Tool type="screwdriver" position={[-1.4, 0, 0.8]} />
        <mesh position={[2, 0.06, 0.6]}><boxGeometry args={[0.5, 0.12, 0.7]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>
      </group>

      {/* ─── Ezra's robot assembly stations (spread around the room) ──────── */}
      {/* Four benches where Ezra builds her helper robots, each one a little
          further along: bare frame → half-assembled → finished. They are kept
          out of the central corridor so the path to the door stays clear. */}

      {/* Station 1 — bare metal frame (back-left, under the welding arm) */}
      <Workbench position={[-13, 0, -8]} width={4.2} depth={2} rotation={0.15} />
      <CuteRobot position={[-13, 2.91, -8]} rotation={0.33} scale={0.82} stage="frame" accent="#3a4a8a" />
      <Stool position={[-12.2, 0, -6.2]} />
      <Vise position={[-14.1, 2.91, -8.2]} rotation={0.4} />

      {/* Station 2 — half assembled, powered off (front-left) */}
      <Workbench position={[-11, 0, 9]} width={4.2} depth={2} rotation={0} />
      <CuteRobot position={[-11, 2.91, 9]} rotation={-0.15} scale={0.82} stage="partial" powered={false} accent="#7a3a6a" />
      <Stool position={[-10.4, 0, 10.8]} />
      <DeskLamp position={[-12.5, 2.91, 8.9]} rotation={0.5} />

      {/* Station 3 — half assembled, lit and testing (back-right) */}
      <Workbench position={[14, 0, -7]} width={4.2} depth={2} rotation={-0.2} />
      <CuteRobot position={[14, 2.91, -7]} rotation={-0.05} scale={0.82} stage="partial" accent="#2b7a5a" eyeColor="#aef0c0" />
      <Stool position={[13.1, 0, -5.3]} />
      <PartsBin position={[15.5, 2.91, -7.2]} rotation={-0.4} />

      {/* Station 4 — finished robot + its parked drone, ready to go (front-right) */}
      <Workbench position={[11, 0, 8]} width={4.2} depth={2} rotation={0.1} />
      <CuteRobot position={[10.3, 2.91, 8]} rotation={0.2} scale={0.82} stage="done" accent="#c98a3c" eyeColor="#ffd27a" />
      <Stool position={[10.3, 0, 9.8]} />
      {/* Ezra's companion drone, switched off, resting on the bench */}
      <Drone position={[12.3, 3, 8]} rotation={-0.5} />

      {/* Overhead welding arm — kept, now standing still above station 1 */}
      <CeilingArm position={[-13, 8.4, -8]} rotation={0} railLength={7} />

      {/* Finished helper robot standing guard on the floor (off to the side) */}
      <CuteRobot position={[5, 0, 11]} rotation={-2.4} scale={1.05} />

      {/* ─── Extra workshop realism ─────────────────────────────────────── */}
      {/* Bench vise + desk lamp + mug on the robot bench */}
      <Vise position={[-6.2, 2.91, 4.4]} rotation={0.3} />
      <DeskLamp position={[-2, 2.91, 4.4]} rotation={0.6} />
      <Mug position={[-3, 3.02, 6]} color="#3a9b5a" />
      {/* Desk lamp + parts bin around the printer bench */}
      <DeskLamp position={[10, 2.91, -3.6]} rotation={-0.5} />
      <PartsBin position={[ROOM_W / 2 - 0.45, 0.45, -6]} rotation={-Math.PI / 2} />
      {/* Soldering / scattered bolts on the materials bench */}
      <group position={[-17.4, 2.97, -3.8]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[(i % 3) * 0.18 - 0.18, 0.03, Math.floor(i / 3) * 0.18]}>
            <cylinderGeometry args={[0.05, 0.05, 0.06, 6]} /><meshStandardMaterial color={i % 2 ? BRASS : METAL} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
      {/* Standing fan in the front-right corner */}
      <Fan position={[17, 0, 6]} rotation={-2.4} />
      {/* Fire extinguisher near the back wall */}
      <FireExtinguisher position={[3.6, 0.45, -15.1]} />
      {/* Broom leaning against the right wall */}
      <Broom position={[18.6, 0, 6]} rotation={0} />
      {/* Wall socket + switch near the door */}
      <mesh position={[-3, 1.9, -ROOM_D / 2 + 0.12]}><boxGeometry args={[0.34, 0.5, 0.06]} /><meshStandardMaterial color="#e8e0d0" roughness={0.7} /></mesh>
      <mesh position={[-3, 1.78, -ROOM_D / 2 + 0.16]}><boxGeometry args={[0.16, 0.16, 0.04]} /><meshStandardMaterial color="#cfc7b5" /></mesh>
      <mesh position={[-3, 2.02, -ROOM_D / 2 + 0.16]}><boxGeometry args={[0.16, 0.16, 0.04]} /><meshStandardMaterial color="#cfc7b5" /></mesh>
      {/* Coiled hose/cable hanging on the right wall */}
      <mesh position={[ROOM_W / 2 - 0.3, 4, -13]} rotation={[0, -Math.PI / 2, 0]}><torusGeometry args={[0.55, 0.1, 10, 28]} /><meshStandardMaterial color="#2a2a2a" roughness={0.8} /></mesh>
      <mesh position={[ROOM_W / 2 - 0.3, 4, -13]} rotation={[0, -Math.PI / 2, 0]}><torusGeometry args={[0.36, 0.1, 10, 28]} /><meshStandardMaterial color="#2a2a2a" roughness={0.8} /></mesh>
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Interactive object 1 — IDEA / BLUEPRINT BOARD  (key: "board")
// ════════════════════════════════════════════════════════════════════════════

interface InteractiveProps { active: boolean; completed: boolean; onClick: () => void }

const BOARD_NOTES = [
  { t: "EZRA'S UITVINDINGEN", x: 0,    y: 1.95, s: 0.42, c: "#ffe84a" },
  { t: "Robot v3  ⚙", x: -2.3, y: 1.25, s: 0.3,  c: "#ffffff" },
  { t: "→ kan trappen lopen?", x: -2.0, y: 0.92, s: 0.2, c: "#9fe8ff" },
  { t: "Vliegende fiets", x: 1.6, y: 1.3, s: 0.3, c: "#ffffff" },
  { t: "lucht + pedalen = ?", x: 1.6, y: 0.98, s: 0.2, c: "#9fe8ff" },
  { t: " TO-DO", x: -2.6, y: 0.2, s: 0.26, c: "#ff9f6a" },
  { t: "• soldeer arm", x: -2.3, y: -0.15, s: 0.2, c: "#e8e0d0" },
  { t: "• test motor", x: -2.3, y: -0.5, s: 0.2, c: "#e8e0d0" },
  { t: "• meer tape!!", x: -2.3, y: -0.85, s: 0.2, c: "#ffe84a" },
  { t: "alles kan, als", x: 1.4, y: -0.4, s: 0.24, c: "#88f0a0" },
  { t: "je het probeert", x: 1.4, y: -0.72, s: 0.24, c: "#88f0a0" },
]

function IdeaBoard({ active, completed, onClick }: InteractiveProps) {
  const [hovered, setHovered] = useState(false)
  const hoverP = useRef(0)
  const barMats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const lightRef = useRef<THREE.PointLight>(null!)

  useEffect(() => { if (!active) document.body.style.cursor = "auto" }, [active])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    hoverP.current = THREE.MathUtils.damp(hoverP.current, hovered ? 1 : 0, 8, delta)
    const eint = glowEmissive(t, active, completed, hoverP.current)
    for (const m of barMats.current) { if (m) m.emissiveIntensity = eint }
    if (lightRef.current) lightRef.current.intensity = glowLight(t, active, completed, hoverP.current)
  })

  const W = 6.6, H = 4.6, t = 0.22
  const bars: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0,  H / 2, 0], size: [W + t, t, 0.3] },
    { pos: [0, -H / 2, 0], size: [W + t, t, 0.3] },
    { pos: [-W / 2, 0, 0], size: [t, H, 0.3] },
    { pos: [ W / 2, 0, 0], size: [t, H, 0.3] },
  ]

  return (
    <group position={BOARD_POS} rotation={[0, Math.PI / 2, 0]}>
      <pointLight ref={lightRef} position={[0, 0, 1.6]} color={GLOW_COLOR} intensity={0} distance={9} decay={2} />

      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[W, H, 0.18]} />
        <meshStandardMaterial color="#b98a52" roughness={0.95} />
      </mesh>
      <mesh position={[-1.4, 0.6, 0.06]} rotation={[0, 0, 0.04]}><planeGeometry args={[2.4, 2.6]} /><meshStandardMaterial color="#1f3a52" roughness={0.8} /></mesh>
      <mesh position={[1.6, 0.5, 0.07]} rotation={[0, 0, -0.05]}><planeGeometry args={[2.3, 2.4]} /><meshStandardMaterial color="#1f3a52" roughness={0.8} /></mesh>
      <mesh position={[-1.7, -0.6, 0.09]} rotation={[0, 0, -0.03]}><planeGeometry args={[1.8, 1.5]} /><meshStandardMaterial color="#f3ecd8" roughness={0.9} /></mesh>

      {BOARD_NOTES.map((n, i) => (
        <Text key={i} font="/Caveat-Regular.ttf" position={[n.x, n.y, 0.14]} fontSize={n.s} color={n.c}
          anchorX="center" anchorY="middle" maxWidth={5}>{n.t}</Text>
      ))}

      {bars.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial
            ref={(m) => { barMats.current[i] = m }}
            color={WOOD_DARK} emissive={GLOW_COLOR} emissiveIntensity={0}
            roughness={0.6} toneMapped={false}
          />
        </mesh>
      ))}

      {active && (
        <mesh
          position={[0, 0, 0.4]}
          onClick={(e) => { e.stopPropagation(); onClick() }}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer" }}
          onPointerOut={() =>  { setHovered(false); document.body.style.cursor = "auto" }}
        >
          <boxGeometry args={[W, H, 0.8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Interactive object 2 — HALF-BUILT ROBOT  (key: "clock")
// ════════════════════════════════════════════════════════════════════════════

function RobotBuild({ active, completed, onClick }: InteractiveProps) {
  const [hovered, setHovered] = useState(false)
  const hoverP = useRef(0)
  const glowMats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const lightRef = useRef<THREE.PointLight>(null!)
  const eyeRef   = useRef<THREE.MeshStandardMaterial>(null!)

  useEffect(() => { if (!active) document.body.style.cursor = "auto" }, [active])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    hoverP.current = THREE.MathUtils.damp(hoverP.current, hovered ? 1 : 0, 8, delta)
    const eint = glowEmissive(t, active, completed, hoverP.current)
    for (const m of glowMats.current) { if (m) m.emissiveIntensity = eint }
    if (lightRef.current) lightRef.current.intensity = glowLight(t, active, completed, hoverP.current)
    if (eyeRef.current) eyeRef.current.emissiveIntensity = 1.2 + glowBreath(t * 1.4) * 0.8
  })

  return (
    <group position={ROBOT_POS}>
      <pointLight ref={lightRef} position={[0, 1.2, 0.6]} color={GLOW_COLOR} intensity={0} distance={6} decay={2} />

      <mesh position={[0, 0.08, 0]}><boxGeometry args={[1.8, 0.16, 1.6]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>

      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[1.2, 1.5, 1.0]} />
        <meshStandardMaterial ref={(m) => { glowMats.current[0] = m }} color="#9aa3ad" emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.5} roughness={0.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.75, 0.52]}><boxGeometry args={[0.7, 0.6, 0.06]} /><meshStandardMaterial color="#10130f" /></mesh>
      {([["#e8c34a", -0.2], ["#c0392b", 0], ["#2b92e2", 0.2]] as const).map(([c, x], i) => (
        <mesh key={i} position={[x, 0.75, 0.56]} rotation={[0, 0, i * 0.4]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
          <meshStandardMaterial color={c} roughness={0.6} />
        </mesh>
      ))}

      <mesh position={[0, 2.05, 0]} castShadow>
        <boxGeometry args={[0.85, 0.7, 0.8]} />
        <meshStandardMaterial ref={(m) => { glowMats.current[1] = m }} color="#b6bdc6" emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.5} roughness={0.4} toneMapped={false} />
      </mesh>
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={i} position={[x, 2.1, 0.42]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          {i === 0
            ? <meshStandardMaterial ref={eyeRef} color="#cfffe8" emissive={TEAL} emissiveIntensity={1.5} toneMapped={false} />
            : <meshStandardMaterial color="#cfffe8" emissive={TEAL} emissiveIntensity={1.5} toneMapped={false} />}
        </mesh>
      ))}
      <mesh position={[0, 2.55, 0]}><cylinderGeometry args={[0.02, 0.02, 0.4, 6]} /><meshStandardMaterial color={METAL} metalness={0.8} /></mesh>
      <mesh position={[0, 2.78, 0]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color="#ff5a3c" emissive="#ff3c1e" emissiveIntensity={1.4} toneMapped={false} /></mesh>

      <group position={[-0.75, 1.2, 0]} rotation={[0, 0, 0.3]}>
        <mesh><cylinderGeometry args={[0.12, 0.12, 1.0, 10]} /><meshStandardMaterial ref={(m) => { glowMats.current[2] = m }} color="#9aa3ad" emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.5} roughness={0.4} toneMapped={false} /></mesh>
        <mesh position={[0, -0.6, 0]}><sphereGeometry args={[0.16, 10, 10]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} /></mesh>
      </group>
      <mesh position={[1.4, 0.18, 0.3]} rotation={[Math.PI / 2, 0, 0.5]}>
        <cylinderGeometry args={[0.12, 0.12, 1.0, 10]} />
        <meshStandardMaterial color="#9aa3ad" metalness={0.5} roughness={0.4} />
      </mesh>

      {[-0.32, 0.32].map((x, i) => (
        <mesh key={i} position={[x, 0.32, 0]}><boxGeometry args={[0.32, 0.5, 0.42]} /><meshStandardMaterial color={METAL_DARK} metalness={0.5} roughness={0.5} /></mesh>
      ))}

      {active && (
        <mesh
          position={[0, 1.3, 0]}
          onClick={(e) => { e.stopPropagation(); onClick() }}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer" }}
          onPointerOut={() =>  { setHovered(false); document.body.style.cursor = "auto" }}
        >
          <boxGeometry args={[1.8, 2.8, 1.4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Interactive object 3 — 3D PRINTER  (key: "book")
// ════════════════════════════════════════════════════════════════════════════

function Printer3D({ active, completed, onClick }: InteractiveProps) {
  const [hovered, setHovered] = useState(false)
  const hoverP = useRef(0)
  const glowMats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const lightRef = useRef<THREE.PointLight>(null!)
  const headRef  = useRef<THREE.Group>(null!)

  useEffect(() => { if (!active) document.body.style.cursor = "auto" }, [active])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    hoverP.current = THREE.MathUtils.damp(hoverP.current, hovered ? 1 : 0, 8, delta)
    const eint = glowEmissive(t, active, completed, hoverP.current)
    for (const m of glowMats.current) { if (m) m.emissiveIntensity = eint }
    if (lightRef.current) lightRef.current.intensity = glowLight(t, active, completed, hoverP.current)
    if (headRef.current) headRef.current.position.x = Math.sin(t * 1.2) * 0.6
  })

  const S = 1.9

  return (
    <group position={PRINTER_POS}>
      <pointLight ref={lightRef} position={[0, 1.3, 0.8]} color={GLOW_COLOR} intensity={0} distance={6} decay={2} />

      <mesh position={[0, 0.15, 0]}><boxGeometry args={[S + 0.2, 0.3, S + 0.2]} /><meshStandardMaterial color={METAL_DARK} metalness={0.5} roughness={0.4} /></mesh>

      {([[-S / 2, -S / 2], [S / 2, -S / 2], [-S / 2, S / 2], [S / 2, S / 2]] as const).map(([x, z], i) => (
        <mesh key={i} position={[x, 1.2, z]}>
          <boxGeometry args={[0.12, 2.0, 0.12]} />
          <meshStandardMaterial ref={(m) => { glowMats.current[i] = m }} color={METAL} emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.6} roughness={0.3} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 2.2, -S / 2]}><boxGeometry args={[S, 0.12, 0.12]} /><meshStandardMaterial ref={(m) => { glowMats.current[4] = m }} color={METAL} emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.6} roughness={0.3} toneMapped={false} /></mesh>
      <mesh position={[0, 2.2, S / 2]}><boxGeometry args={[S, 0.12, 0.12]} /><meshStandardMaterial ref={(m) => { glowMats.current[5] = m }} color={METAL} emissive={GLOW_COLOR} emissiveIntensity={0} metalness={0.6} roughness={0.3} toneMapped={false} /></mesh>

      <group ref={headRef} position={[0, 1.5, 0]}>
        <mesh position={[0, 0, 0]}><boxGeometry args={[0.3, 0.3, S]} /><meshStandardMaterial color="#222" metalness={0.5} /></mesh>
        <mesh position={[0, -0.2, 0]}><coneGeometry args={[0.1, 0.25, 10]} /><meshStandardMaterial color={BRASS} emissive="#ff7a2c" emissiveIntensity={1.2} toneMapped={false} /></mesh>
      </group>

      <mesh position={[0, 0.55, 0]}><boxGeometry args={[S - 0.3, 0.08, S - 0.3]} /><meshStandardMaterial color="#15171a" roughness={0.3} /></mesh>
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.32, 0.4, 0.4, 6]} />
        <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.8} transparent opacity={0.85} toneMapped={false} />
      </mesh>

      <mesh position={[S / 2 + 0.25, 1.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.32, 0.14, 10, 20]} />
        <meshStandardMaterial color="#e8c34a" roughness={0.5} />
      </mesh>

      {active && (
        <mesh
          position={[0, 1.2, 0]}
          onClick={(e) => { e.stopPropagation(); onClick() }}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer" }}
          onPointerOut={() =>  { setHovered(false); document.body.style.cursor = "auto" }}
        >
          <boxGeometry args={[S + 0.4, 2.4, S + 0.4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
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
    lightRef.current.intensity = !visible ? 0
      : unlocked ? (hovered ? 22 : 3 + pulse * 9)
      : 0.4 + pulse * 1.8
  })

  if (!visible) return null

  const col      = unlocked ? "#00e87a" : "#cc2222"
  const emissive = unlocked ? (hovered ? 2.5 : 0.8) : 0.3
  const shacklePos: [number, number, number] = unlocked ? [0.55, 1.1, 0] : [0, 0.78, 0]
  const shackleRot: [number, number, number] = unlocked ? [0, 0, 0.65]   : [0, 0, 0]

  return (
    <group position={DOOR_POS}>
      <pointLight ref={lightRef} position={[0, 0, 1.2]} distance={10} decay={2} intensity={0} />

      {/* Door frame */}
      <mesh position={[0, 0.1, -0.35]}><boxGeometry args={[4.2, 6.6, 0.3]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.85} /></mesh>

      <mesh position={[0, 0, -0.2]}>
        <boxGeometry args={[3.6, 6.2, 0.3]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      {[-1.1, 0, 1.1].map((x) => (
        <mesh key={x} position={[x, 0, -0.03]}><boxGeometry args={[0.08, 6.2, 0.32]} /><meshStandardMaterial color={WOOD_DARK} roughness={0.85} /></mesh>
      ))}
      {[-1.8, 1.8].map((y) => (
        <mesh key={y} position={[0, y, 0]}><boxGeometry args={[3.6, 0.25, 0.34]} /><meshStandardMaterial color={METAL_DARK} metalness={0.6} roughness={0.4} /></mesh>
      ))}

      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[1.2, 1.5, 0.55]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={emissive} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.15, 0.4]}><circleGeometry args={[0.18, 20]} /><meshBasicMaterial color="#000a14" /></mesh>
      <mesh position={[0, -0.14, 0.4]}><boxGeometry args={[0.12, 0.30, 0.01]} /><meshBasicMaterial color="#000a14" /></mesh>
      <group position={shacklePos} rotation={shackleRot}>
        <mesh position={[0, 0, 0.1]}>
          <torusGeometry args={[0.40, 0.13, 10, 20, Math.PI]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={emissive} metalness={0.85} roughness={0.15} />
        </mesh>
      </group>

      {unlocked && (
        <mesh
          position={[0, 0, 0.6]}
          onClick={(e) => { e.stopPropagation(); onDoorClick() }}
          onPointerOver={() => { document.body.style.cursor = "pointer"; setHovered(true) }}
          onPointerOut={() =>  { document.body.style.cursor = "auto";    setHovered(false) }}
        >
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Lighting
// ════════════════════════════════════════════════════════════════════════════

function WorkshopLighting({ answerState }: { answerState: AnswerState }) {
  const correctGlow = answerState === "correct"
  return (
    <>
      <ambientLight intensity={1.3} color="#f0dcc0" />
      <hemisphereLight intensity={0.8} color="#fff2dc" groundColor="#6b5a44" />
      {/* warm key from the front */}
      <pointLight position={[0, 7, 12]} intensity={7} color="#ffd9a0" distance={34} decay={2} />
      {/* daylight through the window */}
      <directionalLight position={[10, 10, -12]} intensity={1.4} color="#cfe2f2" />
      {/* cool rim near the window */}
      <pointLight position={[8, 6, -13]} intensity={4.5} color="#9fc4e2" distance={24} decay={2} />
      {/* bounce fills for the wide room */}
      <pointLight position={[-12, 5, 2]} intensity={3.6} color="#e8c89a" distance={24} decay={2} />
      <pointLight position={[14, 5, 4]} intensity={3.2} color="#e8c89a" distance={24} decay={2} />
      <spotLight position={[-4, 9.5, 8]} angle={0.6} penumbra={0.6} intensity={5} color="#fff0d8" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={1} shadow-camera-far={26} />
      {correctGlow && (
        <>
          <pointLight position={[0, 4, 2]} intensity={5} color={GLOW_COLOR} distance={16} />
          <pointLight position={[0, 1.5, 0]} intensity={3} color={TEAL} distance={12} />
        </>
      )}
    </>
  )
}

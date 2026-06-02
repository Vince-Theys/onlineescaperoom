import { useRef, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface Props {
  targetPos: [number, number, number]
  targetLookAt: [number, number, number]
  exploring: boolean
  lerpFactor?: number   // default 0.013; raise for faster transitions (e.g. door phase)
}

const YAW_LIMIT = 1.1
const PITCH_UP = 0.35
const PITCH_DOWN = 0.25

/**
 * Smooth camera controller with drag-to-look in exploring mode.
 */
export default function RoomCamera({ targetPos, targetLookAt, exploring, lerpFactor = 0.013 }: Props) {
  const { camera, gl } = useThree()

  const currentPos = useRef(new THREE.Vector3(...targetPos))
  const currentLook = useRef(new THREE.Vector3(...targetLookAt))
  const tPos = useRef(new THREE.Vector3(...targetPos))
  const tLook = useRef(new THREE.Vector3(...targetLookAt))

  const drag = useRef({ active: false, lastX: 0, lastY: 0 })
  const look = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    tPos.current.set(...targetPos)
    tLook.current.set(...targetLookAt)
  }, [targetPos, targetLookAt])

  // Pointer drag
  useEffect(() => {
    const el = gl.domElement
    const onDown = (e: PointerEvent) => {
      if (!exploring) return
      drag.current = { active: true, lastX: e.clientX, lastY: e.clientY }
    }
    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return
      const dx = e.clientX - drag.current.lastX
      const dy = e.clientY - drag.current.lastY
      drag.current.lastX = e.clientX
      drag.current.lastY = e.clientY
      look.current.yaw = Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, look.current.yaw - dx * 0.006))
      look.current.pitch = Math.max(-PITCH_DOWN, Math.min(PITCH_UP, look.current.pitch + dy * 0.004))
    }
    const onUp = () => { drag.current.active = false }

    el.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      el.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [exploring, gl.domElement])

  // Reset look when entering focused mode
  useEffect(() => {
    if (!exploring) {
      look.current.yaw = 0
      look.current.pitch = 0
    }
  }, [exploring])

  useFrame(({ clock }) => {
    currentPos.current.lerp(tPos.current, lerpFactor)
    currentLook.current.lerp(tLook.current, lerpFactor)
    camera.position.copy(currentPos.current)

    if (exploring) {
      const t = clock.getElapsedTime()
      const swayX = drag.current.active ? 0 : Math.sin(t * 0.2) * 0.08
      const swayY = drag.current.active ? 0 : Math.cos(t * 0.15) * 0.05

      const base = currentLook.current
      const forward = base.clone().sub(camera.position).normalize()
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
      const up = new THREE.Vector3().crossVectors(right, forward).normalize()
      const dist = camera.position.distanceTo(base) || 6
      const oX = right.clone().multiplyScalar(Math.sin(look.current.yaw) * dist)
      const oY = up.clone().multiplyScalar(Math.sin(look.current.pitch) * dist)

      camera.lookAt(
        base.x + oX.x + oY.x + swayX,
        base.y + oX.y + oY.y + swayY,
        base.z + oX.z + oY.z,
      )
    } else {
      camera.lookAt(currentLook.current)
    }
  })

  return null
}

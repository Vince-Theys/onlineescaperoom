import { useCallback, useEffect, useRef, useState } from "react"

// ── Color utilities ────────────────────────────────────────────────────────────

function hsvToHex(h: number, s: number, v: number): string {
  const sv = s / 100
  const vv = v / 100
  const hi = Math.floor(h / 60) % 6
  const f = h / 60 - Math.floor(h / 60)
  const p = vv * (1 - sv)
  const q = vv * (1 - f * sv)
  const t = vv * (1 - (1 - f) * sv)
  const channels: [number, number, number][] = [
    [vv, t, p],
    [q, vv, p],
    [p, vv, t],
    [p, q, vv],
    [t, p, vv],
    [vv, p, q],
  ]
  const [r, g, b] = channels[hi].map((x) => Math.round(x * 255))
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`
}

function hexToHsv(hex: string): [number, number, number] {
  const clean = hex.replace("#", "")
  if (clean.length !== 6) return [0, 0, 100]
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  let h = 0
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) % 6
    else if (max === g) h = (b - r) / diff + 2
    else h = (r - g) / diff + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  return [h, max === 0 ? 0 : Math.round((diff / max) * 100), Math.round(max * 100)]
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  value: string
  onChange: (hex: string) => void
  onClose: () => void
}

export default function ColorPickerPopover({ value, onChange, onClose }: Props) {
  const [hue, setHue] = useState(() => hexToHsv(value)[0])
  const [sat, setSat] = useState(() => hexToHsv(value)[1])
  const [val, setVal] = useState(() => hexToHsv(value)[2])
  const [hexInput, setHexInput] = useState(value)

  const gradientRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // Close on outside click
  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", onPointer)
    return () => document.removeEventListener("mousedown", onPointer)
  }, [onClose])

  // ── Emitters ──────────────────────────────────────────────────────────────

  function emit(h: number, s: number, v: number) {
    const hex = hsvToHex(h, s, v)
    setHexInput(hex)
    onChange(hex)
  }

  // ── Gradient drag ─────────────────────────────────────────────────────────

  const updateFromGradient = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!gradientRef.current) return
      const rect = gradientRef.current.getBoundingClientRect()
      const newSat = Math.round(
        Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100
      )
      const newVal = Math.round(
        (1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))) * 100
      )
      setSat(newSat)
      setVal(newVal)
      emit(hue, newSat, newVal)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hue]
  )

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragging.current) updateFromGradient(e)
    }
    function onUp() {
      dragging.current = false
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
  }, [updateFromGradient])

  // ── Hue slider ────────────────────────────────────────────────────────────

  function handleHueChange(newHue: number) {
    setHue(newHue)
    emit(newHue, sat, val)
  }

  // ── Hex input ─────────────────────────────────────────────────────────────

  function handleHexInput(raw: string) {
    const hex = raw.startsWith("#") ? raw : `#${raw}`
    setHexInput(hex)
    if (isValidHex(hex)) {
      const [h, s, v] = hexToHsv(hex)
      setHue(h)
      setSat(s)
      setVal(v)
      onChange(hex)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const currentHex = hsvToHex(hue, sat, val)
  const pureHue = hsvToHex(hue, 100, 100)

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-[calc(100%+8px)] z-50 flex w-60 flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-2xl shadow-black/50"
    >
      <style>{`
        .color-picker-hue::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 1px 4px rgba(0,0,0,0.6);
          cursor: pointer;
        }
        .color-picker-hue::-moz-range-thumb {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 1px 4px rgba(0,0,0,0.6);
          cursor: pointer;
        }
        .color-picker-hue::-webkit-slider-runnable-track { border-radius: 999px; }
        .color-picker-hue::-moz-range-track { border-radius: 999px; }
      `}</style>

      {/* Gradient area */}
      <div
        ref={gradientRef}
        onMouseDown={(e) => {
          dragging.current = true
          updateFromGradient(e)
        }}
        className="relative h-36 w-full cursor-crosshair select-none overflow-hidden rounded-lg"
        style={{
          background: `
            linear-gradient(to bottom, transparent, #000),
            linear-gradient(to right, #fff, ${pureHue})
          `,
        }}
      >
        {/* Picker thumb */}
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{
            left: `${sat}%`,
            top: `${100 - val}%`,
            background: currentHex,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.5)",
          }}
        />
      </div>

      {/* Hue slider */}
      <input
        type="range"
        min={0}
        max={359}
        value={hue}
        onChange={(e) => handleHueChange(Number(e.target.value))}
        className="color-picker-hue h-3 w-full cursor-pointer appearance-none rounded-full border-0 outline-none"
        style={{
          background:
            "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
        }}
      />

      {/* Preview + hex input */}
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 shrink-0 rounded-lg border border-border shadow-sm"
          style={{ background: currentHex }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexInput(e.target.value)}
          spellCheck={false}
          maxLength={7}
          className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-accent"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

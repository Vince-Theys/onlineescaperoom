import { useState } from "react"
import { PRESET_TINTS } from "@/lib/floorConstants"
import ColorPickerPopover from "./ColorPickerPopover"

interface Props {
  value: string | null
  onChange: (hex: string) => void
}

export default function TintSwatchPicker({ value, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const isCustom = value !== null && !PRESET_TINTS.includes(value)

  return (
    <div className="flex items-center gap-1.5">
      {PRESET_TINTS.map((hex) => {
        const selected = value === hex
        return (
          <button
            key={hex}
            type="button"
            title={hex}
            onClick={() => onChange(hex)}
            className={`h-6 w-6 rounded-full transition-transform duration-100 ${
              selected
                ? "ring-2 ring-white ring-offset-2 ring-offset-background"
                : "hover:scale-105"
            }`}
            style={{ background: hex }}
          />
        )
      })}

      {/* Custom colour swatch — shows "+" until a custom colour is picked */}
      <div className="relative">
        <button
          type="button"
          title={isCustom ? (value ?? "Aangepaste kleur") : "Aangepaste kleur kiezen"}
          onClick={() => setPickerOpen((o) => !o)}
          className={`flex h-6 w-6 items-center justify-center rounded-full border transition-transform duration-100 ${
            isCustom
              ? "ring-2 ring-white ring-offset-2 ring-offset-background"
              : "border-dashed border-muted-foreground/40 text-muted-foreground hover:scale-105 hover:border-foreground/60 hover:text-foreground"
          }`}
          style={isCustom ? { background: value ?? undefined } : undefined}
        >
          {!isCustom && (
            <span className="text-[11px] font-bold leading-none">+</span>
          )}
        </button>

        {pickerOpen && (
          <ColorPickerPopover
            value={isCustom ? (value ?? "#ffffff") : "#ffffff"}
            onChange={(hex) => onChange(hex)}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

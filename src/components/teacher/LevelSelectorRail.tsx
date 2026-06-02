import { useEffect, useId, useState } from "react"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Minus, Plus, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { QuestionWithOptions } from "@/types"
import { getFloorDefaults, getFloorDefaultsById } from "@/lib/floorConstants"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Props {
  questions: QuestionWithOptions[]
  selectedLevel: number
  levelCount: number
  loading: boolean
  onSelectLevel: (level: number) => void
  onIncrease: () => void
  onDecrease: () => void
  onReorder: (orderedQuestionIds: (string | null)[]) => void
  busy: boolean
}

// Each slot has a stable ID for dnd-kit and the question (if any) at that slot
interface Slot {
  id: string           // stable, never changes: "slot-1", "slot-2", …
  question: QuestionWithOptions | null
  defaultTint: string  // snapshot of default tint at time of building, so drag doesn't change it
  defaultName: string
  defaultTheme: string
}

function SortableSlot({
  slot,
  index,
  isActive,
  onSelect,
}: {
  slot: Slot
  index: number        // 0-based position in the current order
  isActive: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slot.id })

  const displayLevel = index + 1
  const q = slot.question
  const tint = q?.room_tint ?? slot.defaultTint
  const name = q?.room_name ?? slot.defaultName
  const theme = q?.room_theme ?? slot.defaultTheme
  const iconName = q?.room_icon ?? null
  const Ic = iconName ? (Icons as unknown as Record<string, LucideIcon>)[iconName] : null

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-1"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        tabIndex={-1}
        aria-label="Slepen om te herordenen"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <Button
        type="button"
        variant="ghost"
        onClick={onSelect}
        className={`flex flex-1 items-center gap-3 rounded-lg border px-3 py-4 text-left transition-colors ${
          isActive
            ? "border-accent/20 bg-accent/10 hover:bg-accent/10"
            : "border-transparent hover:bg-accent/5"
        }`}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold"
          style={{ background: tint, color: "#001833" }}
        >
          {Ic ? <Ic size={13} /> : `0${displayLevel}`}
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{name}</div>
          {theme && (
            <div className="truncate text-xs text-muted-foreground">{theme}</div>
          )}
        </div>

        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            q ? "bg-accent" : "bg-muted-foreground/30"
          }`}
        />
      </Button>
    </div>
  )
}

function buildSlots(
  questions: QuestionWithOptions[],
  levelCount: number,
  prefix: string
): Slot[] {
  const sorted = [...questions].sort((a, b) => a.level_number - b.level_number)
  return Array.from({ length: Math.max(levelCount, 1) }, (_, i) => {
    const q = sorted[i] ?? null
    const d = q ? getFloorDefaultsById(q.id, i + 1) : getFloorDefaults(i + 1)
    return {
      id: `${prefix}-slot-${i + 1}`,
      question: q,
      defaultTint: d.tint,
      defaultName: d.name,
      defaultTheme: d.theme ?? "",
    }
  })
}

export default function LevelSelectorRail({
  questions,
  selectedLevel,
  levelCount,
  loading,
  onSelectLevel,
  onIncrease,
  onDecrease,
  onReorder,
  busy,
}: Props) {
  const prefix = useId()

  const [slots, setSlots] = useState<Slot[]>(() => buildSlots(questions, levelCount, prefix))

  // Sync when parent data changes
  useEffect(() => {
    const t = setTimeout(() => setSlots(buildSlots(questions, levelCount, prefix)), 0)
    return () => clearTimeout(t)
  }, [questions, levelCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = slots.findIndex((s) => s.id === active.id)
    const newIndex = slots.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(slots, oldIndex, newIndex)
    setSlots(reordered)
    onReorder(reordered.map((s) => s.question?.id ?? null))
  }

  const levels = Array.from({ length: Math.max(levelCount, 1) }, (_, i) => i + 1)

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Kamers
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrease}
            disabled={levelCount <= 1 || busy}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-foreground">
            {levelCount}
          </span>
          <button
            type="button"
            onClick={onIncrease}
            disabled={levelCount >= 10 || busy}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-2">
        {loading ? (
          levels.map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={slots.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {slots.map((slot, index) => (
                <SortableSlot
                  key={slot.id}
                  slot={slot}
                  index={index}
                  isActive={selectedLevel === index + 1}
                  onSelect={() => onSelectLevel(index + 1)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

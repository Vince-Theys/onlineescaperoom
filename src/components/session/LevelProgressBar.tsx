import { Lock } from "lucide-react"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { AnswerState, QuestionWithOptions } from "@/types"
import { getFloorDefaults } from "@/lib/floorConstants"

interface Props {
  currentLevel: number
  totalLevels: number
  answerState: AnswerState
  questions: QuestionWithOptions[]
}

export default function LevelProgressBar({
  currentLevel,
  totalLevels,
  answerState,
  questions,
}: Props) {
  const iconSize = totalLevels <= 4 ? 28 : totalLevels <= 6 ? 24 : totalLevels <= 8 ? 20 : 18
  const boxSize  = iconSize + 24
  const itemGap  = totalLevels <= 5 ? "gap-8" : totalLevels <= 7 ? "gap-5" : "gap-4"

  return (
    <div className="mb-8 flex flex-col items-center gap-5">
      {/* Level counter */}
      <p
        className="font-bold tracking-[0.25em] uppercase"
        style={{ fontSize: "1.1rem", color: "rgba(43,194,226,0.7)" }}
      >
        Kamer {currentLevel} van {totalLevels}
      </p>

      {/* Room slots */}
      <div className={`flex items-start justify-center ${itemGap}`}>
        {Array.from({ length: totalLevels }, (_, i) => {
          const level = i + 1
          const isCompleted = level < currentLevel
          const isCurrent   = level === currentLevel
          const isJustUnlocked = isCurrent && answerState === "correct"
          const isLocked    = level > currentLevel

          const q = questions.find((qn) => qn.level_number === level)
          const d = getFloorDefaults(level)
          const name     = q?.room_name ?? d.name
          const iconName = (!isLocked && (q?.room_icon ?? null))
          const RoomIcon = iconName
            ? (Icons as unknown as Record<string, LucideIcon>)[iconName]
            : null

          // ── colours ──────────────────────────────────────────────────────
          const iconColor = isCompleted || isJustUnlocked
            ? "#2bc2e2"
            : isCurrent
              ? "#ffffff"
              : "rgba(255,255,255,0.22)"

          const nameColor = isCompleted || isJustUnlocked
            ? "rgba(43,194,226,0.85)"
            : isCurrent
              ? "rgba(255,255,255,0.95)"
              : "rgba(255,255,255,0.2)"

          // ── icon box styles (same shape for every state) ─────────────────
          const boxBg = isCompleted || isJustUnlocked
            ? "rgba(43,194,226,0.1)"
            : isCurrent
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.03)"

          const boxBorder = isCompleted || isJustUnlocked
            ? "1px solid rgba(43,194,226,0.3)"
            : isCurrent
              ? "1px solid rgba(255,255,255,0.18)"
              : "1px solid rgba(255,255,255,0.07)"

          const boxShadow = isJustUnlocked
            ? "0 0 24px rgba(43,194,226,0.7), 0 0 48px rgba(43,194,226,0.3)"
            : isCompleted
              ? "0 0 10px rgba(43,194,226,0.2)"
              : isCurrent
                ? "0 0 16px rgba(43,194,226,0.35)"
                : "none"

          const scale = isCurrent ? "scale(1.1)" : "scale(1)"

          return (
            <div
              key={level}
              className="flex flex-col items-center gap-2.5"
              style={{ width: `${Math.min(76, 520 / totalLevels)}px` }}
            >
              {/* Icon box — identical shape for all states */}
              <div
                style={{
                  width: boxSize,
                  height: boxSize,
                  borderRadius: "14px",
                  background: boxBg,
                  border: boxBorder,
                  boxShadow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: iconColor,
                  transform: scale,
                  transition: "all 0.5s ease",
                  flexShrink: 0,
                }}
              >
                {isLocked
                  ? <Lock size={iconSize} strokeWidth={1.5} />
                  : RoomIcon
                    ? <RoomIcon size={iconSize} strokeWidth={1.5} />
                    : <Lock size={iconSize} strokeWidth={1.5} style={{ opacity: 0.4 }} />
                }
              </div>

              {/* Room name */}
              <p
                className="text-center font-semibold leading-tight"
                style={{
                  fontSize: totalLevels <= 6 ? "0.68rem" : "0.6rem",
                  color: nameColor,
                  letterSpacing: "0.02em",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  transition: "color 0.5s ease",
                }}
              >
                {name}
              </p>
            </div>
          )
        })}
      </div>

      {/* Progress line */}
      <div
        className="relative h-px w-full max-w-lg overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: totalLevels === 1
              ? "100%"
              : `${((currentLevel - 1) / (totalLevels - 1)) * 100}%`,
            background: "linear-gradient(90deg, #13a7db, #2bc2e2)",
            boxShadow: "0 0 8px rgba(43,194,226,0.6)",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  )
}

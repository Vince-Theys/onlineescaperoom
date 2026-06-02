import { Button } from "@/components/ui/button"
import type { AnswerOption, AnswerState, QuestionWithOptions } from "@/types"

const ANSWER_LABELS = ["A", "B", "C", "D", "E"]

interface Props {
  question: QuestionWithOptions
  answerState: AnswerState
  selectedId: string | null
  onAnswer: (option: AnswerOption) => void
}

export default function AnswerGrid({
  question,
  answerState,
  selectedId,
  onAnswer,
}: Props) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
    >
      {question.answer_options.map((option, i) => {
        const isSelected = selectedId === option.id
        const isWrongSelected = isSelected && answerState === "wrong"

        return (
          <Button
            key={option.id}
            onClick={() => onAnswer(option)}
            disabled={answerState !== "idle"}
            className="flex items-center gap-5 rounded-2xl text-left font-bold text-white transition-all duration-200"
            style={{
              minHeight: "90px",
              padding: "1.25rem 1.75rem",
              background: isWrongSelected
                ? "rgba(233,24,82,0.2)"
                : "rgba(0,36,74,0.7)",
              border: isWrongSelected
                ? "2px solid rgba(233,24,82,0.7)"
                : "2px solid rgba(43,194,226,0.25)",
              backdropFilter: "blur(4px)",
              fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
              boxShadow: isWrongSelected
                ? "0 0 20px rgba(233,24,82,0.3)"
                : "none",
            }}
            onMouseEnter={(e) => {
              if (answerState !== "idle") return
              ;(e.currentTarget as HTMLButtonElement).style.background =
                "rgba(43,194,226,0.12)"
              ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(43,194,226,0.6)"
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 20px rgba(43,194,226,0.2)"
            }}
            onMouseLeave={(e) => {
              if (answerState !== "idle" || isWrongSelected) return
              ;(e.currentTarget as HTMLButtonElement).style.background =
                "rgba(0,36,74,0.7)"
              ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(43,194,226,0.25)"
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "none"
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-xl font-bold"
              style={{
                width: "52px",
                height: "52px",
                background: isWrongSelected
                  ? "rgba(233,24,82,0.2)"
                  : "rgba(43,194,226,0.15)",
                border: isWrongSelected
                  ? "2px solid rgba(233,24,82,0.6)"
                  : "2px solid rgba(43,194,226,0.4)",
                color: isWrongSelected ? "#e91852" : "#2bc2e2",
                fontSize: "1.5rem",
              }}
            >
              {ANSWER_LABELS[i]}
            </span>
            <span>{option.option_text}</span>
          </Button>
        )
      })}
    </div>
  )
}

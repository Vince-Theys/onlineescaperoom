import type { AnswerState, QuestionWithOptions } from "@/types"

interface Props {
  question: QuestionWithOptions | null
  answerState: AnswerState
}

export default function QuestionPanel({ question, answerState }: Props) {
  return (
    <div
      className="mb-6 rounded-2xl p-8"
      style={{
        background:
          answerState === "correct"
            ? "rgba(43,194,226,0.1)"
            : "rgba(0,52,105,0.4)",
        border:
          answerState === "correct"
            ? "1px solid rgba(43,194,226,0.5)"
            : "1px solid rgba(43,194,226,0.2)",
        backdropFilter: "blur(8px)",
        transition: "all 0.4s ease",
      }}
    >
      {question ? (
        <p
          className="text-center leading-relaxed font-bold text-white"
          style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}
        >
          {question.question_text}
        </p>
      ) : (
        <p
          className="text-center font-bold"
          style={{ fontSize: "2rem", color: "rgba(255,255,255,0.4)" }}
        >
          Geen vraag gevonden voor dit level.
        </p>
      )}
    </div>
  )
}

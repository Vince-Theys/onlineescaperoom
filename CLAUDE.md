# TWA Online Escaperoom — CLAUDE.md

## Project overview

Educational escape room web app for primary school children (6–12y), built for the Techniek- en WetenschapsAcademie (TWA) — STEM academy of UCLL Hogeschool Belgium.

A teacher creates a session and loads 5 questions with multiple choice answers. During class, the teacher projects their laptop screen. The teacher reads each question aloud, the class discusses and agrees on an answer orally, then the teacher clicks the chosen answer on screen. After 5 correct answers across 5 lessons, the class "escapes". Progress persists between lessons even when the laptop is closed.

## Users

- **Teacher**: logs in, creates sessions, manages questions/answers/hints, starts and controls the flow, and physically clicks the answers on the laptop
- **Class (students)**: never touch any device — they watch the projected screen and answer questions orally as a group; the teacher acts on their behalf

## Key constraints

- Runs on a single laptop per class, always on location at a school
- Teachers log in with an email/password account (Supabase Auth); students never interact with any device
- No paid APIs, subscriptions, or services
- Minimal maintenance after delivery
- Multiple classes can run simultaneously with independent progress
- Deadline: 12 June 2026

## Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Backend / DB**: Supabase (Postgres, Auth, RLS)
- **Deployment**: Vercel

## Project structure

```
src/
  pages/
    session/        # Student-facing screens (StartScreen, PlayScreen, EscapeScreen)
    teacher/        # Teacher admin panel (dashboard, create/detail session, question form)
    LoginPage.tsx
    NotFoundPage.tsx
  components/       # Layout, sidebar, shared UI primitives (shadcn)
  services/         # Supabase data access (sessionService, questionService)
  types/            # Shared TypeScript interfaces
  hooks/            # use-mobile, use-page-title
  utils/            # supabase client
supabase/
  migrations/       # SQL migrations (RLS policies)
```

## Design

See [design.md](./design.md) for the full design system and visual guidelines. The brand guide source file is at `/Users/tomasvaneynde/Downloads/brandbook-huisstijl.pdf`.

Key principles:
- Child-friendly: large text, big buttons, readable from 3 m distance
- Dark, textured, game-like UI — NOT a typical edtech/quiz app look
- TWA mascot character appears in the bottom-right corner (reserved — do not overlap)
- Future: Three.js 3D interactive escape room — keep visual language consistent with that direction

## Screens (MVP)

1. Start screen
2. Question/level screen (progress indicator + answer buttons + optional hint)
3. Correct answer feedback
4. Wrong answer feedback
5. End/escape screen
6. Teacher admin panel (create session, manage questions, start session)

## Data model (simplified)

```
Session        { id, name, currentLevel, status }
Question       { id, sessionId, order, text, hint? }
AnswerOption   { id, questionId, text, isCorrect }
```

## Reference design

A reference HTML mockup for the teacher admin panel (Docentenportaal) was provided at:
`https://api.anthropic.com/v1/design/h/zhYoe_5ACb2X5_1Fa1iJMw?open_file=Docentenportaal.html`

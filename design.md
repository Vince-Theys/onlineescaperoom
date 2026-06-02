# TWA Escaperoom — Design System

## Source of truth

The official TWA brand guide is at `/Users/tomasvaneynde/Downloads/brandbook-huisstijl.pdf`.
A reference HTML mockup for the teacher admin panel (Docentenportaal) was provided at:
`https://api.anthropic.com/v1/design/h/zhYoe_5ACb2X5_1Fa1iJMw?open_file=Docentenportaal.html`

---

## Brand colors (from official TWA brandbook)

| Name          | Hex       | RGB              | Role                                      |
|---------------|-----------|------------------|-------------------------------------------|
| TWA Navy      | `#003469` | 0, 52, 105       | Primary dark — backgrounds, headers       |
| TWA Red       | `#e91852` | 227, 0, 70       | Accent / error / wrong-answer state       |
| TWA Cyan      | `#2bc2e2` | 43, 194, 226     | Primary accent — buttons, highlights      |
| TWA Cyan Dark | `#13a7db` | 19, 167, 219     | Secondary accent — hover states, borders  |

### Application in the escaperoom UI

- **Background**: very dark navy (e.g. `#001a33` or `#00234a`), textured — feels like a dungeon/vault
- **Primary buttons / interactive elements**: TWA Cyan `#2bc2e2`
- **Hover / focus states**: TWA Cyan Dark `#13a7db`
- **Correct answer feedback**: TWA Cyan with a glow effect
- **Wrong answer feedback**: TWA Red `#e91852`
- **Text on dark bg**: white `#ffffff` or light cyan `#e0f7ff`
- **Progress indicators / level badges**: TWA Navy + Cyan border

---

## Typography (from official TWA brandbook)

| Role           | Font                      | Usage                                   |
|----------------|---------------------------|-----------------------------------------|
| Logo           | Variex Regular            | TWA logo only — do not use elsewhere    |
| Headings / UI  | Novecento Sans Wide Bold  | Screen titles, level numbers, buttons   |
| Body / labels  | Aleo Regular              | Question text, hints, descriptions      |

### Web font strategy

- **Novecento Sans Wide Bold**: load via a web font service or self-host (not on Google Fonts — check licensing or use a close substitute such as `"Barlow Condensed"` or `"Oswald"` bold if Novecento is unavailable)
- **Aleo Regular**: available on Google Fonts (`@import` from fonts.google.com)
- **Variex Regular**: logo use only — embed as SVG if possible

### Type scale (escape room context — readable from 3 m)

```
Level number / title   : 4–6 rem   Novecento Sans Wide Bold  uppercase
Question text          : 2–2.5 rem Aleo Regular
Answer button text     : 1.75 rem  Novecento Sans Wide Bold
Hint / secondary text  : 1.25 rem  Aleo Regular
Teacher UI labels      : 1 rem     Aleo Regular
```

---

## Visual language

### Tone
Dark, game-like, immersive — closer to a video game HUD than a school quiz app. Think locked vault doors, glowing panels, mysterious atmosphere. NOT pastel, NOT flat Material Design, NOT generic edtech.

### Backgrounds
- Deep navy base with a subtle texture (noise, grid, or circuit-board SVG pattern)
- Avoid pure black — stay in the `#001833`–`#003469` range
- Vignette edges to increase immersion

### Buttons
- Large touch targets (min 64 px height on desktop, even larger for child use)
- Rounded corners (`border-radius: 12–16px`)
- Filled with TWA Cyan; white bold label
- Glow / box-shadow on hover: `0 0 16px #2bc2e2aa`
- Disabled state: muted navy, no glow

### Cards / panels
- Semi-transparent navy panels with a cyan border (`1–2px solid #2bc2e2`)
- Slight backdrop blur (`backdrop-filter: blur(8px)`) for layered depth
- Inner shadow for inset/sunken effect

### Progress indicator (5 levels)
- Horizontal row of 5 icons/nodes (locked → unlocked → escaped)
- Current level highlighted in Cyan; completed in lighter cyan; locked in dark navy
- Visible from across a room — large, iconic

### Feedback screens
- **Correct**: full-screen cyan pulse / confetti — celebratory
- **Wrong**: red flash / shake animation — clear but not scary for children

### Mascot
- TWA mascot character pinned to bottom-right corner on all student-facing screens
- Minimum 150 × 150 px reserved zone — no UI elements may overlap this area

---

## Accessibility & child UX

- Minimum font size 1.25 rem for any visible text
- Color contrast ≥ 4.5:1 for all text (navy on white, white on navy, white on cyan)
- No time pressure on UI itself (teacher controls pacing)
- Tap/click targets ≥ 64 px
- Avoid red/green as the only differentiator (colorblind-safe feedback icons required)

---

## Screen-by-screen design notes

### 1. Start screen
- Full-screen dark background with TWA logo centered
- "START" button in TWA Cyan — prominent, operated by the teacher
- Session name / class name displayed below logo
- Mascot bottom-right

### 2. Question / level screen
- Level progress bar top-center
- Question text large and centered — readable from across the room
- 2–4 answer buttons in a grid (large, equal size); the **teacher clicks** the answer the class agrees on orally
- Optional hint button (secondary style — outlined, not filled); teacher-triggered
- Mascot bottom-right

### 3. Correct answer feedback
- Green/cyan glow overlay
- "JUIST!" (Correct!) in large Novecento text
- Teacher-triggered "next" button to advance to the next level

### 4. Wrong answer feedback
- Red flash overlay
- "FOUT!" (Wrong!) in large Novecento text
- Teacher-triggered retry button — class discusses again before trying a different answer

### 5. End / escape screen
- Full-screen celebration — mascot prominent
- "ONTSNAPT!" headline
- Summary of journey (5 levels completed)

### 6. Teacher admin panel (Docentenportaal)
- Lighter, more functional UI — still on-brand but less dramatic
- Session management: create, name, configure questions
- Question editor: text input, 2–4 answer options, correct answer toggle, optional hint
- Session status overview: which level is active, start/stop controls
- Responsive to laptop screen (1280 × 800 minimum target)

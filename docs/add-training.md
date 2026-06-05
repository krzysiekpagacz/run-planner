# Add Training Feature

Feature spec for the coach-facing wizard that creates a new training session (workout + segments) from the dashboard.

---

## Entry Point

A "Dodaj trening" button sits above `MonthlyTrainingTable` in `_coach-dashboard.tsx`, visible only when an athlete tab is active. The selected athlete is pre-filled and locked for the duration of the wizard.

---

## Multi-Step Modal Flow

```
[Dodaj trening]
      │
      ▼
┌─────────────────────────────────┐
│  STEP 1: Training Details       │
│  • Athlete (pre-filled, locked) │
│  • Date picker (required)       │
│  • Workout type (dropdown, req) │
│  • Title (optional)             │
│  • Notes (optional)             │
│  [Dalej →]                      │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  STEP 2: Section #N             │
│  • Section type (dropdown)      │
│  • Measurement: Dystans | Czas  │
│    └─ if Dystans: meters input  │
│    └─ if Czas: minutes input    │
│  • Intensity: Tętno | Tempo     │
│    └─ if Tętno: min/max bpm     │
│    └─ if Tempo: min/max min/km  │
│  • Repetitions (optional, ≥1)   │
│  • Notes (optional)             │
│  [Zapisz odcinek]               │
└──────────────┬──────────────────┘
               │ saved
               ▼
┌─────────────────────────────────┐
│  STEP 3: Section Summary        │
│  Numbered list of saved sections│
│  Running total distance shown   │
│                                 │
│  [← Wróć i edytuj]             │
│  [+ Dodaj kolejny odcinek]      │
│  [✓ Zapisz trening]             │
└──────────────┬──────────────────┘
               │ on "Zapisz trening"
               ▼
      Save workout + segments to DB
      → close wizard
```

---

## Business Rules

- Date and workout type are required; title is optional. If left blank, display falls back to `{workoutType} · {dd.MM.yyyy}`.
- At least one section is required before "Zapisz trening" is enabled.
- Coach can add any number of sections with no upper limit.
- **Go back / edit:** "Wróć i edytuj" pops the last segment from the in-memory array and re-opens the section form pre-filled with its data. Saving re-appends it (with any edits applied). Button is always visible in step 3 since at least one section exists to go back to.
- Total distance = sum of `distanceMeters × repetitions` for all sections that used "Dystans" measurement. Sections using "Czas" only contribute 0.
- All segment data is held in client state until "Zapisz trening" — nothing is written to the DB mid-wizard.

---

## Data Mapping

| UI field | DB column |
|---|---|
| Date | `workouts.scheduledDate` |
| Workout type | `workouts.workoutType` |
| Title | `workouts.title` (nullable) |
| Notes (training) | `workouts.notes` |
| Total distance (calculated) | `workouts.totalDistanceMeters` |
| Section type | `workout_segments.segmentType` |
| Repetitions | `workout_segments.repetitions` |
| Distance | `workout_segments.distanceMeters` |
| Duration | `workout_segments.durationMinutes` |
| HR min / max | `workout_segments.heartRateMin` / `heartRateMax` |
| Pace min / max | `workout_segments.paceMinSecondsPerKm` / `paceMaxSecondsPerKm` |
| Section notes | `workout_segments.notes` |

`workout_segments.orderIndex` = insertion order (0-based).

---

## Implementation Outline

### Dependencies to add
- `zod` — Server Action validation (required by `docs/data-mutation.md`, not yet installed)
- `shadcn add select` — dropdown component
- `shadcn add label` — form labels
- `shadcn add textarea` — notes fields

### Data layer — `src/data/workouts.ts`
- `createWorkout(input)` — inserts into `workouts`, returns inserted row
- `createWorkoutSegment(input)` — inserts into `workout_segments`
- Both call `requireCoach()` and verify active `coach_athlete_relationships` row before writing

### Server Action — `src/app/dashboard/actions.ts`
- `createTrainingAction(input)` — validates with Zod, calls `createWorkout` then `createWorkoutSegment` for each segment
- Returns `{ success: true } | { error: ZodFlattenedError }`

### UI components (all client, all in `src/app/dashboard/`)
| File | Responsibility |
|---|---|
| `_add-training-wizard.tsx` | Wizard shell; manages `step` state and `segments[]` array; calls action on save |
| `_training-details-form.tsx` | Step 1 dialog content; emits `onNext(details)` |
| `_section-form.tsx` | Step 2 dialog content; conditional fields based on measurement/intensity choice; emits `onSave(segment)` |
| `_section-summary.tsx` | Step 3 dialog content; lists segments, shows total distance, three action buttons |

Wire `<AddTrainingWizard athleteId={...} />` into `_coach-dashboard.tsx` alongside the existing table header.

---

## Verification

1. `npm run dev` — log in as coach, go to `/dashboard`
2. Select athlete tab → "Dodaj trening" button appears
3. Step 1: fill date + workout type, leave title blank → "Dalej"
4. Step 2: choose Dystans + Tętno, fill values → "Zapisz odcinek"
5. Step 3: section listed, total distance shown; click "Wróć i edytuj" → form re-opens with previous values
6. Edit and save → back to step 3; add a second section with Czas + Tempo
7. "Zapisz trening" → wizard closes; workout appears in monthly table with fallback title
8. Verify DB: one `workouts` row + two `workout_segments` rows with correct `orderIndex`
9. `npm run lint` + `npx tsc --noEmit` pass

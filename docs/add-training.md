# Add Training Feature

Feature spec for the coach-facing wizard and per-row CRUD controls for managing training sessions from the dashboard.

---

## Entry Points

### 1. "Dodaj trening" button
Sits above `MonthlyTrainingTable` in `_coach-dashboard.tsx`. Opens the wizard for the selected athlete with a free-editable date (defaults to today).

### 2. Row action icons (coach view only)
A narrow actions column at the far left of the table shows small icon buttons for each day row. The icons shown depend on whether a workout exists on that day:

| Row state | Icons |
|---|---|
| No workout | 🟢 `PlusCircle` — "Dodaj trening" |
| Has workout | 🔵 `Pencil` — "Edytuj trening" + 🔴 `Trash2` — "Usuń trening" |

Icons use `size="icon-xs"` (24px) + `variant="ghost"`. Native `title` attribute provides tooltip text.

---

## Multi-Step Modal Wizard

The same wizard handles both **create** and **edit** flows.

```
[trigger]
      │
      ▼
┌─────────────────────────────────┐
│  STEP 1: Training Details       │
│  • Date picker (required)       │  ← disabled & locked when opened
│    "Data jest ustalona..."      │    from a specific row
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
│    └─ Dystans: km (all types)   │
│       except interval_training  │
│       main_set → meters (m)     │
│    └─ Czas: minutes             │
│  • Intensity: Tętno | Tempo     │
│    └─ Tętno: min/max bpm        │
│    └─ Tempo: min/max MM:SS/km   │
│  • Repetitions (≥1)             │
│  • Notes (optional)             │
│  [← Wróć]  [Zapisz odcinek]    │
└──────────────┬──────────────────┘
               │ saved
               ▼
┌─────────────────────────────────┐
│  STEP 3: Section Summary        │
│  Numbered list of saved sections│
│  Running total distance shown   │
│                                 │
│  [← Wróć i edytuj]             │
│  [+ Dodaj odcinek]              │
│  [✓ Zapisz trening]             │
└──────────────┬──────────────────┘
               │ on "Zapisz trening"
               ▼
      Create or Update workout + segments
      → close wizard → router.refresh()
```

---

## Business Rules

- Date and workout type are required; title is optional (falls back to `{workoutType} · {dd.MM.yyyy}`).
- When opened from a row's **+** button, the date is pre-filled with that row's date and **cannot be changed**.
- At least one section is required before "Zapisz trening" is enabled.
- **Distance units:** `interval_training` + `main_set` → meters; all other combinations → km.
- **Go back / edit:** "Wróć i edytuj" pops the last segment and re-opens the form pre-filled with its data. Button always visible in step 3.
- **Cancel section:** "← Wróć" in step 2 restores a popped segment on cancel-edit, returns to summary if sections exist, or returns to step 1 for the first section.
- Total distance = sum of `distanceMeters × repetitions` across all "Dystans" sections.
- Segment data is held in client state until "Zapisz trening" — nothing written to DB mid-wizard.
- **Edit mode:** saves via `updateTrainingAction` which replaces all segments (delete-then-insert).

---

## Delete Flow

Clicking 🔴 trash on a row opens a small confirmation Dialog:
- Title: "Usuń trening"
- Body names the workout title + warns the operation cannot be undone
- "Anuluj" / "Usuń" (destructive) buttons
- On confirm: `deleteTrainingAction` → segments deleted first, then workout → `router.refresh()`

---

## Data Mapping

| UI field | DB column |
|---|---|
| Date | `workouts.scheduledDate` |
| Workout type | `workouts.workoutType` |
| Title | `workouts.title` (nullable — fallback generated server-side) |
| Notes (training) | `workouts.notes` |
| Total distance (calculated) | `workouts.totalDistanceMeters` |
| Section type | `workout_segments.segmentType` |
| Repetitions | `workout_segments.repetitions` |
| Distance | `workout_segments.distanceMeters` (always stored in meters) |
| Duration | `workout_segments.durationMinutes` |
| HR min / max | `workout_segments.heartRateMin` / `heartRateMax` |
| Pace min / max | `workout_segments.paceMinSecondsPerKm` / `paceMaxSecondsPerKm` (seconds/km) |
| Section notes | `workout_segments.notes` |

`workout_segments.orderIndex` = insertion order (0-based).

---

## Data Layer (`src/data/workouts.ts`)

| Function | Purpose |
|---|---|
| `createTrainingWithSegments(input)` | Insert workout + segments; verify active coach–athlete relationship |
| `updateTrainingWithSegments(workoutId, input)` | Update workout fields; delete + re-insert all segments |
| `deleteTraining(workoutId)` | Delete segments then workout; verify coach ownership |

All helpers call `requireCoach()` and check ownership before writing.

---

## Server Actions (`src/app/dashboard/actions.ts`)

| Action | Zod schema | Notes |
|---|---|---|
| `createTrainingAction` | `CreateTrainingSchema` | athleteId + date + type + optional title/notes + segments≥1 |
| `updateTrainingAction` | `CreateTrainingSchema` + `workoutId` | same payload + workoutId |
| `deleteTrainingAction` | `{ workoutId: uuid }` | minimal |

All return `{ success: true } | { error: string }`.

---

## UI Components (`src/app/dashboard/`)

| File | Role |
|---|---|
| `_add-training-wizard.tsx` | Wizard shell; handles both create and edit; supports controlled open mode for table integration |
| `_training-details-form.tsx` | Step 1; accepts `prefill`, `defaultDate`, `dateReadOnly` props |
| `_section-form.tsx` | Step 2; distance unit adapts to workoutType + segmentType |
| `_section-summary.tsx` | Step 3; three-button footer |
| `_wizard-types.ts` | Shared type definitions, enum arrays, and Polish label maps |
| `_monthly-training-table.tsx` | Table; renders action column when `athleteId` prop is provided; owns `TableAction` state; hosts delete dialog and controlled wizard |

---

## Verification

1. `npm run dev` — log in as coach, select athlete
2. **Add from button:** "Dodaj trening" → date editable → fill details → add sections → save → row appears
3. **Add from row:** click 🟢 + on empty day → date pre-filled and disabled → fill details → save
4. **Edit:** click 🔵 pencil → wizard pre-filled with existing data → modify section → save → row reflects changes
5. **Delete:** click 🔴 trash → confirmation → confirm → row removed
6. **Cancel delete:** trash → Anuluj → workout unchanged
7. **Athlete view:** no action icons visible (no `athleteId` prop passed to table)
8. `npm run lint` + `npx tsc --noEmit` pass

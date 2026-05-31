# Data Mutation

This document is **binding**. It overrides any general Next.js / React defaults you may
have learned. Read it before writing any code that creates, updates, or deletes data.

There are three non-negotiable rules:

1. **All database mutations go through helper functions in `src/data/`.** Never write
   Drizzle calls directly in a Server Action or component.
2. **All mutations are triggered via Server Actions in colocated `actions.ts` files.**
   Never via route handlers.
3. **Every Server Action validates its arguments with Zod before doing anything else.**

---

## Rule 1 — Database mutations live in `src/data/` helpers

**Every insert, update, and delete MUST be implemented as a helper function under
`src/data/`.** Server Actions call these helpers; they never touch the database directly.

The same layout that governs reads applies to writes:

| Path | Responsibility |
|---|---|
| `src/db/index.ts` | Creates the Drizzle client (`db`). Imported only by `src/data/` helpers. |
| `src/db/schema.ts` | Table + enum definitions. Single source of truth for the schema. |
| `src/data/*.ts` | **All** query and mutation helpers. The only place the app reads or writes data. |

Group helpers by domain (`src/data/workouts.ts`, `src/data/athletes.ts`, …) and
re-export them from `src/data/index.ts` so callers import from `@/data`.

### Required

- ✅ Mutation helpers are plain `async` functions using the Drizzle ORM builder
  (`db.insert()`, `db.update()`, `db.delete()`).
- ✅ Every mutation helper resolves the current user from `auth()` inside the helper
  itself — never from a caller-supplied id.
- ✅ Every mutation helper authorizes the operation before executing it (same rules as
  reads — see `docs/data-fetching.md`).

### Prohibited

- ❌ **No raw SQL** — no `` sql`...` `` template strings, no `db.execute()` with
  hand-written SQL.
- ❌ **No Drizzle calls outside `src/data/`** — not in `actions.ts`, not in components,
  not anywhere else.

```ts
// src/data/workouts.ts — mutation helper example
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { workouts } from '@/db/schema';
import { getCurrentUser } from './users';

export async function createWorkout(data: {
  title: string;
  scheduledDate: Date;
  description?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthenticated');

  const [workout] = await db
    .insert(workouts)
    .values({
      athleteId: user.id,
      title: data.title,
      scheduledDate: data.scheduledDate,
      description: data.description ?? null,
    })
    .returning();

  return workout;
}

export async function deleteWorkout(workoutId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthenticated');

  // Verify ownership before deleting.
  const [existing] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!existing || existing.athleteId !== user.id) {
    throw new Error('Forbidden');
  }

  await db.delete(workouts).where(eq(workouts.id, workoutId));
}
```

---

## Rule 2 — Server Actions in colocated `actions.ts` files

**Every mutation triggered from the UI MUST go through a Server Action.** Route handlers
(`route.ts` with `POST`/`PUT`/`DELETE`) are prohibited for mutations just as they are for
reads.

### File placement

Server Actions live in a file named **`actions.ts`** colocated with the route segment that
uses them:

```
src/app/dashboard/workouts/
├── page.tsx           ← Server Component; renders the list
├── _workout-form.tsx  ← Client Component; the form UI
└── actions.ts         ← Server Actions ('use server' at the top)
```

A single `actions.ts` may export multiple actions for its segment. Do **not** put Server
Actions in `src/data/` — that layer is for DB helpers only.

### Typing

**Server Action parameters MUST be typed TypeScript values — never `FormData`.** Define a
plain TypeScript object type (or reuse the Zod schema's inferred type) for each action's
argument. This keeps the contract between the Client Component and the action explicit and
type-checked.

```ts
// actions.ts

'use server';

// ✅ Typed parameter
export async function createWorkoutAction(input: CreateWorkoutInput) { ... }

// ❌ Never use FormData
export async function createWorkoutAction(formData: FormData) { ... }
```

### Calling from a Client Component

Client Components call Server Actions directly as async functions — do **not** use
`<form action={...}>` with `FormData`. Pass a plain typed object instead:

```tsx
// _workout-form.tsx
'use client';

import { createWorkoutAction } from './actions';

export function WorkoutForm() {
  async function handleSubmit() {
    await createWorkoutAction({
      title: 'Long run',
      scheduledDate: new Date('2026-06-01'),
    });
  }

  return <button onClick={handleSubmit}>Save</button>;
}
```

---

## Rule 3 — Zod validation in every Server Action

**Every Server Action MUST validate its input with Zod before calling any helper or
performing any logic.** Return early with a validation error if the input is invalid —
never let unvalidated data reach `src/data/`.

Define the Zod schema at the top of `actions.ts`. Infer the TypeScript type from the
schema so there is a single source of truth for both validation and the type.

```ts
// src/app/dashboard/workouts/actions.ts
'use server';

import { z } from 'zod';
import { createWorkout } from '@/data';

const CreateWorkoutSchema = z.object({
  title: z.string().min(1).max(200),
  scheduledDate: z.coerce.date(),
  description: z.string().max(2000).optional(),
});

type CreateWorkoutInput = z.infer<typeof CreateWorkoutSchema>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const parsed = CreateWorkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  await createWorkout(parsed.data);
  return { success: true };
}
```

### Return shape

Server Actions MUST return a serializable plain object. Two acceptable shapes:

| Outcome | Return value |
|---|---|
| Success | `{ success: true }` (add a `data` key if the caller needs the created/updated record) |
| Validation error | `{ error: parsed.error.flatten() }` |
| Auth / permission error | throw — Next.js will surface this as an unhandled server error |

Never return class instances, `Error` objects, or `Date` values directly — they are not
serializable across the Server Action boundary.

---

## Authorization in mutations

The same authorization rules that govern reads apply to writes. Enforcement lives in the
`src/data/` helper, not in the Server Action:

- **Resolve identity from the session** inside the helper (`getCurrentUser()` or
  `requireCoach()`). Never trust an id that was passed in from the action.
- **Verify ownership** before updating or deleting a record. A user must not be able to
  mutate another user's data by supplying a different record id.
- A **coach** may mutate an athlete's records only if an `active`
  `coach_athlete_relationships` row links them to that athlete.

See `docs/data-fetching.md` and `docs/auth.md` for the full authorization pattern.

---

## Quick reference

| Question | Answer |
|---|---|
| Where do DB mutation calls (insert/update/delete) live? | In helper functions under `src/data/`. |
| Where do Server Actions live? | In a colocated `actions.ts` beside the `page.tsx` that needs them. |
| Can I call Drizzle directly in an `actions.ts`? | **No.** Call a `src/data/` helper. |
| Can I use `FormData` as a Server Action parameter? | **No.** Use a typed TypeScript object. |
| When must I validate? | Always, at the top of every Server Action, with Zod, before any logic. |
| Can I use route handlers for mutations? | **No.** Server Actions only. |
| Where does authorization live? | In the `src/data/` helper — not in the Server Action. |

---

## Checklist before opening a PR

- [ ] Every DB mutation is implemented as a helper in `src/data/`, using Drizzle (no raw SQL).
- [ ] Every Server Action is in a colocated `actions.ts` file with `'use server'` at the top.
- [ ] No Server Action parameter uses `FormData`.
- [ ] Every Server Action has a Zod schema and calls `safeParse` before any other logic.
- [ ] The TypeScript parameter type is inferred from the Zod schema (`z.infer<typeof Schema>`).
- [ ] Authorization (session resolution, ownership check) is enforced inside the `src/data/` helper, not the action.
- [ ] The action return value is a plain serializable object.

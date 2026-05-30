# Data Fetching

This document is **binding**. It overrides any general Next.js / React defaults you may
have learned. Read it before fetching data anywhere in this project.

There are exactly two non-negotiable rules. Both are described in detail below.

1. **All data is fetched in Server Components.** Never via route handlers, never client-side.
2. **All database access goes through Drizzle helper functions in `src/data/`.** Never raw
   SQL, and every helper enforces that the signed-in user may only read their own data
   (a coach additionally may read the data of athletes they are linked to).

---

## Rule 1 — Server Components only

**Every piece of data in this app MUST be fetched inside a Server Component.** This is the
single source of data for the UI.

### Prohibited — do not do any of these

- ❌ **No Route Handlers for data fetching.** Do **not** create `app/**/route.ts` files
  (`GET`/`POST` etc.) to read data for the UI. We do not build an internal REST/JSON API
  for our own pages.
- ❌ **No client-side fetching.** No `fetch()` in `'use client'` components, no `useEffect`
  data loading, no SWR / React Query / Axios, no `getServerSideProps`/`getStaticProps`
  (Pages Router is not used here).
- ❌ **No fetching from any other kind of component or module** — not from layouts wiring,
  not from utility hooks, not from Client Components.

### Required

- ✅ Fetch data in a Server Component (a `page.tsx`, `layout.tsx`, or an `async` Server
  Component) by `await`-ing a helper from `src/data/`.
- ✅ Pass the already-fetched, serializable data **down** to Client Components as props when
  interactivity is needed. Client Components receive data; they never fetch it.

```tsx
// src/app/dashboard/page.tsx — a Server Component (no 'use client')
import { redirect } from 'next/navigation';
import { getCurrentUser, getMyWorkouts } from '@/data';
import { MonthlyTrainingTable } from './_monthly-training-table'; // Client Component

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  // Data is fetched here, on the server, then handed to the Client Component as props.
  const workouts = await getMyWorkouts();

  return (
    <main className="container mx-auto px-4 py-8">
      <MonthlyTrainingTable workouts={workouts} />
    </main>
  );
}
```

### Why

- **Security.** Credentials (`DATABASE_URL`), authorization checks, and the Clerk session
  all stay on the server. Nothing leaks to the browser and there is no public API surface
  for an attacker to call directly.
- **Simplicity.** No loading/error client states, no API contract to keep in sync, no
  request waterfalls. The page is one `async` function that returns HTML.
- **Performance.** Queries run close to the database (Neon) inside the same server render,
  not over an extra network hop from the client.

> Mutations (create/update/delete) are a separate concern and use **Server Actions**
> (`'use server'`), not route handlers either. This document covers **reads**; the same
> "never expose a route handler / never query from the client" rules apply to writes.

---

## Rule 2 — Database access via `src/data/` helpers (Drizzle, never raw SQL)

**Every database query MUST live in a helper function under `src/data/`.** Server Components
import these helpers; they never touch the database directly.

- The path alias `@/*` → `src/*`, so helpers are imported as `@/data` / `@/data/<file>`.
- Helpers are plain `async` functions that use the **Drizzle ORM** query builder.
- ❌ **Never write raw SQL** — no `sql\`...\`` template strings for queries, no
  `db.execute(...)` with hand-written SQL. Use Drizzle's typed builder (`db.select()`,
  `eq`, `and`, `innerJoin`, …) exclusively. Drizzle gives us type safety end-to-end and
  parameterizes every value, which prevents SQL injection.

### Layout

| Path | Responsibility |
|---|---|
| `src/db/index.ts` | Creates the Drizzle client (`db`). Imported only by `src/data/` helpers. |
| `src/db/schema.ts` | Table + enum definitions. The single source of truth for the schema. |
| `src/data/*.ts` | **All** query helpers. The only place the rest of the app reads data from. |

Group helpers by domain inside `src/data/` (e.g. `src/data/users.ts`, `src/data/workouts.ts`,
`src/data/athletes.ts`) and re-export them from `src/data/index.ts` so callers import from
`@/data`.

### Why a dedicated `src/data/` layer

- It is the **one** place where every authorization rule (Rule 2's access control below)
  is enforced. Centralizing queries means we can guarantee no page accidentally reads
  another user's data.
- Reusable, testable, typed query functions instead of inline queries scattered across pages.
- Swapping/optimizing a query touches one file, not every page that needed it.

---

## Authorization — users may only read their own data

This is **the most important rule in this document.** A signed-in user must **never** be able
to read another user's data — with one exception: a **coach** may read the data of the
**athletes they are linked to** (an `active` row in `coach_athlete_relationships`).

### How it is enforced

**Derive identity from the session inside the helper — never trust an ID from the caller as
proof of ownership.** Every helper resolves the current user from the Clerk session
(`auth()` → the `users` row) and scopes the query to that user.

- A query for the current user's own data filters by the **session-derived** user id, not by
  an id passed in from a page/URL.
- A query where a **coach** reads an **athlete's** data must first verify an `active`
  `coach_athlete_relationships` row links `coachId` (the session user) to that `athleteId`.
  If no such relationship exists, the helper returns nothing / throws — it does **not** return
  the data.

```ts
// src/data/workouts.ts
import { auth } from '@clerk/nextjs/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { coachAthleteRelationships, users, workouts } from '@/db/schema';

/** The signed-in user's OWN workouts. Scoped to the session — no id is accepted. */
export async function getMyWorkouts(): Promise<WorkoutRow[]> {
  const { userId } = await auth();
  if (!userId) return [];

  // Resolve our own internal id from the Clerk session — the source of authority.
  const [me] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  if (!me) return [];

  return db
    .select(/* … */)
    .from(workouts)
    .where(eq(workouts.athleteId, me.id)) // can only ever be OUR rows
    .orderBy(asc(workouts.scheduledDate));
}

/**
 * An athlete's workouts, readable by a COACH — but only if an active relationship links
 * the signed-in coach to that athlete. Otherwise returns nothing.
 */
export async function getAthleteWorkoutsForCoach(athleteId: string): Promise<WorkoutRow[]> {
  const coach = await requireCoach(); // session-derived; throws/redirects if not a coach

  const [link] = await db
    .select({ id: coachAthleteRelationships.id })
    .from(coachAthleteRelationships)
    .where(
      and(
        eq(coachAthleteRelationships.coachId, coach.id),
        eq(coachAthleteRelationships.athleteId, athleteId),
        eq(coachAthleteRelationships.status, 'active'),
      ),
    )
    .limit(1);

  if (!link) return []; // not your athlete → no access, full stop.

  return db
    .select(/* … */)
    .from(workouts)
    .where(eq(workouts.athleteId, athleteId))
    .orderBy(asc(workouts.scheduledDate));
}
```

### Checklist for every new query helper

- [ ] Does it resolve the current user from `auth()` (not from an argument)?
- [ ] Is the result filtered to the current user's id, **or** gated behind a verified
      `active` coach↔athlete relationship?
- [ ] Is there **no** code path that returns another user's data without that check?
- [ ] Is it Drizzle, with **zero** raw SQL?
- [ ] Is it imported and `await`ed only from a Server Component?

### Why

Authorization that lives in the data layer cannot be bypassed by a page that forgot to check.
There is no API endpoint to attack, no client-side filter to tamper with, and no helper that
returns more than the caller is allowed to see. Defense in depth: even a buggy page cannot
leak another user's training data.

---

## Quick reference

| Question | Answer |
|---|---|
| Where do I fetch data? | In a Server Component (`page.tsx`, `layout.tsx`, `async` server component). |
| Can I add a `route.ts` to load data? | **No.** Never, for reads. |
| Can a Client Component fetch? | **No.** It receives data as props from a Server Component. |
| Where do queries live? | In helpers under `src/data/`, imported as `@/data`. |
| Raw SQL? | **Never.** Drizzle query builder only. |
| Whose data can a query return? | Only the signed-in user's — plus, for a coach, their linked athletes'. |
| How is identity determined? | From the Clerk session (`auth()`) inside the helper, never from a caller-supplied id. |

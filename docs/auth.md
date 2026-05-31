# Authentication & Authorization

This document is **binding**. It overrides any general Clerk or Next.js defaults you may
have learned. Read it before writing any code that touches auth, roles, or user identity.

There are three non-negotiable rules:

1. **Clerk owns identity only.** The database is the source of truth for roles and user
   records — never Clerk's JWT or `publicMetadata`.
2. **Identity is always derived from the session.** Never accept a user id from a URL
   parameter, request body, or caller argument as proof of who the user is.
3. **Role checks live in `src/data/` helpers.** Never in pages, layouts, or components.

---

## Clerk Version

This project uses **`@clerk/nextjs@^7`**. Import all server-side helpers from
`@clerk/nextjs/server`. Do not import from `@clerk/clerk-sdk-node` or `@clerk/backend`.

---

## Rule 1 — Clerk is the identity provider; the database is the source of truth

Clerk handles sign-up, sign-in, sessions, and the `UserButton` UI. Nothing else.

**Roles and user records live in the `users` database table — not in the Clerk JWT, not in
`publicMetadata`.** `publicMetadata.role` is written to during onboarding as a convenience
for client-side UI, but it is **never read for authorization decisions**. The JWT can be
stale (Clerk does not reissue it immediately after a `updateUserMetadata` call), so any
code that gates access on `publicMetadata.role` or `sessionClaims.role` is wrong.

### The `getCurrentUser()` helper — use this everywhere

`src/data/users.ts` exports `getCurrentUser()`. It calls `auth()` to obtain the Clerk
`userId`, then queries the `users` table to return the full user record including `role`:

```ts
// src/data/users.ts
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  return user ?? null;
}
```

**Always use `getCurrentUser()` to get the current user.** Do not call Clerk's
`currentUser()` for role or identity checks — it returns Clerk's object, not the DB record.
Do not call `auth()` directly in pages to retrieve anything beyond `userId`, which you
immediately discard after the null-check.

---

## Rule 2 — Identity comes from the session, never from the caller

**Never trust a user id that comes from outside the session.** This means:

- ❌ Do **not** accept a `userId` parameter in a data helper and use it directly.
- ❌ Do **not** read `req.query.userId`, URL params, or form fields to determine who the
  caller is.
- ✅ Always resolve the current user from `auth()` (Clerk session) inside the helper itself.

This is what prevents one user from reading another user's data by simply changing a URL.
See `docs/data-fetching.md` for the full enforcement pattern.

---

## Rule 3 — Role checks live in `src/data/` helpers

The `requireCoach()` helper in `src/data/users.ts` is the **only** place where the coach
role is enforced:

```ts
export async function requireCoach() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'coach') throw new Error('Forbidden: coach access required');
  return user;
}
```

Call `requireCoach()` at the top of any helper that is coach-only. Never replicate this
check inside a page or layout — those files are for rendering, not authorization.

---

## Middleware (`src/proxy.ts`)

The file `src/proxy.ts` (not `middleware.ts` — see CLAUDE.md) registers `clerkMiddleware`
and enforces that a `userId` exists for all routes that are not explicitly public:

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const isPublic = createRouteMatcher(['/', '/api/webhooks(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) {
    const { userId } = await auth();
    if (!userId) redirect('/');
  }
});
```

**Public routes:** `/` and `/api/webhooks(.*)`.

**Everything else is protected at the middleware layer.** Protected route layouts still
perform their own `auth()` check as a defence-in-depth measure, but the middleware is the
first gate.

> **Do not put onboarding completion checks in the middleware.** The JWT session claim can
> be stale after `updateUserMetadata` is called — onboarding state is enforced at the DB
> level in the dashboard layout instead.

### Adding a new public route

Add it to the `createRouteMatcher` array in `src/proxy.ts`. Everything not listed there is
automatically protected — you do not need to add new protected routes anywhere.

---

## Protected Route Pattern

Every protected segment layout must perform a two-step check:

1. **Auth check** — verify `userId` exists (even though middleware already did this, the
   layout is the last line of defence).
2. **Onboarding check** — verify a `users` DB record exists; redirect to `/onboarding` if not.

```tsx
// src/app/dashboard/layout.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/data';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const user = await getCurrentUser();
  if (!user) redirect('/onboarding');

  return <>{children}</>;
}
```

Do not check roles in a layout — layouts protect entire segments from unauthenticated or
un-onboarded access only. Role-based content differences are handled inside pages and data
helpers.

---

## Onboarding Flow

Role selection is a **one-time, permanent** action. A user's role cannot be changed after
onboarding.

### Flow

1. User signs up via Clerk (any sign-in provider).
2. `SignUpButton` redirects to `/onboarding` on success.
3. `/onboarding/page.tsx` (Server Component) checks:
   - If no `userId` → redirect to `/`.
   - If a `users` record already exists → redirect to `/dashboard`.
   - Otherwise → render `<RoleSelector />`.
4. User picks "Athlete" or "Coach" in the `<RoleSelector />` Client Component.
5. The `completeOnboarding(role)` Server Action (`src/app/onboarding/_actions.ts`):
   - Upserts the `users` table row with `clerkId`, name, email, and `role`.
   - Calls `clerkClient().users.updateUserMetadata(userId, { publicMetadata: { role, onboardingComplete: true } })` for convenience only — this value is **not used for authorization**.
6. User is redirected to `/dashboard`.

### Writing the onboarding Server Action

```ts
'use server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function completeOnboarding(role: 'coach' | 'athlete') {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);

  await db.insert(users).values({
    clerkId: userId,
    name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim(),
    email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
    role,
  }).onConflictDoUpdate({ target: users.clerkId, set: { role } });

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role, onboardingComplete: true },
  });
}
```

---

## Clerk UI Components

Use Clerk's built-in UI components for all authentication UI. Do not build custom
sign-in/sign-up forms.

| Component | Where used | Notes |
|---|---|---|
| `<ClerkProvider>` | `src/app/layout.tsx` | Wraps entire app — do not add a second one |
| `<SignInButton>` | Home page, header | Modal sign-in; no custom form needed |
| `<SignUpButton>` | Home page, header | Pass `afterSignUpUrl="/onboarding"` |
| `<UserButton>` | Header (signed-in state) | Provides sign-out and account management |
| `<Show when="signed-in">` / `<Show when="signed-out">` | Layout, home page | Conditional rendering without a `useAuth` hook in a Server Component |

Import all UI components from `@clerk/nextjs` (not `@clerk/nextjs/server`).

---

## Server Components vs Client Components

| Scenario | How to access auth |
|---|---|
| Server Component / `page.tsx` / `layout.tsx` | `await getCurrentUser()` from `@/data` |
| Server Action (`'use server'`) | `const { userId } = await auth()` from `@clerk/nextjs/server` |
| Client Component (UI only) | Receive user data as props from the parent Server Component |
| Client Component (conditional rendering) | `<Show when="signed-in">` / Clerk's `useAuth()` hook for boolean checks only — never for role checks |

**Never call `auth()` or `getCurrentUser()` inside a Client Component.** Client Components
that need to know the role must receive it as a prop from a Server Component.

---

## Roles

There are exactly two roles: `coach` and `athlete`. They are stored as a `text` column with
an enum constraint in `src/db/schema.ts`:

```ts
role: text('role', { enum: ['coach', 'athlete'] }).notNull().default('athlete'),
```

- A user's role is set once at onboarding and never changes.
- The role is the TypeScript union `'coach' | 'athlete'` — use this type, not a string.
- Enforce role access with `requireCoach()` in `src/data/` helpers. No other mechanism.

---

## What NOT to do

- ❌ Do **not** read `publicMetadata.role` or JWT session claims for authorization.
- ❌ Do **not** call Clerk's `currentUser()` where a DB role check is needed — it returns
  Clerk data, not the canonical `users` row.
- ❌ Do **not** add role checks to pages or layouts (only the two-step auth + onboarding
  check belongs in a layout).
- ❌ Do **not** create route handlers (`route.ts`) that expose auth state — all auth checks
  are server-side in the render path.
- ❌ Do **not** accept a user id from URL params or request bodies to determine the current
  user.
- ❌ Do **not** skip the `requireCoach()` call in a helper that returns coach-only data.

---

## Checklist before opening a PR

- [ ] All role checks call `requireCoach()` from `src/data/users.ts`, not inline conditionals.
- [ ] Every new `src/data/` helper calls `getCurrentUser()` (or `requireCoach()`) and never
  accepts a user id as a parameter that bypasses session resolution.
- [ ] No page, layout, or component reads `publicMetadata.role` or JWT claims for
  authorization decisions.
- [ ] Any new public route is explicitly added to the `createRouteMatcher` in `src/proxy.ts`.
- [ ] Every new protected layout segment performs the two-step (auth + onboarding) check.
- [ ] No Clerk UI component is duplicated — `<ClerkProvider>` appears only in the root layout.

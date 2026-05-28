# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

**RunPlanner** is a web application that enables running coaches to create structured training plans and share them with athletes. Athletes execute workouts, sync completed activities from Strava, and the app reconciles planned vs. actual data.

## Commands

```bash
npm run dev      # Start dev server (Turbopack, localhost:3000)
npm run build    # Production build (Turbopack)
npm run start    # Serve production build
npm run lint     # Run ESLint (note: `next lint` was removed in v16 — use `eslint` CLI directly)
```

TypeScript type-check (no emit):
```bash
npx tsc --noEmit
```

There is no test runner configured yet.

## Architecture

This is a **Next.js 16 App Router** project. All application code lives under `src/app/`. The path alias `@/*` maps to `src/*`.

- `src/app/layout.tsx` — root layout; sets up Geist fonts and global CSS
- `src/app/page.tsx` — home page (`/`)
- `src/app/globals.css` — Tailwind v4 entry point (`@import "tailwindcss"`)

Routing follows the App Router convention: a folder becomes a route segment when it contains a `page.tsx`. Colocate non-routable files in `_folder` or `(group)` directories.

## Next.js 16 Breaking Changes (vs. v13–15 training data)

- **Turbopack is default.** `next dev` and `next build` use Turbopack automatically. Custom `webpack` configs will break the build — migrate them to Turbopack or pass `--webpack` to opt out.
- **`next lint` removed.** Use `eslint` CLI directly (`npm run lint`). `next build` no longer runs linting.
- **`params` and `searchParams` are Promises.** In pages and layouts, `await` them: `const { id } = await params`.
- **`serverRuntimeConfig`/`publicRuntimeConfig` removed.** Use `process.env.*` in Server Components or `NEXT_PUBLIC_*` in client code.
- **`middleware.ts` renamed to `proxy.ts`.** The middleware convention is gone.
- **`experimental.dynamicIO` renamed to `cacheComponents`** (top-level config key).
- **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`). Do not manually add `useMemo`/`useCallback` for performance — the compiler handles memoization automatically.

## Tailwind v4

`globals.css` uses `@import "tailwindcss"` (v4 syntax). Theme tokens are declared with `@theme inline { ... }` rather than `tailwind.config.js`. There is no `tailwind.config.js` in this project.

## React 19 / Server vs. Client Components

All components are **Server Components by default**. Add `'use client'` only when the component needs:
- `useState`, `useEffect`, or other client-only hooks
- Browser-only APIs (`window`, `localStorage`, etc.)
- Event handlers (`onClick`, `onChange`, etc.)

## Commit Conventions

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

Format: `<type>(<scope>): <subject>`

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Subject: imperative mood, ≤72 chars total (including prefix), no trailing period
- Body: add only when the *why* is not obvious from the subject
- Breaking changes: append `!` to type/scope and add `BREAKING CHANGE:` footer

Scope guidance for this project:
- `src/app/<segment>/` → scope is `<segment>` (e.g., `auth`, `plans`)
- Only `package.json`/lock file → `deps`; only config files → `config`
- Mixed areas → omit scope

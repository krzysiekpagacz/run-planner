---
name: ship-pr
description: "Push current branch, create a PR, review it for correctness and code quality, run linting and type-checks, and merge when all checks pass. Stops and reports findings if any problem is found."
allowed-tools: Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git fetch:*), Bash(git checkout:*), Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git symbolic-ref:*), Bash(git ls-remote:*), Bash(git remote:*), Bash(git merge:*), Bash(gh pr:*), Bash(gh repo:*), Bash(npm run lint:*), Bash(npx tsc:*)
---

## Context

- Current branch: !`git branch --show-current`
- Working tree status: !`git status --short`
- Default branch: !`git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'`
- Recent commits on this branch vs default: !`git log --oneline origin/$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || echo main)..HEAD 2>/dev/null | head -20`

## Your task

Ship the current branch: push it, open a pull request, review the diff for quality and correctness, run linting and type-checks, then merge if everything passes. Stop at the first blocking problem and report it clearly.

---

### Step 0: Pre-flight checks

**0a. Detect default branch.**
Run: `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'`
Store as DEFAULT_BRANCH. Fall back to `main` if empty.

**0b. Guard against shipping the default branch.**
Run `git branch --show-current`. If it equals DEFAULT_BRANCH, stop:
"You are on `<DEFAULT_BRANCH>`. Checkout a feature branch before running /ship-pr."

**0c. Guard against a dirty working tree.**
Run `git status --porcelain`. If any lines are present, stop:
"Your working tree has uncommitted changes. Commit or stash them first, then re-run /ship-pr."

**0d. Guard against no commits ahead of default.**
Run `git log --oneline origin/<DEFAULT_BRANCH>..HEAD`. If empty, stop:
"No commits ahead of `<DEFAULT_BRANCH>`. Nothing to ship."

---

### Step 1: Push the branch

Run `git status -sb` and check for `## <branch>...origin/<branch>`:
- **Upstream exists**: run `git push`.
- **No upstream**: run `git push -u origin <current-branch>`.

If push fails, stop and print the error.

---

### Step 2: Run quality checks

Run both checks and collect results before deciding:

**2a. Lint:**
Run `npm run lint 2>&1`. Capture exit code and output.

**2b. Type-check:**
Run `npx tsc --noEmit 2>&1`. Capture exit code and output.

If either check exits non-zero:
- Print a clearly labeled block for each failing check showing its full output.
- Stop: "Quality checks failed — fix the errors above before merging."

If both pass, print: "Lint: OK | Type-check: OK"

---

### Step 3: Review the diff

Get the full diff of this branch against the default branch:
`git diff origin/<DEFAULT_BRANCH>...HEAD`

Also get the list of commits:
`git log --oneline origin/<DEFAULT_BRANCH>..HEAD`

Perform a thorough code review of the diff. Judge each file against:

1. **Correctness** — logic errors, off-by-one bugs, null/undefined derefs, incorrect async handling, wrong HTTP methods, wrong status codes.
2. **Security** — SQL injection, XSS, unvalidated user input reaching sensitive operations, exposed secrets or tokens, missing authorization checks, IDOR risks.
3. **Project standards** — check CLAUDE.md and the relevant docs referenced there:
   - `docs/ui.md`: shadcn/ui only, dates formatted with `date-fns` as `dd.MM.yyyy`.
   - `docs/data-fetching.md`: Server Components data-fetching rules, authorization in data helpers.
   - `docs/data-mutation.md`: Server Actions pattern, Zod validation at boundaries.
   - `docs/auth.md`: Clerk usage, role checks, onboarding flow.
4. **Next.js 16 correctness** — `params`/`searchParams` must be awaited, no custom webpack config, no `next lint`, no `useMemo`/`useCallback` for perf (React Compiler handles it).
5. **React Server / Client split** — `'use client'` present only where actually needed (hooks, browser APIs, event handlers).
6. **Code quality** — unused variables/imports, dead code, unnecessary comments, missing error handling at system boundaries (user input, external APIs), over-engineering beyond task scope.

Classify each finding as one of:
- **BLOCKER** — must be fixed before merging (correctness bug, security issue, standards violation).
- **NOTE** — minor observation, does not block merge (style nit, optional improvement).

If any BLOCKERs are found:
- Print a clearly formatted review with each BLOCKER and its file + line reference.
- Stop: "Review found blockers — fix them and re-run /ship-pr."

If only NOTEs (or no findings):
- Print the NOTEs (or "Review: no issues found").
- Continue to Step 4.

---

### Step 4: Create the pull request

Check if a PR already exists for this branch:
`gh pr view --json number,url 2>/dev/null`

If a PR exists, print its URL and skip to Step 5.

Otherwise, gather PR data:
- **Title**: derive from the branch commits — short, ≤70 chars, imperative mood, no trailing period.
- **Body**: use this template:

```
## Summary
<2-5 bullet points covering what changed and why>

## Test plan
- [ ] Lint passes (`npm run lint`)
- [ ] Type-check passes (`npx tsc --noEmit`)
- [ ] <add feature-specific manual checks here>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Create the PR:
```
gh pr create --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

Print the PR URL.

---

### Step 5: Merge the pull request

Merge using squash merge to keep the default branch history linear:
`gh pr merge --squash --delete-branch`

If the merge fails (e.g. merge conflicts, required checks), print the error and stop:
"Merge failed — resolve the issue above and re-run /ship-pr."

On success, print:
"Merged and branch deleted. Your changes are on `<DEFAULT_BRANCH>`."

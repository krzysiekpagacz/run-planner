---
name: new-branch
description: "Create a new git branch from the latest remote default branch. Use this skill when the user asks to 'new branch', 'create a branch', 'start a branch', or 'switch to a new branch'. Takes the branch name as $ARGUMENTS."
argument-hint: <branch-name>
allowed-tools: Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git fetch:*), Bash(git checkout:*), Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git symbolic-ref:*), Bash(git ls-remote:*), Bash(git remote:*)
---

## Context

- Branch name argument: $ARGUMENTS
- Current branch: !`git branch --show-current`
- Working tree status: !`git status --short`
- Pre-staged files: !`git diff --cached --name-only`

## Your task

Create a new branch named `$ARGUMENTS` from the latest remote default branch. Follow these steps **strictly in order**. Stop at the first failure — do not skip ahead.

---

### Step 0: Pre-flight checks

**0a. Validate branch name.**
If `$ARGUMENTS` is empty or blank, stop: "Please provide a branch name: /new-branch <branch-name>"

**0b. Check for detached HEAD.**
Run `git branch --show-current`. If the output is empty, stop: "You are in detached HEAD state. Please checkout a named branch first (e.g. `git checkout main`) before running /new-branch."

**0c. Detect the remote default branch.**
Run: `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'`
Store the result as DEFAULT_BRANCH. If the command returns no output, fall back to `main`.

**0d. Detect if on the default branch.**
If the current branch (from 0b) equals DEFAULT_BRANCH, set ON_DEFAULT_BRANCH=true. Do NOT stop — this is a valid starting point when the intent is to branch off from the default branch directly.

**0e. Warn about pre-staged changes.**
If `git diff --cached --name-only` returns any files, tell the user: "These files are already staged and will be included in the commit: <list them>. Proceed, or run `git reset HEAD` to unstage first." Wait for confirmation before continuing.

**0f. Check for branch name conflict.**
Run `git branch --list "$ARGUMENTS"` and `git ls-remote --heads origin "$ARGUMENTS"`. If either returns non-empty output, stop: "A branch named '$ARGUMENTS' already exists (locally or on the remote). Choose a different name, or switch to it with `git checkout $ARGUMENTS`."

---

### Step 1: Handle uncommitted changes

**If ON_DEFAULT_BRANCH is true**: skip this entire step. Uncommitted and untracked changes will carry over automatically when the new branch is created in Step 3.

Run `git status --porcelain`. If clean, skip to Step 2.

**1a. Handle untracked files.**
If any lines start with `??`, show the user the list and ask: "These untracked files will not be staged automatically. Include any of them in the commit? (yes/no)"
- **Yes**: ask which ones (or all), then `git add <each specified file>`.
- **No**: proceed to 1b without staging any untracked files.

**1b. Stage tracked changes.**
Run: `git add -u`

**1c. Commit.**
Use Conventional Commits format (`<type>(<scope>): <subject>`), imperative mood, ≤72 chars total. Run `git diff --cached` to understand the changes. For logically complex changes, write a multi-line message with a short subject and a body. Create the commit: `git commit -m "..."`.

**1d. Push the current branch.**
Note: this publishes your work to the remote before switching branches.
Run `git status -sb` and look for `## <branch>...origin/<branch>` to confirm an upstream exists.
- **Upstream configured**: run `git push`.
- **No upstream**: tell the user "No remote tracking branch configured. About to run `git push -u origin <current-branch>`. Confirm to push, or type 'skip' to leave this branch unpushed." On confirm, run `git push -u origin <current-branch>`. On skip, proceed to Step 2.

---

### Step 2: Fetch the default branch

Run: `git fetch origin <DEFAULT_BRANCH>`
(Use the DEFAULT_BRANCH value from step 0c.)

---

### Step 3: Create and checkout the new branch

- **If ON_DEFAULT_BRANCH is true**: run `git checkout -b "$ARGUMENTS"` — this carries any uncommitted/untracked changes to the new branch.
- **Otherwise**: run `git checkout -b "$ARGUMENTS" origin/<DEFAULT_BRANCH>` — branches from the freshly-fetched remote tip.

(The argument is always quoted to handle names with spaces or special characters.)

---

### Step 4: Confirm

Print: "Created branch `$ARGUMENTS` from `origin/<DEFAULT_BRANCH>` at:" then run `git log --oneline -1`.

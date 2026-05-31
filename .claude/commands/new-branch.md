---
name: new-branch
description: "Create a new git branch from the latest remote main. Use this skill when the user asks to 'new branch', 'create a branch', 'start a branch', or 'switch to a new branch'. Takes the branch name as $ARGUMENTS."
argument-hint: <branch-name>
allowed-tools: Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git fetch:*), Bash(git checkout:*), Bash(git branch:*), Bash(git log:*)
---

## Context

- Branch name argument: $ARGUMENTS
- Current branch: !`git branch --show-current`
- Working tree status: !`git status --short`

## Your task

Create a new branch named `$ARGUMENTS` from the latest `origin/main`. Follow these steps in order:

### Step 0: Validate argument

If `$ARGUMENTS` is empty or blank, stop immediately and tell the user: "Please provide a branch name: /new-branch <branch-name>"

### Step 1: Handle uncommitted changes

Run `git status --porcelain`. If the output is non-empty (dirty working tree):

1a. Check for untracked files (`??` prefix in `git status --porcelain`). If any exist, **do not stage them automatically** — ask the user whether to include them before proceeding.

1b. Stage all tracked changes: `git add -u`

1c. Commit using a meaningful conventional-commit message that describes the staged changes. Use `git diff --cached` to understand what was changed. Create the commit with `git commit -m "..."`.

1d. Push the current branch. Check whether the current branch has a remote tracking branch configured (`git status -sb` — look for `origin/...`). If it does, run `git push`. If it does not, warn the user and ask whether to push with `git push -u origin <current-branch>` before continuing.

If the working tree is already clean, skip steps 1a–1d entirely.

### Step 2: Fetch latest main

Run: `git fetch origin main`

### Step 3: Create and checkout the new branch

Run: `git checkout -b $ARGUMENTS origin/main`

### Step 4: Confirm

Report the new branch name and the commit it was created from: `git log --oneline -1`

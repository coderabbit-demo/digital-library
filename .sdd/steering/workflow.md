# Development Workflow

Project memory for *how* work moves here — conventions that aren't derivable from the code itself.

## Spec-Driven Development

Features go through the SDD lifecycle in `.sdd/specs/<feature>/`: `spec-init → spec-requirements → spec-design → spec-tasks → spec-impl`, with human approval gating each phase (Requirements → Design → Tasks → Implementation). Requirements use EARS-format, numeric IDs (`N.M`). Existing specs: `home-feed` (shipped), `media-platform-v2` (shipped, the multi-media + re-skin v2), `nyt-recommendations` (being superseded by `trending-now`), `trending-now` (in progress).

**Spec docs always go through a PR.** Whenever a **requirements.md** or **design.md** is created or updated, open a PR for it (with the Jira issue URL) and let it be reviewed/merged — do not commit requirement/design changes straight to `main`. The PR is the review surface for that phase, and CodeRabbit reviews it too. (Steering and incidental doc edits may be committed directly when the maintainer says so; this rule is specifically about spec requirements/design.)

## Task tracking — Jira

- Board: project **DL** (board 36), `https://coderabbit-demo.atlassian.net`. Reached via the Atlassian MCP.
- Each implementation task maps to a **Story** (often under an **Epic**, e.g. media-platform-v2 = Epic DL-39, stories DL-40…DL-51), assigned to the owner, labelled with the feature name.
- **Status flow**: move a story to **In Progress** when work starts, **Done** on PR merge. (Transitions: In Progress=21, Done=31.) The board's simplified workflow has only To Do / In Progress / Done — there's no "Won't Do" status, so record a won't-do decision in a comment and move to Done.
- Don't manage sprint assignment via automation here — the owner handles that separately.

## Branches & PRs

- One **branch + PR per story**, branched off `main` (e.g. `feature/DL-40-design-system`). Squash-merge and delete the branch.
- **Every PR description MUST include the Jira issue URL it resolves** (`Resolves: https://.../browse/DL-XX`). This is a hard rule.
- Keep `main` working: prefer additive, non-breaking changes; when an IA/route moves, leave a redirect so nothing 404s between merges.

## Review gate — CodeRabbit

- **CodeRabbit gates merges.** A `CodeRabbit` commit-status check goes `PENDING` after every push and `gh pr merge` refuses while the PR is `UNSTABLE`. Wait for the check to be `SUCCESS` **and** `mergeStateStatus` `CLEAN` before merging; confirm it's stable (it can briefly read a stale `SUCCESS` right after a push before flipping to `PENDING`).
- Address CodeRabbit's actionable comments (fix → push → re-check) before merging. Treat its a11y/security/correctness flags as real.

## Definition of done (per story)

1. `npm run typecheck`, `npm test`, and `npm run build` all green.
2. Tests added for new behavior (unit for pure logic, pglite integration for DAL/endpoints).
3. PR opened with the Jira URL, CodeRabbit `SUCCESS`/`CLEAN`, comments addressed.
4. Squash-merged; Jira story → Done; local `main` synced.

---
_Last updated: 2026-05-29_

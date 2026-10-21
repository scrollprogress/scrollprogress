# Implementation plans

For the broader agent workflow and pull request conventions, see
[AI-assisted development](docs/internal/ai-development.md).

Use a persistent plan when work spans multiple subsystems, changes a public contract,
requires a migration or release sequence, or is likely to continue across multiple sessions.
A typo, isolated documentation correction or small focused fix does not need one.

## Location

Store active and pending plans in `notes/plans/<short-name>.md`. Move completed plans to
`notes/plans/completed/`, preserving useful history and verification references. Keep other
private notes outside `notes/plans/` so that the planning directory contains only plans.

The entire `notes/` directory, including these subdirectories, is intentionally ignored by
Git. Commit a plan only when the user explicitly asks for a durable design record and
chooses its destination.

## Required content

A plan must be understandable without chat history and contain:

1. **Goal and success criteria** — the observable outcome and explicit non-goals.
2. **Current state** — relevant behavior, contracts and repository entry points.
3. **Decisions** — chosen approach, important tradeoffs and compatibility constraints.
4. **Implementation** — ordered, independently verifiable milestones.
5. **Validation** — automated checks, browser evidence and acceptance scenarios.
6. **Risks and recovery** — likely failure modes and how to leave the repository usable.
7. **Progress** — dated completed, active and remaining work.

## Maintenance

- Update the plan when evidence changes the approach; record the reason instead of silently
  rewriting the decision.
- Keep progress factual and ensure the next step is clear after an interruption.
- Do not use a plan to expand the user's scope or authorize publishing, destructive actions
  or external changes.
- At completion, reconcile the plan with the actual result and verification, then move it
  to `notes/plans/completed/`. Update references affected by the move. Archive a plan when
  its own scope is complete; track remaining follow-ups in separate active plans.
- Delete a completed plan only when it no longer provides useful history or evidence.

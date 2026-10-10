# Implementation plans

Use a persistent plan when work spans multiple subsystems, changes a public contract,
requires a migration or release sequence, or is likely to continue across multiple sessions.
A typo, isolated documentation correction or small focused fix does not need one.

## Location

Store working plans in `notes/<short-name>.md` by default. `notes/` is intentionally ignored
by Git so temporary planning does not become public project documentation. Commit a plan only
when the user explicitly asks for a durable design record and chooses its destination.

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
- At completion, reconcile the plan with the actual result and verification. Delete local
  working plans when they no longer provide value.

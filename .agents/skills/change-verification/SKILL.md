---
name: change-verification
description: Select and run proportionate verification for ScrollProgress code, tests, tooling, playground, configuration, or documentation changes before handoff.
---

# Change verification

Use this workflow after an implementation is stable enough to verify and before reporting it
complete.

## Select checks from evidence

1. Inspect the actual diff and `git status`; do not infer scope only from the task prompt.
2. Read the command descriptions in
   [the development guide](../../../docs/internal/development.md) when the correct check or
   its prerequisites are unclear.
3. Start with the focused checks in `AGENTS.md` and expand when changes cross boundaries:
   - library or debug source: type-check the library and run affected Vitest files;
   - playground: type-check it and build it when pages, routing or output change;
   - scripts and browser fixtures: run the relevant tooling tests;
   - Markdown and configuration: check formatting and validate referenced paths and commands;
   - package contracts: also use the `package-contract` skill;
   - browser-sensitive behavior: also use the `browser-validation` skill.
4. Use `npm run verify` when preparing a release or when the diff is broad enough that focused
   checks cannot establish confidence. In a fresh checkout, build the library before commands
   whose tests import built package entries.

## Handle results

- Fix failures caused by the requested change and rerun the smallest failed check.
- Do not rewrite unrelated code to make a pre-existing failure disappear.
- Treat warnings as failures where the repository command does.
- Report the exact commands and outcomes. State why any relevant check was skipped.
- Do not claim release readiness from focused checks alone.

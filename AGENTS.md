# ScrollProgress agent instructions

## Project

ScrollProgress is an ESM-only, dependency-free TypeScript browser library. It turns an
element's position in a viewport or scroll container into progress from `0` to `1` and
ships optional debug tools through separate package entries.

Use these sources of truth as needed:

- `README.md` and `docs/` describe the public package and supported behavior.
- `docs/internal/development.md` documents setup, commands and generated files.
- `docs/internal/browser-testing.md` defines browser verification and evidence.
- `docs/internal/release.md` defines the release procedure.
- `CONTRIBUTING.md` defines contribution, language and commit conventions.

Do not read every guide before every task. Open only the sources relevant to the change.

## Environment and repository layout

- Use Node 24.18.0 from `.nvmrc`, npm 11.16.0 and the committed lockfile.
- Install dependencies with `npm ci`; do not substitute another package manager.
- Library source lives in `src/lib/`; automated library tests live in `src/tests/`.
- The development playground lives in `playground/`; package and browser fixtures live in
  `tests/`; repository tooling lives in `scripts/`.
- Treat `dist/`, `playground/dist/`, `test-results/` and package archives as generated
  output. Do not edit or commit them.

## Implementation rules

- Keep changes focused on the requested outcome. Preserve unrelated user changes.
- Match the existing strict TypeScript and DOM patterns. Use four-space indentation,
  single quotes, semicolons and the repository's Prettier/ESLint configuration.
- Write source code, comments, documentation, commit messages and pull request text in
  English.
- Preserve lifecycle ownership: trackers and debug tools must release listeners,
  observers, animation frames, subscriptions and DOM they own.
- Preserve the separation between the core entry and optional debug entries. Core imports
  must not pull in debug code, styles or global state.
- Treat public types, runtime behavior, package exports, browser support and the supported
  TypeScript floor as contracts. Change them only when the task explicitly includes that
  contract change, and update tests and public documentation together.
- Do not add runtime dependencies, polyfills, CommonJS output or framework adapters unless
  the task explicitly requires them.
- Add or update regression coverage for observable behavior changes.

## Verification

Use the narrowest relevant checks while developing, fix failures caused by the requested
change, and rerun the affected checks without asking for approval.

| Change                                                 | Minimum focused verification                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Library or debug TypeScript                            | `npm run check:lib` and focused `npm test -- <test-file>`                               |
| Playground                                             | `npm run check:playground`; add `npm run play:build` when its output or routing changes |
| Tooling scripts or browser fixtures                    | `npm run tooling:test` and the relevant focused command                                 |
| Formatting or documentation                            | `npm run format:check` plus link and command review                                     |
| Package entries, exports, types or shipped files       | Follow the `package-contract` skill                                                     |
| Geometry, scrolling, observers, rendering or lifecycle | Follow the `browser-validation` skill                                                   |
| Release candidate or release                           | `npm run verify` and `npm run play:build` for the exact candidate                       |

The complete `npm run verify` gate is appropriate before a release or when broad changes
make focused checks insufficient. Report every command run and any skipped or failed check.

## Repository skills

Load the relevant workflow from `.agents/skills/` when its trigger applies:

- Use `change-verification` before handing off code, test, build, tooling or documentation
  changes.
- Use `browser-validation` for geometry, scrolling, observer, resize, focus, rendering,
  performance or teardown behavior.
- Use `package-contract` for public API or type changes, package exports, compatibility,
  tarball contents, versioning or release preparation.

Agents without native skill discovery should read the matching `SKILL.md` directly.

## Plans, Git and external actions

- Follow `PLANS.md` for work that requires a persistent implementation plan. Do not create
  a plan for a small, self-contained edit.
- `main` is release-ready. Keep work focused and use Conventional Commits when proposing
  commit or squash messages.
- Do not create commits, push, merge, publish packages, create releases or create Git tags
  unless the user explicitly requests that action.
- Never present a partial verification result as release-ready evidence.

# AI-assisted development

> Internal repository documentation. These files guide coding agents and contributors; they
> are not included in the npm package.

The repository keeps one canonical set of always-on instructions in `AGENTS.md`. Tool-specific
files should import or point to it rather than copy its contents. Repeatable, task-specific
workflows live in `.agents/skills/` and are loaded only when relevant.

## Supported agents

| Agent           | Repository entry point                            | Skill behavior                                                        |
| --------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| Codex           | `AGENTS.md`                                       | Discovers `.agents/skills/`                                           |
| Claude Code     | `CLAUDE.md`, which imports `AGENTS.md`            | Follows the routing rules in `AGENTS.md` and reads the matching skill |
| GitHub Copilot  | `.github/copilot-instructions.md` and `AGENTS.md` | Discovers `.agents/skills/` where supported                           |
| Cursor          | Root `AGENTS.md`                                  | Follows the skill routing rules in `AGENTS.md`                        |
| Gemini CLI      | `GEMINI.md`, which imports `AGENTS.md`            | Follows the skill routing rules in `AGENTS.md`                        |
| JetBrains Junie | Root `AGENTS.md`                                  | Follows the skill routing rules in `AGENTS.md`                        |

Do not add `.junie/AGENTS.md` unless Junie genuinely needs different instructions: Junie gives
that file precedence over the root instructions. Do not add a Cursor rule that repeats
`AGENTS.md`; Cursor already reads the root file.

## Available skills

- `change-verification` selects checks from the actual diff and records their results.
- `browser-validation` defines proportionate real-browser evidence and reporting.
- `package-contract` protects public API, compatibility and distributable package boundaries.

Codex and compatible agents can invoke these skills natively. Other agents should follow the
conditional routing in `AGENTS.md` and read the corresponding `SKILL.md` directly.

## Planning and pull requests

`PLANS.md` defines when complex work needs a persistent plan. Active and pending plans go
in `notes/plans/`; completed plans move to `notes/plans/completed/`. The entire `notes/`
directory is ignored by Git and can also contain other private notes outside `plans/`.
Plans remain local unless the user explicitly requests a versioned design record.

The pull request template asks for the observable change, public-contract impact, exact
verification, browser evidence and documentation updates. A skipped check must include a reason;
focused checks must not be described as complete release verification.

## Maintenance

- Put rules needed for nearly every task in `AGENTS.md`.
- Put repeatable conditional workflows in a skill with a precise `name` and `description`.
- Keep detailed product and maintainer knowledge in its existing authoritative document and
  link to it from agent instructions.
- Update adapters only when a tool's discovery mechanism changes.
- Validate changed skills and run Prettier checks before handoff.

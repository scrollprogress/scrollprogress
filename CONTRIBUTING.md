# Contributing

ScrollProgress is licensed under the [MIT License](LICENSE). Contributions are
welcome through the public repository at
`https://github.com/scrollprogress/scrollprogress`.

The current npm prerelease uses the `rc` dist-tag. This workflow applies to the
release candidate and subsequent development.

Participation in the project is governed by the
[Code of Conduct](https://github.com/scrollprogress/scrollprogress/blob/main/CODE_OF_CONDUCT.md).

## Before starting

Use GitHub Issues for reproducible bugs and focused feature proposals. Discuss
changes to public APIs, package structure or release behavior before implementing
them.

Do not report suspected vulnerabilities through public issues or pull requests.
Follow the private reporting instructions in [SECURITY.md](SECURITY.md).

## Development workflow

`main` is the release-ready branch. `dev` is a permanent integration branch for
collecting changes before they are ready to enter `main` together.

Contributors with repository write access may push directly to `dev` or create
focused branches from it and squash-merge them locally into `dev`, without an
intermediate pull request. Create each subsequent branch from the updated `dev`
when it depends on previously integrated work.

Every push to `dev` runs `npm run verify` and `npm run play:build` through GitHub
Actions. These checks run after the push; changes on `dev` may still be incomplete
or fail verification. When a group of changes is ready, open a pull request from
`dev` to `main` and use a merge commit to preserve the shared history. After it is
merged, merge the updated `main` back into `dev` before starting the next cycle.
Keep `dev` for subsequent development; do not recreate it after each integration.

Direct pull requests against `main` are also welcome for focused, ready-to-integrate
changes. These pull requests are squash-merged. After merging one, bring the
updated `main` into `dev` so both branches include the change. All pull requests
run the same automated checks.

Use descriptive branch names such as:

```text
fix/observer-cleanup
docs/update-lifecycle-guide
test/mobile-horizontal-tracking
```

Commit messages, including squash and merge commit messages, must follow
Conventional Commits and be written in English, for example:

```text
fix(core): release observers after setup failure
docs(api): clarify update callback removal
test(browser): cover horizontal viewport tracking
```

Contributors with repository write access may push branches directly to the
repository. Other contributors can use a fork. A fork is not required merely to
run or test the project.

## Local setup

Use Node 24.18.0 from `.nvmrc` and install the committed dependency graph:

```sh
npm ci
```

For local development, commands and project structure are documented in the
[maintainer development guide](docs/internal/development.md).
The [maintainer documentation index](docs/internal/README.md) also links browser
verification, compatibility evidence and release procedures used from a clone or
fork.

Run the complete automated gate before requesting review:

```sh
npm run verify
```

If the playground changed, also run:

```sh
npm run play:build
```

Report any failed or skipped checks in the pull request. A partial pass must not
be presented as release-ready verification.

## Focused checks

Use the narrowest relevant checks while developing:

```sh
npm run check:lib
npm run check:playground
npm test
npm run tooling:test
npm run format:check
npm run lint
```

`npm run check` covers the complete TypeScript project, including tests,
playground code and configuration. It remains part of `npm run verify`.

Use `npm run format` to apply Prettier. `npm run lint:fix` may edit source and
test files; inspect its changes before committing.

## Change requirements

Keep changes focused and preserve documented public contracts, teardown behavior
and optional debug entry points.

Include a regression test when fixing observable behavior. Record relevant
browser results for changes involving geometry, observers, scrolling, focus,
rendering or lifecycle behavior.

A useful bug report or pull request includes:

- the package version, commit or tarball SHA-256;
- browser and operating system versions;
- expected and observed behavior;
- the smallest reproducible example;
- whether the test used repository sources or an installed tarball;
- the verification commands that were run.

Keep functional changes, dependency updates and formatting-only changes in
separate pull requests whenever practical.

Do not commit generated output or local evidence, including:

```text
dist/
playground/dist/
test-results/
*.tgz
```

## Language

Source code, comments, public documentation, commit messages, issues and pull
requests must be written in English.

Historical release-preparation notes may remain in the private archive, but they
must not be copied into the public repository or npm package.

## Project scope

Future features and adapters are ideas rather than scheduled release promises.
Prefer concrete browser compatibility, correctness, packaging and documentation
work over speculative expansion.

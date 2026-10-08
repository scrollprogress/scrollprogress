# Maintainer development

> Internal repository documentation. This guide is for contributors and release
> maintainers, not applications that install ScrollProgress.

Use Node 24.18.0 (`.nvmrc`) and the committed npm lockfile. The current verified
environment uses npm 11.16.0. This is a development toolchain, not a Node runtime
requirement for a library that runs in browsers. TypeScript 6.0.3 is the primary
development compiler; pinned TypeScript 5.5.4 and 5.9.3 aliases exist only for
installed-package compatibility checks.

From the repository root:

```sh
npm ci
npm run play
```

The playground supports local development and reproduction of browser behavior.
It is not shipped in the npm package. A successful playground run does not prove
that the packaged library contains everything an external application needs.

## Playground

Run all commands below from the repository root.

### Development

```sh
npm run play
```

Open the HTTP address printed in the terminal. The development server updates
the pages as you edit their source files.

### Build and preview

```sh
npm run play:build
npm run play:preview
```

The build includes `index.html`, `core.html`, `experiments.html`, `debug.html` and
`viewport-x.html`, and writes them with their assets into `playground/dist/`.

Preview serves the existing build. After changing source files, run
`npm run play:build` again to update it.

Open the HTTP address printed in the terminal rather than opening generated
HTML files directly. Stop development and preview servers with Ctrl+C.

### Output directory

The default output path is anchored to the location of `vite.config.ts`.

To choose another output directory for a particular run:

```sh
npm run play:build -- --outDir build
npm run play:preview -- --outDir build
```

Both commands use `playground/build/`: relative output paths are resolved
from `playground`. Pass the same output directory to build and preview.

The configuration requires the output directory to be strictly inside
`playground`. It rejects `playground` itself, outside paths, and symbolic
links along the output path within `playground`. Absolute paths are accepted
only when they satisfy the same checks.

Rebuilding empties the selected output directory. Use a directory dedicated
to generated files; never select a directory containing source files,
notes or saved reports.

The default `playground/dist/` is excluded from Git, ESLint and Prettier.
If you use another destination, update the corresponding ignore rules.
Custom output directories remain on disk until you remove them.

### Useful options

Arguments after `--` are passed to Vite.

| Command                                                   | Purpose                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run play -- --port 3000 --open`                      | Choose a development port and open the browser.                                      |
| `npm run play -- --host`                                  | Make the development server reachable from other devices on a trusted local network. |
| `npm run play:preview -- --port 4300 --strictPort --open` | Preview on the chosen port; fail if it is already occupied.                          |
| `npm run play:build -- --sourcemap`                       | Generate source maps for debugging compiled code.                                    |
| `npm run play:build -- --base /demo/`                     | Build asset URLs for hosting under `/demo/`.                                         |

Options differ between development, build and preview.
See the [Vite CLI reference](https://vite.dev/guide/cli) for the complete list.

## Checks

| Command                                | Purpose                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `npm run check`                        | Type-check library, tests, playground and configuration                     |
| `npm run check:lib`                    | Type-check only the library, including its optional debug entries           |
| `npm run check:playground`             | Type-check the playground and the library sources it imports                |
| `npm test`                             | Run the complete automated test suite                                       |
| `npm run lint`                         | Type-check and ESLint; fail on errors or warnings                           |
| `npm run lint:fix`                     | Apply ESLint fixes; review the changes, then run lint again                 |
| `npm run format:check`                 | Check formatting with Prettier without editing                              |
| `npm run format`                       | Format source, tests, scripts, styles and documentation with Prettier       |
| `npm run lib:dev`                      | Watch and type-check the library sources                                    |
| `npm run lib:build`                    | Check library types and emit its JavaScript and declarations                |
| `npm run play:build`                   | Check playground types and build the development playground                 |
| `npm run play:preview`                 | Serve the existing playground build over HTTP                               |
| `npm run pack:check`                   | Build, check public entries and preview package contents                    |
| `npm run consumer:check`               | Build, pack and check entries, types and bundles in `test-results/consumer` |
| `npm run consumer:browser`             | Run the consumer checks, then serve the installed-package browser tests     |
| `npm run consumer:check -- --external` | Run the isolated external installation check required for release           |
| `npm run tooling:test`                 | Check consumer lifecycle, browser reports and playground output protection  |
| `npm run verify`                       | Lint, formatting, complete tests, packaging and external consumer           |

`verify` builds and checks the package before running the remaining checks.
The full `check` and `lint` commands include tests that import the built
package, so run `npm run lib:build` first when invoking them separately
in a fresh checkout.

`verify` stops at its first failure and retains both TypeScript and ESLint checks.
Its results apply to the exact candidate tested; see the RC status for the public
verification summary.
It includes the aggregate `check` through `lint`, so errors in the playground,
tests or build configuration still block the complete gate. Current release
boundaries are recorded in the [RC status](release-map.md).

`pack:check` does not replace `npm test`. `consumer:check` builds before packing so
it cannot silently inspect old output. In `verify`, the consumer script follows
`pack:check` and reuses that build with `--external`.

`entries:test` uses `vitest.entries.config.ts` to test the built package
imports independently of the playground configuration. Run `lib:build`
first when invoking these tests separately; `pack:check` already handles
that order.

## Library and playground type checks

Use `npm run check:lib` while changing the library and `npm run check:playground`
while changing a demo. Both inherit the same strict TypeScript settings from
`tsconfig.json`; they select different starting files:

- `tsconfig.lib.json` selects `src/lib`, including core and debug. Its `rootDir`
  also prevents library source from importing TypeScript implementations outside
  that directory.
- `tsconfig.playground.json` selects the playground. TypeScript follows its imports,
  so the library sources used by the demos are also checked.
- `tsconfig.json` keeps the complete selection: library, tests, playground and
  Vite configuration. `npm run check` remains the check for the whole project.
- `tsconfig.build.json` inherits the library selection and emits only declaration
  files into `dist/`. Vite emits the library JavaScript into the same directory.

For example, an incorrect type in `playground/main.ts` fails `check:playground`,
`check`, `play:build` and `verify`, while `lib:build` can still build a valid library.
An error in the library itself fails `check:lib` and `lib:build`. A successful
library build is therefore one part of the release checks; run `npm run verify`
before preparing a release.

Vite's development servers keep their existing hot reload behavior. `lib:dev`
watches library types; run `check` to include tests and configuration. No files
move, and the playground continues to use the repository's development dependencies.

## Consumer TypeScript compatibility

The source build uses TypeScript 6.0.3. Separately, the consumer check compiles
the declarations from the installed tarball with these pinned compilers:

| Local package directory | Compiler version | Purpose                        |
| ----------------------- | ---------------- | ------------------------------ |
| `typescript-5-5`        | 5.5.4            | Supported consumer floor       |
| `typescript-5-9`        | 5.9.3            | Selected recent TypeScript 5   |
| `typescript`            | 6.0.3            | Current development TypeScript |

For every compiler, `scripts/check-consumer.mjs` runs both Bundler and NodeNext
resolution with strict checking and `skipLibCheck: false`. The fixture imports
the public core and debug entries from the installed package, not repository
sources. The exact compiler versions are asserted before use and recorded in the
consumer report.

The aliases keep the matrix available after `npm ci` and avoid downloading tools
during `verify`. They are devDependencies only and do not add runtime dependencies
to the published library. Do not replace them with unpinned `npx` calls.

When changing the matrix, update `package.json` and the compiler list in
`scripts/check-consumer.mjs` together, let npm update `package-lock.json`, and
review the lockfile diff. Then run a clean `npm ci` and `npm run verify`. Change
the documented TypeScript support floor only after the installed-package checks
pass with that version.

## Formatting and linting

Prettier controls formatting (indentation, quotes, wrapping); ESLint checks code
for mistakes such as undefined variables, duplicate imports and unsafe control
flow. TypeScript still checks types. These tools are development dependencies;
none is shipped with or imported by the library. Their versions are pinned in
package.json and the lockfile; use `npm ci` rather than a global installation.
See the official [Prettier installation guidance](https://prettier.io/docs/install)
and [typescript-eslint compatibility](https://typescript-eslint.io/users/dependency-versions/)
when deliberately updating these tools.

From the project root:

```sh
npm run format:check
npm run lint
```

These commands do not modify source files. To apply changes deliberately:

```sh
npm run format
npm run lint:fix
npm run format
npm run lint
```

`lint:fix` fixes only supported rules, not every problem. Read any remaining
message (file, line and rule), correct the cause, and rerun the check. Review
formatting separately from functional corrections. Editor integration is optional:
use the repository's Prettier/ESLint configuration, not an editor-specific style.
No Git hooks are installed and no files are modified automatically on commit.

Configuration is in `.prettierrc.json`, `.prettierignore`, `.editorconfig` and
`eslint.config.mjs`. Code uses four spaces, single quotes and semicolons; JSON,
Markdown, HTML and YAML use two-space indentation. Prettier leaves embedded code
strings alone to avoid changing runtime HTML/CSS templates. It covers supported
source and documentation files, including `.js` browser fixtures and SCSS.
Generated output, consumers/reports, dependencies and reference copies are ignored;
npm owns package-lock.json formatting.

ESLint covers JavaScript/TypeScript, Node scripts/configuration, tests and the
playground, including the previously omitted browser `.js` fixtures. Browser
and Node globals are scoped to their respective files. Recommended JavaScript
and TypeScript rules are used without stylistic rules; eslint-config-prettier
keeps formatting concerns in Prettier. Type-aware lint rules and additional
framework plugins are not enabled. TypeScript's existing strict checks remain.

Unused callback parameters and catch bindings are allowed, consistent with the
compiler configuration. Two test mock constructors have documented local
exceptions for exposing their latest observer instance. New exceptions should
explain the intent at the affected line, not disable checks for entire folders.

## Consumer installation and saved files

The consumer script creates a real `.tgz`, installs it in
`test-results/consumer` without a package symlink, and checks public imports,
declarations across the pinned TypeScript matrix in Bundler and NodeNext modes,
bundling and the exclusion of debug from core. It uses the repository's pinned
compilers and bundler as test tools; package resolution starts from the generated
consumer's own installation. No publication is involved.

The same directory is reused on every run. Before installing, the command
replaces its generated contents so stale files cannot make a check pass. Files
remain after success, failure and Ctrl+C, where developers can inspect them or
delete the entire generated directory. Do not put hand-written files there: the
next run replaces its contents. Library compilation still writes to `dist/`.

For a separate consumer that will not be overwritten by the default command:

```sh
npm run consumer:browser -- --name comparison
```

This uses `test-results/comparison`. Names accept 1–48 lowercase letters, digits
or hyphens, beginning with a letter or digit. Named copies are created only on
explicit request; ordinary runs do not accumulate numbered directories. There
is no `--keep` option: local consumers are retained by default.
The names `reports`, `history`, `lint-format-review` and `typecheck-separation`
are reserved for saved results and review notes. They are rejected before
creating or replacing a consumer directory, including directories marked
by older scripts.

Successful checks replace two files inside the project:

- `test-results/consumer-latest.json`: environment, checks, sizes and tarball SHA-256.
- `test-results/consumer-latest.tgz`: the exact package archive that was installed.

There is no growing automatic history of archives. Save a named copy of this pair
deliberately if a release candidate needs to be retained. Each consumer also
contains its own `report.json` and original `.tgz`. The report identifies the
storage mode (`project-local` or `external-isolated`) and directory. Reports,
consumer files and archives are excluded from Git
and the npm package. A failed check exits nonzero and does not replace the previous
successful results; check the timestamp when reading an existing report.

## Browser checks

From the repository root, run:

```sh
npm run consumer:browser
```

1. Wait for the build and consumer checks to finish. The command creates and
   installs a fresh package, then starts a local HTTP server.
2. Open the **Smoke tests** HTTP link printed in the terminal. Press **Run smoke
   tests** on the page: this runs a short set of browser behavior checks.
3. Use **Manual checks** to try the viewport/custom root controls, or
   **Benchmarks** and **Run baseline** to measure the sample workloads.
4. Leave the terminal running while using the pages. Press **Ctrl+C** in that
   terminal when finished: this closes the server and keeps the generated files
   in `test-results/consumer`. After changing the library or fixtures, stop and run
   the command again to test a fresh package.

No directory needs to be configured or copied manually. The server
tries port 4174 and chooses another if it is busy: use the actual printed link.
`consumer:check` still runs the automated package checks and exits; only
`consumer:browser` keeps a server running. Neither command starts the browser
tests automatically.

**Do not double-click the HTML files or open a `file://` URL.** Browser JavaScript
modules need these pages to be served over HTTP. The local server also resolves
their imports from the installed package. No browser security setting needs to
be changed.

For a physical device on the same trusted network, run:

```sh
npm run consumer:browser -- --host 0.0.0.0
```

This explicitly makes the test server reachable from other devices. Open the
printed link containing the development computer's LAN address on the device,
then follow **Manual device checks**. The default command only listens on the
development computer's loopback address. Follow the
[compatibility contract](../compatibility.md) and record browser/OS versions,
device and tarball hash. Desktop emulation is not a physical-device result.

The fixture sources live in `tests/browser` and belong in Git. They help the
maintainer and contributors verify releases and reproduce problems. They are
copied into the generated consumer for each run; they are not included in the
npm tarball or library JavaScript bundles. Keep the repository sources.

A running command reserves its consumer directory using a `.running` subdirectory.
A second command with the same name stops before replacing any files. Close the
first command with Ctrl+C or choose another `--name`. A normal exit or error
releases this reservation. After a forced termination or OS crash, the generated
directory remains visible: once that process has stopped, delete the entire
consumer directory and rerun the command. Closing just the browser tab does not
stop its server.

`CONSUMER_DIRECTORY` in the earlier instructions was a placeholder for this
generated directory, not a configuration variable to define. The new command
handles it automatically.

Each page has **Save report (JSON)**. The browser downloads the report; choose
its location or move it from Downloads into `test-results/reports/`. Do not save
reports inside the generated consumer, which is replaced on the next run.
Manual reports include an operator checklist, recorded actions and snapshots.
See the [step-by-step browser and report guide](browser-testing.md) for folder
layout, controls, every benchmark metric and interpretation limits.
Save before closing or reloading: browser sessions are not automatically persisted. The recorded
2026-09-17 smoke and benchmark reports have been saved locally in
`test-results/browser-smoke-2026-09-17.json` and
`test-results/browser-benchmark-2026-09-17.json`. These historical files were saved
manually, not generated by the scripts. `test-results/` is Git-ignored and excluded
from the package. No video recording is part of these fixtures.

To recreate a consumer and start the pages again, run `npm run consumer:browser`.
Historical benchmark results before 2026-09-18 used a fixture without real
scroll overflow; do not compare them directly with `benchmarkVersion: 2`.
Keep benchmark pages foreground with DevTools closed. Their frame intervals
include browser scheduling/rendering; `meanScheduleMs` measures the synchronous
cost of requesting updates, not all work later performed by the trackers.

## Isolated release check

Keeping a consumer inside the repository is convenient for daily development,
but a separate subdirectory is not a dependency boundary: module resolution can
search parent `node_modules` directories. A missing dependency could therefore
be accidentally supplied by the repository. The playground also runs inside the
project, but is intended to exercise source development rather than certify a
standalone package.

The release gate retains a separate, isolated check:

```sh
npm run consumer:check -- --external
```

`verify` uses this mode automatically. For a release browser smoke, use
`npm run consumer:browser -- --external`. This mode installs under the operating
system's temporary directory and removes the installation/cache on exit, error
or a handled signal. The latest report and tarball still remain in `test-results/`.
It cannot be combined with a custom `--name`.

After a forced termination, the next external run for the same checkout recovers
directories whose owner process is no longer present. It preserves active or
uninspectable processes, symlinks and other checkouts. SIGKILL and power loss cannot
execute cleanup at the time they happen; see
[Node signal behavior](https://nodejs.org/api/process.html#signal-events).

npm is invoked through its Node entry point and paths use Node's platform-aware
utilities. No path is hardcoded to a specific computer. The current workflow has
been exercised on macOS; native Windows/Linux execution is still unverified.

## Reviewing changes

Keep behavior fixes, mechanical formatting, dependency updates and structural
changes separate. Add regression tests for observable bugs. Preserve the B+
error contract, independent core lifecycles and optional debug imports.
No runtime dependency or new public API is needed for tooling improvements.

See [contribution guidance](../../CONTRIBUTING.md) and the
[release procedure](release.md). A clean `npm ci` verification and CI setup
remain release tasks until their results are recorded.

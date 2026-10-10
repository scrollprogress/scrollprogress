---
name: package-contract
description: Protect and verify ScrollProgress public APIs, types, exports, compatibility, tarball contents, versioning, and release candidates.
---

# Package contract

Use this workflow when work changes or evaluates public functions, types, behavior, entry points,
themes, compatibility, package metadata, versions or release readiness.

## Define the contract before editing

1. Inspect `package.json`, the relevant `src/lib/**/index.ts` entries and the public guides in
   `docs/`.
2. Preserve the documented defaults unless the task explicitly changes them:
   - ESM-only browser package with no runtime dependencies or bundled polyfills;
   - supported exports and TypeScript declarations resolve from the installed package;
   - core-only consumers do not receive debug code, styles or global state;
   - supported browser and TypeScript floors remain unchanged.
3. For an intentional contract change, update implementation, exported types, tests, public
   documentation and `CHANGELOG.md` together. Do not bump the version unless requested.

## Verify the distributable artifact

Run checks in dependency order:

1. focused type checks and tests while iterating;
2. `npm run pack:check` for the build, entry imports and package contents;
3. `npm run consumer:check` for the local installed tarball when relevant;
4. `npm run consumer:check -- --external` and the complete release gates only for release
   readiness.

The consumer matrix must continue to cover the pinned TypeScript versions with Bundler and
NodeNext resolution and `skipLibCheck: false`. Inspect the packed file list and verify public
Markdown links when shipped documentation changes.

For release work, follow [the release procedure](../../../docs/internal/release.md) and identify
the exact candidate artifact. Never publish, create a release, create a Git tag or claim that a
registry artifact was verified without explicit authorization and evidence for that artifact.

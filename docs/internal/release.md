# Release procedure

> Internal maintainer procedure. It is not part of the installed library's user
> documentation.

This procedure starts with the first public release candidate. Private development
history and migrations between unpublished APIs are not release documentation.

## Prepare the exact candidate

1. Use the Node version declared in `.nvmrc` and install the lockfile with
   `npm ci` in a clean checkout.
2. Confirm the intended version and public entry points in `package.json`.
3. Run `npm run verify`.
4. Run `npm run play:build`.
5. Inspect the packed file list, metadata, declarations, bundled JavaScript,
   README links and license.
6. Run the installed-tarball browser smoke page and the focused manual checks in
   [browser testing](browser-testing.md).
7. Record the exact commit, tarball SHA-256, npm integrity, sizes and test
   results. Regenerate the artifact after any package-affecting change.

The current public surface and remaining manual evidence are summarized in the
[RC status](release-map.md).

## Publish a release candidate

Publishing is an external state change and requires explicit authorization for
the exact package name, version, registry account, tarball and dist-tag. Keep the
package private during preparation and remove that guard only for the final,
reverified publishable candidate.

Publish the verified archive with the prerelease tag rather than publishing the
working directory:

```sh
# Template only; publication is not authorized by this document.
npm publish VERIFIED_TARBALL.tgz --access public --tag rc
```

Do not move `latest` while publishing an RC.

## Verify after publication

1. Confirm the registry version and dist-tags.
2. Install the published version in a new external consumer.
3. Recheck metadata, integrity, runtime entries, TypeScript resolution, bundling
   and representative browser behavior.
4. Record the published artifact and results in the RC status page.
5. Create the matching Git tag only for the verified published commit.

If verification fails, preserve the evidence and prepare a corrective release;
do not automatically unpublish, retag or mutate unrelated versions.

## Prepare the stable release

Promote to `1.0.0` only after RC feedback is resolved and the public contract is
accepted. Update version, lockfile, changelog and release status, then repeat the
entire candidate and registry verification. Stable publication and its Git tag
require their own explicit authorization; RC evidence does not certify a different
artifact.

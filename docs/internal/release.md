# Release procedure

> Internal maintainer procedure. It is not part of the installed library's user
> documentation.

This procedure starts with the first public release candidate. Private development
history and migrations between unpublished APIs are not release documentation.

## Authorization and workflow

The normal release path uses
[`stage-release.yml`](../../.github/workflows/stage-release.yml): pushing a `v*`
tag runs the automated gates and stages a package on npm. A maintainer inspects
that staged archive before approving its public distribution.

Creating or pushing a tag, staging a package, approving publication and creating
a GitHub release are separate external actions requiring explicit maintainer
authorization. Preparing metadata or passing checks does not authorize them.
The package is publishable without a `private` guard; do not use a local
`npm publish` as an alternative to the staged workflow.

## Prepare the exact candidate

1. Confirm the registry versions and dist-tags, resolve known RC feedback and
   accept the intended public contract. Prepare stable metadata on `dev` before
   the release PR to `main`.
2. Update version and lockfile together. Reconcile the changelog, installation
   commands, public limitations and [release status](release-map.md). Preserve
   historical RC entries and explain incompatible changes from the RC.
3. Use Node and npm from `.nvmrc` and `packageManager`, then install the committed
   lockfile with `npm ci` in a clean checkout of the candidate.
4. Run `npm run verify` and `npm run play:build`.
5. Inspect the packed file list, metadata, declarations, bundled JavaScript,
   README links and license.
6. Run the installed-tarball browser smoke page and focused manual checks from
   [browser testing](browser-testing.md). Record actual browser, OS and device
   information and any untested environments.
7. Preserve the candidate archive and reports outside replaceable consumer
   directories. Record source identity, tarball SHA-256, npm integrity, sizes and
   results. The latest consumer report/archive pair is overwritten by later runs.

Regenerate and reverify the archive after package-affecting changes. Earlier RC
evidence does not certify a stable archive. For metadata/documentation-only
preparation, compare distributed code with the prior tested package; unchanged
runtime and benchmark workloads do not require a new performance campaign.

## Review, merge and tag

1. Review the release PR and require green CI. Use a merge commit for `dev` to
   `main`, as described in [Contributing](../../CONTRIBUTING.md#development-workflow).
2. Confirm CI on the resulting `main` commit and compare its package contents with
   the verified candidate. Record the actual release commit. If contents are
   unchanged, retain applicable browser evidence; a changed Git ID alone does not
   require another manual browser pass.
3. With explicit authorization, create and push the matching `vPACKAGE_VERSION`
   tag on that `main` commit. This is the staging request, not confirmation that
   the package is published.

The workflow checks that the tag matches `package.json`, uses the `npm-release`
environment, reruns `npm ci`, `npm run verify` and `npm run play:build`, and invokes
`npm stage publish`. Its dist-tag mapping is:

| Version        | npm dist-tag |
| -------------- | ------------ |
| `X.Y.Z-rc.N`   | `rc`         |
| `X.Y.Z-beta.N` | `beta`       |
| `X.Y.Z`        | `latest`     |

Do not move `latest` when publishing a prerelease. Any GitHub environment approval
permits the staging job; npm publication approval remains a separate action.

## Inspect and approve the staged archive

1. Wait for a successful staging job and record its stage ID and workflow URL.
2. Inspect the staged package using the intended npm account and registry. Replace
   `STAGE_ID` below with the ID returned by the workflow:

   ```sh
   npm stage view STAGE_ID --json
   npm stage download STAGE_ID
   ```

   Download into a retained evidence directory, outside the generated consumer.

3. Confirm package name, version, public access and dist-tag. Calculate the
   downloaded archive's SHA-256 and npm integrity and require both to match the
   retained verified candidate. CI rebuilding the same source is not sufficient
   proof of archive identity by itself. Preserve provenance information when
   provided by the registry.
4. Stop on a mismatch, failed gate or unexpected metadata. Preserve both archives
   and investigate before approval; do not automatically reject, restage or retag.
5. Only after explicit authorization for that exact staged package, approve its
   publication with `npm stage approve STAGE_ID`. This publishes the package and
   may require npm two-factor authentication.

## Verify after publication

1. Confirm registry version, integrity and dist-tags. For stable `1.0.0`, verify
   that `latest` resolves to `1.0.0`.
2. Install the explicit published version from npm in a new external consumer,
   without repository aliases or symlinks. The local `consumer:check` command
   packs the checkout; it does not certify a registry installation.
3. Recheck metadata, runtime entries, TypeScript resolution, bundling, themes and
   representative browser behavior against that registry installation.
4. Complete the [release record](release-map.md) with commit/tag, workflow and
   staged/published artifact identities, environment and results.
5. Create the matching GitHub release after verification. A stable release is not
   marked as a prerelease. The Git tag already exists because it triggered staging.

If verification fails, preserve the evidence and prepare a corrective release;
do not automatically unpublish, retag or mutate unrelated versions.

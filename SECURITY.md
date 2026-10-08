# Security Policy

## Supported versions

Before the first stable release, security fixes are provided for the latest
published release candidate. Older prereleases are not supported.

After `1.0.0` is published, the latest stable release is the supported version.
Backports to older releases may be provided at the maintainer's discretion but
are not guaranteed.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities through public issues, discussions,
pull requests or social media.

Use either of these private channels:

- GitHub private vulnerability reporting:
  `https://github.com/scrollprogress/scrollprogress/security/advisories/new`
- Email: [team@scrollprogress.com](mailto:team@scrollprogress.com)

Include as much of the following information as possible:

- the affected package version, commit or tarball SHA-256;
- the affected public entry point;
- the browser, operating system and relevant tool versions;
- a minimal reproduction or proof of concept;
- the expected and observed behavior;
- the potential security impact;
- any known mitigations or workarounds.

Do not include credentials, access tokens or unrelated personal information.

## What to expect

Reports will be reviewed privately. The project does not currently guarantee a
specific acknowledgement or resolution time.

When a report is confirmed, the maintainer will assess its impact, prepare a fix
or mitigation and coordinate disclosure with the reporter when practical.
Please allow reasonable time for investigation before publishing details.

A fix may be released as a new release candidate or stable patch, depending on
the affected versions and the project release stage.

## Scope

Reports are in scope when they affect:

- the published core or optional debug entries;
- the integrity or contents of the npm package;
- the documented browser behavior in a way that creates a security impact;
- the build or release process in a way that could compromise distributed
  artifacts.

General bugs without a security impact should be reported through GitHub Issues.

Vulnerabilities found only in development dependencies are evaluated according
to whether they can affect contributors, the build process or the published
artifact.

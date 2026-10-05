# Security Policy

## Scope

GitStar is a static-first application. The browser reads committed JSON snapshots and does not receive GitHub credentials.

## Reporting a vulnerability

Please do not open a public issue for a credential leak, workflow permission issue, or security vulnerability. Contact the repository owner through the private security contact available on the GitHub repository, or open a private report if GitHub Security Advisories are enabled.

Never include access tokens, cookies, or private repository data in an issue or pull request.

## Recommended fork settings

- Keep `GITHUB_TOKEN` usage inside GitHub Actions only.
- Grant workflow write permissions only to the fork that owns the snapshot.
- Do not commit local `.env` files or tokens.
- Review workflow changes before enabling them on an untrusted fork.

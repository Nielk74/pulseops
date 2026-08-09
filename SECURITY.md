# Security policy

## Reporting a vulnerability

Please use GitHub's private security-advisory flow for this repository. Do not
open a public issue containing credentials, internal hostnames, or exploit
details.

## Security boundaries

- No route accepts arbitrary shell, PowerShell, or SQL commands.
- Git arguments are passed as an array to the native executable.
- Oracle probes use fixed minimal SQL plus an administrator-configured,
  read-only representative query.
- Environment-variable collection is allow-listed. Sensitive display values
  are masked while hashes permit drift comparison.
- Credentials remain in the deployment secret store/environment and are never
  persisted in SQLite.
- Mutating actions require Operator or Admin and remain plan-only in V1.
- Identity headers are trusted only when `AUTH_TRUSTED_PROXY=true`; otherwise
  caller-supplied identity headers are ignored.
- Every action stores requester, reason, target, parameters, previous state,
  status, result, and timestamps.

Before live deployment, place PulseOps and the Windows executor behind TLS,
configure corporate OIDC at the trusted proxy, use least-privilege service
accounts, and restrict network access to the intended internal sources.

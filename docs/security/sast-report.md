# SAST Report — Semgrep

Static application security testing for the whole repository (frontend, backend, tests and GitHub Actions workflows).

| | |
|---|---|
| Tool | Semgrep 1.185.0 (Community rules, run with `--metrics=off`) |
| Scan date | 2026-11-21 |
| Scope | Entire repository (`.`), minus `.semgrepignore` |
| Rules run | **166** |
| Files scanned | **425** |
| Raw output | [`sast-results.json`](./sast-results.json) (final scan, after fixes) |

## Rulesets

`p/security-audit`, `p/owasp-top-ten`, `p/javascript`, `p/typescript` (the four required), plus `p/nodejs`, `p/react`, `p/expressjs`, `p/jwt`, `p/command-injection`, `p/insecure-transport` and `p/secrets` because the stack is Node/Express with JWT auth and a React frontend.

`--config auto` was not used: Semgrep only allows it with metrics enabled, which sends project details to Semgrep's servers. Explicit rulesets give the same coverage for this stack and keep the scan reproducible.

## Summary

| Severity | Found | Genuine (fixed) | False positive (suppressed) | Remaining |
|---|---:|---:|---:|---:|
| High / Error | 0 | 0 | 0 | 0 |
| Medium / Warning | 14 | 10 | 4 | **0** |
| Low / Info | 0 | 0 | 0 | 0 |
| **Total** | **14** | **10** | **4** | **0** |

No finding was in application code (`frontend/src`, `backend/src`). All fourteen were in CI configuration files and test files.

## Findings and triage

### 1. Mutable GitHub Action tags — genuine, fixed (8 findings)

Rule: `yaml.github-actions.security.github-actions-mutable-action-tag`

| File | Lines | Action |
|---|---|---|
| `.github/workflows/ci.yml` | 24, 26, 61, 63, 87, 103 | `actions/checkout@v4`, `actions/setup-node@v4`, `gitleaks/gitleaks-action@v2` |
| `.github/workflows/security.yml` | 22, 24 | `actions/checkout@v4`, `actions/setup-python@v5` |

**Risk.** A tag such as `v4` can be moved by the action's owner. If an action were compromised, the new code would run in our CI with access to the repository token (supply-chain attack).

**Fix.** Each action is pinned to the full commit SHA that the tag pointed to, with the tag kept as a comment:

```yaml
- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
```

SHAs were read from the public repositories with `git ls-remote`. When updating an action, look up the new tag's SHA the same way.

### 2. Dependabot without a cooldown — genuine, fixed (2 findings)

Rule: `package_managers.dependabot.dependabot-missing-cooldown.dependabot-missing-cooldown` — `.github/dependabot.yml` (the npm entry and the GitHub Actions entry). The first scan did not report it; the rule started failing the check on the pull request that introduced Dependabot.

**Risk.** Without a cooldown, Dependabot proposes a version as soon as it is published. A malicious or broken release is usually withdrawn within days, so a pull request for it can be merged before anyone notices.

**Fix.** Each entry waits 7 days before proposing a new version. Security updates ignore the cooldown, so advisories are still raised at once:

```yaml
cooldown:
  default-days: 7
```

### 3. Hard-coded JWT secret in tests — false positive, suppressed (2 findings)

Rule: `javascript.jsonwebtoken.security.jwt-hardcode.hardcoded-jwt-secret` — `backend/tests/auth.test.ts` (2 places).

`jwt.sign(admin, "some-other-secret")` builds a token signed with the *wrong* secret to prove that `verifyAuthToken` and `requireAuth` reject it. The string is not a credential and never ships. Suppressed with an inline `// nosemgrep` comment that states the reason.

### 4. `<script>` with an unknown value in tests — false positive, suppressed (2 findings)

Rule: `javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag` — `backend/tests/digest-email.test.ts` (2 places).

The tests feed `<script>x</script>` into the digest email renderer and assert the output is escaped (`&lt;script&gt;`). The tag is the attack payload under test, not markup we emit. Suppressed with an inline `// nosemgrep` comment that states the reason.

## Scan notes

- 1 parser warning (`PartialParsing`), in `frontend/src/app/layout.tsx` line 81, where Semgrep cannot read a `&display=swap` string inside JSX. Semgrep skips only the affected line; the rest of the file is scanned. (The first scan reported 7 such warnings in 4 files.)
- Test files are scanned on purpose. Suppressions are visible and carry a reason, instead of being hidden by an ignore rule.

## Limits of this scan

- Community rules match known unsafe patterns. A clean result means *these rules found nothing*, not that the code is free of vulnerabilities. As a sanity check, a deliberately unsafe `eval(code)` and `exec("ls " + dir)` snippet was **not** flagged by these rulesets, so the gate catches known patterns but not every unsafe call.
- Dependencies are not covered (software composition analysis). Secrets in git history are covered separately by the gitleaks job in `ci.yml`.
- Authorization and business-logic flaws need review and tests. The ownership tests in `backend/tests/ownership.db.test.ts` cover part of that.

## Automation

`.github/workflows/security.yml` runs the same scan on every push to `main` and every pull request. It uses `--error`, so any new finding fails the check. Run it locally with:

```bash
pip install semgrep==1.185.0
npm run sast
```

Configuration lives in `.semgrepignore` (`dist/`, `.next/`, `node_modules/`, `coverage/`, and `docs/security/`).

## Reproduce

```bash
semgrep scan --metrics=off \
  --config p/security-audit --config p/owasp-top-ten --config p/javascript --config p/typescript \
  --config p/nodejs --config p/react --config p/expressjs --config p/jwt \
  --config p/command-injection --config p/insecure-transport --config p/secrets \
  --json -o docs/security/sast-results.json .
```

# Security Logging Architecture & Audit Policy

**OWASP ASVS Mappings:** V16.1.1 (Security Logging Policy), V16.3.1 (Authentication Logging), V16.3 (Access Control & Security Event Logging)

---

## 1. Objectives & Scope
This policy mandates the standard security logging architecture for the **TOR-Match** application in full compliance with **OWASP ASVS V16.1.1, V16.3.1, and V16.3**. 

All security-relevant actions—including authentication events, authorization rejections, session revocations, and administrative modifications—must produce structured, immutable audit log records.

---

## 2. Audited Security Events

The following events are systematically intercepted and recorded by [`backend/src/utils/security-logger.ts`](../../backend/src/utils/security-logger.ts):

| Event Identifier | Trigger Condition | Audited Attributes | ASVS Mapping |
| :--- | :--- | :--- | :--- |
| `AUTH_LOGIN_SUCCESS` | Successful user or admin login | Timestamp, Client IP, Method, Path, User ID, Email | V16.3.1 |
| `AUTH_LOGIN_FAILURE` | Invalid password, non-existent account, or unlinked Google sign-in | Timestamp, Client IP, Method, Path, Email, Failure Reason | V16.3.1 |
| `AUTH_REGISTRATION` | New user account created via email/password or Google OAuth | Timestamp, Client IP, User ID, Email | V16.1.1 |
| `AUTH_LOGOUT` | User signs out; session version incremented | Timestamp, Client IP, User ID, Email | V16.3.1 |
| `AUTH_SESSION_REVOKED` | Request presented with outdated `tokenVersion` or deactivated account | Timestamp, Client IP, User ID, Email, Reason | V16.3, V7.4.2 |
| `ACCESS_DENIED` | Missing token, expired session, or unauthenticated access to protected route | Timestamp, Client IP, Method, Path, Reason | V16.3 |
| `ROLE_ACCESS_DENIED` | Authenticated user lacks required role (e.g. non-admin accessing `/api/companies/admin/*`) | Timestamp, Client IP, User ID, Email, Required Roles, Actual Role | V16.3 |
| `COMPANY_STATUS_MODIFIED` | Administrator modifies company status (e.g. `active` -> `suspended`) | Timestamp, Client IP, Admin ID, Target Company ID, Old Status, New Status | V16.3 |
| `PASSWORD_CHANGED` | User successfully updates their password | Timestamp, Client IP, User ID, Email | V16.1.1 |

---

## 3. Log Record Schema & Structure

In production (`NODE_ENV === "production"`), security events are emitted as single-line JSON strings to `stdout`/`stderr` for automatic collection by log aggregators (e.g., Datadog, AWS CloudWatch, Grafana Loki).

```json
{
  "timestamp": "2026-11-17T23:45:00.000Z",
  "category": "SECURITY",
  "event": "AUTH_LOGIN_FAILURE",
  "ip": "203.0.113.195",
  "method": "POST",
  "path": "/api/auth/login",
  "email": "target@example.com",
  "reason": "Incorrect password"
}
```

In development, readable formatted output is printed:
```text
[security] 2026-11-17T23:45:00.000Z AUTH_LOGIN_FAILURE (user: target@example.com) from 203.0.113.195 - Incorrect password
```

---

## 4. Strict Redaction & Data Privacy Safeguards (ASVS V16.4.1)

Under no circumstances may sensitive authentication data be included in security logs:
- **PROHIBITED:** Plaintext passwords, previous passwords, new passwords.
- **PROHIBITED:** Plaintext JWT tokens, bearer tokens, or cookie values.
- **PROHIBITED:** Session encryption secrets or API private keys.
- **PROHIBITED:** Full credit card or payment data.

The logging utility enforces this by only accepting explicitly whitelisted non-sensitive metadata (`userId`, `email`, `reason`, `ip`, `method`, `path`).

---

## 5. Storage, Retention, and Monitoring

1. **Storage Isolation:** Application containers forward stdout streams directly to dedicated centralized log collectors. Logs are immutable once ingested.
2. **Retention Period:** Security audit logs must be retained for a minimum of **90 days** in hot storage, and archived for **1 year** in encrypted cold storage for compliance review.
3. **Alerting Thresholds:** Log monitoring systems must configure automated alerts for:
   - More than 5 `AUTH_LOGIN_FAILURE` events from a single IP within 5 minutes (potential brute force).
   - Any `ROLE_ACCESS_DENIED` burst (potential privilege escalation scanning).
   - Any `COMPANY_STATUS_MODIFIED` to `suspended` (administrative audit trail).

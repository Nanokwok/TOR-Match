# Data Classification Policy & Inventory (OWASP ASVS V14.1.1)

## 1. Overview & Purpose
This document defines the data classification framework for **TOR-Match** in compliance with **OWASP ASVS V14.1.1 (Level 1)**. The objective is to identify, classify, and apply appropriate security controls to all data ingested, stored, processed, and transmitted by the system.

---

## 2. Classification Levels

| Level | Classification | Definition | Examples in TOR-Match |
| :--- | :--- | :--- | :--- |
| **L4** | **Restricted / Sensitive PII** | High-impact data that would cause severe regulatory, financial, or privacy harm if breached. Subject to PDPA / GDPR regulations. | `passwordHash`, session secrets (`JWT_SECRET`), Google OAuth tokens/credentials, admin passwords. |
| **L3** | **Confidential / Commercial Sensitive** | Sensitive proprietary business and account data belonging to registered companies and users. | User email, full name, company tax ID (`taxId`), contact phone numbers, company financial/registered capital info, qualification self-checks. |
| **L2** | **Internal** | System operational data, internal identifiers, business logic configuration, and security telemetry. | `tokenVersion`, `lastActiveAt`, user IDs (`_id`), notification settings, audit logs, ingest run statistics. |
| **L1** | **Public** | Information intended for public distribution or scraped from public government e-GP sources. | Public TOR titles, descriptions, project numbers, government agency names, budget amounts, reference links. |

---

## 3. Data Inventory & Mapping to Application Models

### 3.1 User & Authentication (`User.model.ts`)
| Field | Classification | Storage Protection | Transmission Protection | Access Controls |
| :--- | :--- | :--- | :--- | :--- |
| `_id`, `createdAt`, `updatedAt` | L2 (Internal) | MongoDB (TLS at rest) | TLS 1.3 / HTTPS | Authenticated User |
| `email` | L3 (Confidential) | MongoDB (TLS at rest) | TLS 1.3 / HTTPS | Account Owner / Admin |
| `name` | L3 (Confidential) | MongoDB (TLS at rest) | TLS 1.3 / HTTPS | Account Owner / Admin |
| `role` | L2 (Internal) | MongoDB (TLS at rest) | TLS 1.3 / HTTPS | Account Owner / Admin |
| `passwordHash` | **L4 (Restricted)** | bcrypt salted hash (cost factor 10), never returned (`select: false`) | Transmitted only over HTTPS during auth | Backend auth process only |
| `googleId` | L3 (Confidential) | MongoDB (sparse index) | TLS 1.3 / HTTPS | Backend OAuth service |
| `tokenVersion` | L2 (Internal) | MongoDB numeric counter | Embedded in signed JWT | Auth Middleware |
| `companyId` | L2 (Internal) | MongoDB ObjectId reference | TLS 1.3 / HTTPS | Account Owner / Admin |

### 3.2 Company Profiles (`Company.model.ts`)
| Field | Classification | Storage Protection | Transmission Protection | Access Controls |
| :--- | :--- | :--- | :--- | :--- |
| `companyNameThai`, `companyNameEnglish` | L3 (Confidential) | MongoDB (TLS at rest) | TLS 1.3 / HTTPS | Company Members / Admin |
| `taxId` | **L3 (Confidential)** | MongoDB (unique index) | TLS 1.3 / HTTPS | Company Members / Admin |
| `contactEmail`, `contactPhone` | L3 (Confidential) | MongoDB | TLS 1.3 / HTTPS | Company Members / Admin |
| `registeredCapital`, `companySize` | L3 (Confidential) | MongoDB | TLS 1.3 / HTTPS | Company Members / Admin |
| `status` (`pending`, `active`, `suspended`) | L2 (Internal) | MongoDB | TLS 1.3 / HTTPS | Admin / Company Owner |
| `certificates` | L3 (Confidential) | MongoDB | TLS 1.3 / HTTPS | Company Members / Admin |

### 3.3 Government Procurement Data (`Tor.model.ts` & `TorDraft.model.ts`)
| Field | Classification | Storage Protection | Transmission Protection | Access Controls |
| :--- | :--- | :--- | :--- | :--- |
| `projectNo`, `title`, `agency` | L1 (Public) | MongoDB (indexed) | TLS 1.3 / HTTPS | Public / All users |
| `budget`, `currency` | L1 (Public) | MongoDB | TLS 1.3 / HTTPS | Public / All users |
| `sourceUrl`, `documents` | L1 (Public) | MongoDB | TLS 1.3 / HTTPS | Public / All users |
| `criteria` (Parsed requirements) | L1 (Public) | MongoDB | TLS 1.3 / HTTPS | Public / All users |

---

## 4. Protection & Handling Rules

1. **Restricted (L4) Controls:**
   - Plaintext passwords and JWT secret keys MUST NEVER be logged, cached in debug logs, or exposed to clients.
   - Passwords must be hashed using bcrypt (work factor >= 10) before persistence.
   - Secrets must be loaded exclusively via environment variables (`process.env`) and never checked into source control.

2. **Confidential (L3) Controls:**
   - Must be accessible only to authenticated users who own the respective entity or administrators with explicit role checks (`requireRole('admin')`).
   - Export and transmission must occur strictly over HTTPS with modern cipher suites and HSTS enabled.

3. **Data Retention & Disposal:**
   - Session cookies carry `HttpOnly`, `SameSite=Lax`, and `Secure` in production with a max age of 7 days and 30-minute idle session timeouts.
   - Account deletion removes or anonymizes user and company records from the database.

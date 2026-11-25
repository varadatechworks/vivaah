# Implementation status

Snapshot: 2026-11-25. Status reflects committed source, not production deployment.

| Area | State | Evidence / gap |
|---|---|---|
| Product BRD | Baseline | Five dimensions and Social Connect privacy requirements documented |
| Architecture | Baseline | Domain/security boundaries documented; full threat model and DPIA pending |
| Premium web | UI prototype committed | Responsive editorial UI; not yet wired to real APIs |
| Social Connect web | UI prototype committed | Illustrative overlap counts only; no real provider connection |
| Mobile | Expo UI starter committed | Five tabs; no auth/API integration or device QA |
| PostgreSQL client | Implemented in source | Pooled server client and transaction helper; database not provisioned or connected |
| OTP request | Implemented in source | Six-digit CSPRNG OTP, HMAC digest, five-minute expiry, resend invalidation, email-serialized issuance, destination/IP rate checks, Resend delivery adapter |
| OTP verification | Implemented in source | Constant-time digest comparison, attempt counter, atomic challenge consumption, hashed session creation |
| Sessions | Implemented in source | HttpOnly cookie, SHA-256 token digest, expiry/revocation validation, logout |
| Authentication hardening | Partial | Same-origin checks on cookie writes and no-store responses; CSRF strategy, abuse controls, device/session management and penetration testing remain |
| Profile API | Implemented in source | Authenticated own-profile read/write, field validation and minimum-age rule; lifecycle moderation and completion workflow pending |
| Generic consent API | Implemented in source | Allow-listed purposes, scope receipts, history and owner-only withdrawal |
| Social category consent | Implemented in source | Per-category grant/withdraw and active-only uniqueness; audit events and downstream deletion jobs pending |
| Social overlap API | Implemented in source | Requires mutual category consent, active candidate profile and no block either way; real provider ingestion and integration tests pending |
| Candidate discovery API | Implemented in source | Returns only active profiles with discovery consent and explicit discoverability; fields are visibility-gated; ranking engine not integrated |
| Match feedback API | Implemented in source | Authenticated viewed/shortlisted/interested/passed events with candidate eligibility and block checks |
| Matching engine | Domain helper + unit tests committed | Weighted consent-aware aggregation; no database discovery/ranking integration |
| Social overlap helper | Domain helper + unit tests committed | Mutual consent and de-duplication tests committed |
| Database schema | Migrations committed | Core, identity/session and consent lifecycle schemas; migrations not applied or PostgreSQL-tested |
| Liveness/readiness | Implemented in source | /api/health and DB/config-aware /api/ready; not exercised in deployment |
| CI workflow | Committed | Lint, typecheck, unit tests, PostgreSQL 16 migrations/regression test and production build configured; workflow result not yet observed |
| Social providers | Not implemented | Official provider app review, approved scopes, OAuth adapters and deletion lifecycle required |
| Horoscope / AI / values | Not implemented | Domain engines, user controls and privacy review required; Values must remain self-declared |
| Match ranking / messaging | Not implemented | Dimension-specific ranking integration, interest state machine, chat, abuse prevention and notifications required |
| Family Connect | Not implemented | Family permissions, member privacy and controlled invitation workflow required |
| Payments/subscriptions | Not implemented | Gateway integration, idempotency, ledger, refunds and reconciliation required |
| Admin/moderation/safety | Not implemented | RBAC, verification, reporting, blocking, appeals and audit console required |
| Automated tests | Partial foundation | Unit tests and SQL regression script committed; no executed CI, DB integration, API, E2E, accessibility or security tests yet |
| Build/device verification | Not verified | Dependencies not installed in this environment; Next build, Expo build and Android/iOS device QA not run |

## Immediate release blockers

1. Configure a real PostgreSQL database, apply migrations 0001–0003, and run the SQL regression script.
2. Configure Resend sender verification and strong secrets; run OTP request/verify/logout negative tests.
3. Execute CI and fix all lint, type, unit-test and build failures.
4. Add CSRF defense appropriate to the deployment topology, robust rate limiting, account recovery and session management.
5. Implement profile completion/moderation, dimension ranking and provider OAuth only after reviewing official scopes and terms.
6. Complete privacy impact review, retention/deletion workflows, security testing and operational monitoring.

Do not report production readiness or a completion percentage until CI, database, API, E2E, mobile and security evidence exists. A committed implementation is not the same as a verified running feature.

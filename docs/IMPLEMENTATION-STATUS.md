# Implementation status

Snapshot: 2026-11-25

| Area | State | Evidence / gap |
|---|---|---|
| Product BRD | Baseline | Five dimensions and Social Connect privacy requirements documented |
| Architecture | Baseline | Domain/security boundaries documented; full threat model pending |
| Premium web | UI prototype committed | Next.js responsive editorial design; no backend integration |
| Social Connect web | UI prototype committed | Selectable fictional overlap counts and item lists; no live provider connection |
| Mobile | Expo UI starter committed | Five tabs and Social Connect sample; no API/auth/device QA |
| Health endpoint | Prototype | GET /api/health returns service status; not an infrastructure readiness probe |
| Match aggregation | Domain helper | Consent-aware weighted aggregation; unit assertions run locally; API integration pending |
| Social overlap | Domain helper | Requires mutual category consent; local assertions run; provider adapters pending |
| Core relational schema | Baseline migration committed | User/profile/consent/social entities and indexes; database migration not yet applied |
| Identity/session schema | Migration committed | OTP challenge, hashed opaque session, security-event tables and indexes; runtime auth not implemented |
| Social consent lifecycle | Migration committed | Active-only unique index permits withdrawal and later re-grant while retaining history; SQL regression script added but not executed against PostgreSQL |
| Identity security design | Documented | OTP/session/CSRF/rate-limit/consent controls and sensitive-inference boundaries documented |
| Auth/consent APIs | Not implemented | Provider delivery, transactional verification, session middleware and authenticated routes required |
| Profile/discovery backend | Not implemented | API, validation and authorization required |
| Social providers | Not implemented | Official provider app review, scopes and adapters required |
| Horoscope / AI / values | Not implemented | Domain engines and privacy review required; Values must remain self-declared |
| Payments/admin/safety | Not implemented | Ledger, moderation, RBAC and audit required |
| Automated tests | Partial foundation | SQL regression script committed; DB execution, unit/integration/e2e/accessibility/negative tests pending |
| Build/device verification | Not verified | Dependency install, Next build, Expo device QA and deployment checks not run |

## Evidence and release rule

Do not report production readiness or a completion percentage until migrations have been applied in a disposable test database, runtime APIs are integrated, and automated build/test/security evidence is available. A committed migration or test script is not equivalent to a successfully executed test.

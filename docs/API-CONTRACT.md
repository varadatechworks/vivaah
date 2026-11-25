# API contract and implementation status

All member endpoints require an authenticated opaque session cookie unless explicitly public. Authorization is enforced server-side; client state is never proof of permission. JSON responses are no-store.

## Identity

| Method | Endpoint | State |
|---|---|---|
| POST | `/api/v1/auth/otp/request` | Implemented: email OTP, expiry, resend invalidation, destination/IP rate limits, Resend adapter |
| POST | `/api/v1/auth/otp/verify` | Implemented: atomic consume, attempt limit, active account and hashed session creation |
| GET | `/api/v1/auth/me` | Implemented: validates non-revoked, unexpired session |
| POST | `/api/v1/auth/logout` | Implemented: revokes current session and clears cookie |

OTP requests accept `{ "email": "member@example.com" }`; verification accepts `{ "email": "member@example.com", "code": "123456" }`. OTPs are never returned in API responses. Email delivery requires `RESEND_API_KEY` and `AUTH_EMAIL_FROM`; OTP hashing requires a random `OTP_PEPPER` of at least 32 characters. No fixed production OTP exists.

## Profile and consent

| Method | Endpoint | State |
|---|---|---|
| GET | `/api/v1/profile` | Implemented: own profile projection |
| POST | `/api/v1/profile` | Implemented: validated create/update; 18+ date-of-birth rule |
| GET | `/api/v1/profile/me` | Implemented alias |
| GET | `/api/v1/consents` | Implemented: current and historical receipts |
| POST | `/api/v1/consents` | Implemented: purpose/scope grant with policy version |
| POST | `/api/v1/consents/:id/withdraw` | Implemented: owner-only withdrawal |
| GET | `/api/v1/social/share-consent` | Implemented: active category permissions |
| PUT | `/api/v1/social/share-consent` | Implemented: grant/withdraw category-level sharing |

Cookie-authenticated state changes require a matching same-origin Origin header. Consent purposes are allow-listed. Social sharing categories are allow-listed and separate from provider connection permission.

## Social Connect

| Method | Endpoint | State |
|---|---|---|
| GET | `/api/v1/matches/:memberId/social-overlap?category=pages` | Implemented: checks block state, active candidate profile and mutual category consent before returning a bounded overlap projection |
| GET | `/api/v1/social/connections` | Planned |
| POST | `/api/v1/social/connections/:provider/start` | Planned; requires official provider OAuth review and PKCE/state |
| DELETE | `/api/v1/social/connections/:provider` | Planned; disconnect/revocation and imported-data deletion |

## Member safety

| Method | Endpoint | State |
|---|---|---|
| POST | `/api/v1/members/:memberId/block` | Implemented: owner-scoped, idempotent block |
| DELETE | `/api/v1/members/:memberId/block` | Implemented: unblock own block record |
| POST | `/api/v1/members/:memberId/report` | Implemented: category-validated report submission with account-level daily cap |

Reports are persisted in a moderation queue. Admin review, member notification, appeals and case-management workflows are not yet implemented.

## Match discovery

- GET `/api/v1/matches` — implemented consent-gated candidate discovery; only active, discoverable profiles with active discovery consent are returned, with visibility-aware fields. Match scores remain null until the dimension engines are integrated.
- GET `/api/v1/matches/:memberId` — implemented visibility-gated detail after active-profile, discovery-consent and bidirectional block checks.
- POST `/api/v1/matches/:memberId/feedback` — implemented viewed, shortlisted, interested and passed events, subject to candidate eligibility and block checks.

## Contract and privacy rules

- Missing optional data is unavailable, not a zero score.
- Do not return private follower/group lists; only permitted mutual-overlap projections.
- Never infer political/religious ideology or other sensitive traits from social media, photos, clothing or behavioral proxies.
- Ideology & Values is optional, self-declared and private by default.
- Provider connection, category sharing and mutual-overlap visibility are three distinct permissions.
- Rate limit authentication and discovery; use idempotency for state-changing payment and interest operations.
- Consent withdrawal blocks subsequent processing; production must also implement deletion/recalculation jobs for previously derived data.
- The implemented APIs are a foundation, not a production security certification. Database migration execution, integration tests, provider verification and operational review remain release gates.

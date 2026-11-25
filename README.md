# Vivaah AI

Premium, privacy-first matrimonial platform. Product requirements and architecture are in `docs/`. The repository now contains an early server-side foundation for email OTP authentication, opaque sessions, member profile persistence and consent controls. The web and Expo mobile clients still contain prototype UI and illustrative data; they are not yet fully connected to these APIs.

## Local development

1. Install Node.js 22 and PostgreSQL 14+.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env.local` and configure `DATABASE_URL`, `OTP_PEPPER`, `RESEND_API_KEY` and `AUTH_EMAIL_FROM`.
4. Apply migrations 0001–0003 in order using the instructions in `db/README.md`.
5. Start the web app: `npm run dev`.

Useful checks:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `GET /api/health` is a liveness check; `GET /api/ready` checks database and authentication-delivery configuration.

The mobile starter currently runs separately: `cd apps/mobile && npm install && npm start`. Mobile authentication/API integration and device QA are pending.

## Authentication API

- `POST /api/v1/auth/otp/request` with `{ "email": "member@example.com" }`
- `POST /api/v1/auth/otp/verify` with `{ "email": "member@example.com", "code": "123456" }`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

The OTP is emailed through Resend and is never returned by the API. Production must use a verified sender domain and a randomly generated `OTP_PEPPER` of at least 32 characters. There is no fixed production OTP or authentication bypass.

## Consent and profile APIs

- `GET|POST /api/v1/consents`
- `POST /api/v1/consents/:id/withdraw`
- `GET|PUT /api/v1/social/share-consent`
- `GET|POST /api/v1/profile`
- `GET /api/v1/profile/me`
- `GET /api/v1/matches` (only active, discoverable profiles with active discovery consent)
- `GET /api/v1/matches/:memberId` (visibility-gated candidate detail)
- `POST /api/v1/matches/:memberId/feedback`
- `GET /api/v1/matches/:memberId/social-overlap?category=pages`
- `POST|DELETE /api/v1/members/:memberId/block`
- `POST /api/v1/members/:memberId/report`

Cookie-authenticated writes require a same-origin Origin header. Responses are no-store. Profile creation enforces an 18+ date-of-birth check. Social overlap requires both members to consent for the exact category, active candidate profile eligibility, and no block in either direction.

## Product principles

- Five independent matching dimensions: Preference, Horoscope, Social Connect, AI Compatibility and self-declared Ideology & Values.
- Social Connect uses only mutually consented, officially accessible data or manually curated interests. No scraping or hidden sensitive inference.
- Provider connection and category-sharing permission are separate.
- Ideology & Values is optional, self-declared and private by default. Do not infer political, religious, caste, health or other sensitive traits from social activity, photos or proxies.
- No production readiness claim until security, privacy, tests and operational gates pass.

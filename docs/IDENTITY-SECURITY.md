# Identity, session and consent security design

Status: implementation foundation / database migration committed. Runtime authentication and provider delivery are not yet implemented.

## Identity and OTP lifecycle

1. Normalize email addresses (trim and lowercase) and phone numbers (E.164) before lookup or persistence.
2. Create a short-lived challenge for a single purpose: `sign_in`, `sign_up`, `verify_contact` or `step_up`.
3. Generate OTPs with a cryptographically secure random generator. Persist only a keyed or salted one-way digest; compare in constant time. Never log or return the OTP from production APIs.
4. Apply per-destination, per-IP and global throttles before sending. Resend invalidates prior active challenges for the same destination and purpose.
5. Enforce expiry and attempt limits in the database transaction. A successful challenge is consumed exactly once.
6. Do not reveal whether an email address or phone number already has an account in public responses.
7. Production delivery must use a configured email/SMS provider. A development-only fixed OTP, if added, must be gated by an explicit non-production environment check and must fail closed in production.

## Session lifecycle

- Issue a high-entropy opaque bearer token; store only its SHA-256 digest in `auth_session.token_hash`.
- Set the browser cookie as HttpOnly, Secure in production, SameSite=Lax (or stricter where compatible), Path=/, with a bounded Max-Age.
- Rotate the session after authentication and step-up verification. Revoke on logout, account suspension, password/identity compromise, and account deletion.
- Validate expiry and revocation on every authenticated request. Never trust a user ID supplied by the client.
- Apply CSRF protection to cookie-authenticated state-changing requests; validate Origin and use a CSRF token strategy.
- Avoid long-lived client-side storage of bearer credentials. Mobile clients should use platform secure storage.

## Consent ledger

- Consent is purpose- and scope-specific and records the policy version, actor, source and timestamp.
- Withdrawal is represented by setting `revoked_at` on the active grant. Historical grants remain available for audit.
- The partial unique index permits one active grant per user/category/purpose while allowing a new grant after withdrawal.
- A consent withdrawal must immediately block new processing and enqueue deletion/recalculation of derived data where required.
- A member can inspect current and historical consent receipts. Consent to connect a provider is separate from consent to share a category for matching.

## Social Connect boundaries

- Provider connection, category sharing, and mutual-overlap visibility are three distinct permissions.
- Only return category overlap when both members have active consent for the exact category and purpose.
- Never expose raw follower/group lists or provider access tokens. Return only the minimum permitted overlap projection.
- Disconnecting a provider revokes or expires credentials where supported and schedules deletion of imported data.
- Social activity, follows, photos, clothing, names and group membership must not be used to infer political, religious, caste, health, sexual-orientation or other sensitive traits. Ideology & Values is a separate, optional, self-declared questionnaire with explicit controls and private-by-default answers.

## Operational controls still required

- Provider-specific OTP adapters, secret management and delivery observability.
- Transactional OTP consume/attempt updates and atomic session creation.
- API authorization middleware, CSRF protection, rate limiting and abuse detection.
- Retention/deletion jobs, audit access controls, incident response and security testing.
- Legal review of privacy notice, consent wording, retention periods and applicable Indian data-protection requirements.

## Migration

Apply `db/migrations/0002_identity_consent_hardening.sql` after `0001_core.sql`. The case-insensitive email index will intentionally fail if existing rows contain case-insensitive duplicates; resolve those records before deployment rather than silently merging accounts.

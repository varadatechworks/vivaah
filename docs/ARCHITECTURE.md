# Vivaah AI — Architecture
## Proposed topology
- `apps/web`: Next.js member experience and operations console
- `apps/mobile`: Expo / React Native client
- `services/api`: TypeScript API, identity, policy and domain services
- `services/matchmaking`: deterministic eligibility and explainable ranking
- PostgreSQL source of truth; object storage/CDN for media; queue/cache only when justified; structured logs, metrics and traces.

## Domain boundaries
Identity & Access; Consent & Privacy; Profiles & Media; Preferences; Discovery; Matchmaking; Horoscope Adapter; Social Connect & Provider Adapters; Values Questionnaire; AI Compatibility; Interests; Messaging; Family Delegation; Verification; Trust & Safety; Billing; Notifications; Support; Admin & Audit.

## Security boundaries
All authorization server-side. Separate public profile projections from private records. Family access uses scoped grants with expiry/revocation. Private media uses authorized signed URLs. Admin access is least-privilege and audited. AI receives minimum necessary data. Payment webhooks are signed and idempotent. Secrets never enter source control.

## Matching pipeline
Candidate retrieval → eligibility and mutual constraints → independent dimension engines → configurable aggregation → diversity/frequency controls → explanation → feedback. Blocked, hidden, suspended or non-consenting profiles are excluded before ranking. Missing dimensions are omitted, not scored zero.

## Social Connect
Provider adapters expose capability discovery and normalized permission-scoped data. Store encrypted token references, scopes, expiry and revocation state. Category consent is recorded separately for pages, communities, interests, creators and public content themes. Compute overlap only when both members consent to that category. Persist minimal identifiers, labels, provenance and fetched-at/expiry. API capability states: supported, unsupported, permission_required, stale, manual_only. No scraper, private messages or hidden membership access. Sensitive ideology is never inferred from social graph/content.

## Initial entities
User, Profile, ProfileVisibility, ConsentRecord, PartnerPreference, MatchCandidate, MatchDimensionResult, HoroscopeProfile, SocialConnection, SocialShareConsent, SocialEntity, SocialOverlap, ValuesResponse, Interest, Shortlist, InterestRequest, Conversation, Message, FamilyGrant, VerificationCase, SafetyReport, Subscription, Payment, Refund, AuditEvent.

## Deployment
Separate dev/staging/prod, managed secrets, migrations, backup retention, restore drills, health checks and staged rollouts. External integrations behind adapters and feature flags.

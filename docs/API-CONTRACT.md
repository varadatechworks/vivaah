# Initial API contract (implementation sequence)

All endpoints require authenticated sessions unless explicitly public. Authorization is enforced server-side; client state is never proof of permission.

## Identity and consent
- POST /api/v1/consents — grant a purpose and exact scope; returns a consent receipt.
- GET /api/v1/consents — list current and historical consent receipts for the signed-in member.
- POST /api/v1/consents/:id/withdraw — append a withdrawal event; revoke dependent processing where applicable.
- POST /api/v1/profile — create/update own profile; validate lifecycle transitions.
- GET /api/v1/profile/me — return the caller's profile projection.

## Social Connect
- GET /api/v1/social/connections — return provider status and granted scopes, never access tokens.
- POST /api/v1/social/connections/:provider/start — initiate provider OAuth using server-managed state/PKCE where supported.
- DELETE /api/v1/social/connections/:provider — disconnect, revoke provider grant where supported and schedule imported-data deletion.
- PUT /api/v1/social/share-consent — set category-level consent for pages, communities, interests, creators or content themes.
- GET /api/v1/matches/:memberId/social-overlap — return overlap only when both members have enabled the exact category. Return counts and itemized entries only under mutual visibility permission.

## Match discovery
- GET /api/v1/matches — eligible candidate list with dimension availability and explanation metadata.
- GET /api/v1/matches/:memberId — match detail after privacy, block and eligibility checks.
- POST /api/v1/matches/:memberId/feedback — shortlist, express interest or pass.

## Contract rules
- Missing optional data is unavailable, not a zero score.
- Do not return private follower/group lists; only permitted mutual-overlap projections.
- Never infer political/religious ideology or other sensitive traits from social media, photos or behavioral proxies.
- Every social overlap response includes provider/source provenance, data freshness and partial-coverage state.
- Rate limit discovery and OAuth start; use idempotency for state-changing payment and interest operations.

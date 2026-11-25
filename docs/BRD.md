# Vivaah AI — Business Requirements Document
Version 1.2 | India-first | Product baseline

## Vision
A premium, privacy-first matrimonial platform for adults. AI assists discovery and understanding; it does not decide whom someone should marry or predict marriage success.

## Principles
- Adult profile owners control visibility, consent, communication and closure.
- Family participation is delegated, scoped, expiring and revocable.
- Sensitive attributes are optional and self-declared. Never infer religion, caste, political opinion or other sensitive traits from images, clothing, names, follows, posts or proxies.
- Missing optional data is “Not available”, never a negative score.
- Every match explanation shows its evidence and limitations.
- Verification badges describe exactly what was checked.

## Roles
Member/profile owner; authorized family collaborator; matchmaking consultant; verification reviewer; moderator; support agent; finance operator; admin; super-admin; privacy/grievance officer. Enforce RBAC and resource-level authorization server-side.

## Product modules
1. Authentication, onboarding and consent ledger
2. Profile, photos and media privacy
3. Partner preferences and questionnaires
4. AI-assisted profile writing
5. Search, discovery and saved searches
6. Explainable matchmaking and feedback
7. Interests, shortlist and mutual interest
8. Consent-gated messaging and safety
9. Family Connect with delegated permissions
10. Identity/photo verification
11. Reporting, moderation, appeals and scam prevention
12. Membership, payment, refunds and reconciliation
13. Notifications and communication preferences
14. Assisted matchmaking CRM
15. CMS, support and grievance handling
16. Admin, RBAC, audit and feature flags
17. Analytics and data governance
18. Web and mobile apps, localization and accessibility

## Five matching dimensions
### 1. Preference Match
Age, location, education, profession, lifestyle and family preferences. Separate must-have constraints from flexible preferences. Explain mutual fit.

### 2. Horoscope Match
Opt-in birth date/time/place and configurable regional traditions, including Guna Milan/Ashtakoota where supported. Identify calculation source and tradition. Do not represent astrology as scientific prediction.

### 3. Social Connect
A dedicated comparison dashboard for Facebook, Instagram and LinkedIn where official platform capabilities and user permissions permit. Show counts and, when mutually authorized, itemized:
- common pages/accounts followed;
- common groups/communities (only where officially accessible);
- shared interests;
- common creators;
- similar public/authorized content themes;
- different interests.

Example: “10 common pages”, “4 common communities”, “6 shared interests”. A count opens a list only if both profile owners consent to that category. Show source, permission scope, last-sync time and partial-coverage warnings. Support manual interest/community curation when provider APIs do not expose the data. No scraping, private-message access, hidden-group access or bypassing platform controls. Do not equate following a page with holding its beliefs.

### 4. AI Compatibility
Compare voluntary questionnaire answers about communication, career, relocation, family expectations, lifestyle and future plans. Explain strengths and discussion topics; do not claim to predict relationship success.

### 5. Ideology & Values
A separate, optional, self-declared questionnaire for cultural practices, traditions, religious/spiritual observance, political outlook where lawful and appropriate, and family/social values. Sensitive answers are private by default and only compared/shared with explicit consent. Never infer these traits from social data or appearance.

## Social Connect privacy and provider requirements
- Per-platform OAuth is optional, scoped and revocable.
- Preview data categories and purposes before authorization.
- Build provider adapters with capability discovery; platform APIs vary and may not expose follows, groups or content.
- Store only minimum normalized data required; encrypt tokens; never log tokens.
- Overlap is computed only for categories both users allow sharing.
- Handle expired/revoked tokens, stale data, API outages and account deletion.
- Disconnect and account deletion trigger provider-token revocation where supported and deletion/expiry of imported data.
- Manual curation remains available when APIs do not expose requested data.
- Sensitive page/group names may be hidden behind explicit category reveal consent.

## Matching pipeline
1. Eligibility: adult account, active profile, block/privacy/safety rules, mutual hard constraints.
2. Dimension scoring: preference, opt-in horoscope, mutually consented social overlap, voluntary AI compatibility and self-declared values.
3. Aggregation: user-configurable weights; exclude unavailable dimensions from denominator; never penalize missing data or lack of social connection.
4. Explanation: reasons, evidence freshness, uncertainty and discussion prompts.
Start with deterministic transparent rules. Add ML only after consented representative data and offline fairness/quality evaluation.

## Privacy, safety and lifecycle
Profile states: draft, incomplete, active, paused/hidden, under review, suspended, deletion requested, deleted. Consent ledger stores policy version, purpose, actor, timestamp, scope and withdrawal. Provide field-level visibility, hide/incognito, block, report, export, correction, deletion, photo access requests and grievance channel. Reports preserve reporter confidentiality. Moderation includes triage SLAs, evidence, appeals and repeat-offender handling.

## Payments
Server-side payment verification, signed webhook validation, idempotency, payment/refund ledger, entitlement state machine, cancellation, partial refund, disputes, invoices, tax and reconciliation. Never grant entitlements from client-side success alone.

## Non-functional requirements
Security: OWASP-aligned controls, MFA for privileged roles, encryption, least privilege, rate limits, upload scanning and secrets management.
Privacy: purpose limitation, minimization, retention/deletion, access logging and vendor review.
Performance: responsive UI, image optimization, pagination, indexed search and async jobs.
Reliability: health checks, observability, backups and restore drills.
Accessibility: WCAG 2.2 AA target.
Localization: English, Kannada and Hindi architecture.

## Compliance
Qualified legal review for India's DPDP Act and applicable rules, IT/intermediary obligations where applicable, consumer/e-commerce, payments, tax, age assurance, advertising and other launch markets. Legal review is a launch gate; this BRD is not a compliance certification.

## Release gates
P0 architecture, threat model, consent, profile ownership and RBAC.
P1 identity, profile, privacy, discovery and preference matching.
P2 interests, messaging, Family Connect, safety and Social Connect manual/consent model.
P2.1 official social-provider integrations after API and privacy review.
P3 verification, moderation, payments and admin.
P4 AI assistant, native mobile and scale hardening.
UAT requires positive/negative tests, security/privacy review, payment verification, restore drill, runbooks and no unresolved critical/high defects.

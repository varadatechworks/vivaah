-- Identity/session foundation and consent-history correction.
-- Apply after 0001_core.sql. This migration is additive and preserves existing records.
BEGIN;

-- The original UNIQUE(user_id, category, purpose) prevented a member from
-- granting the same category again after withdrawal. Keep historical grants
-- and enforce uniqueness only for the currently active grant.
ALTER TABLE social_share_consent
  DROP CONSTRAINT IF EXISTS social_share_consent_user_id_category_purpose_key;

CREATE UNIQUE INDEX IF NOT EXISTS social_share_consent_one_active_idx
  ON social_share_consent(user_id, category, purpose)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS social_share_consent_history_idx
  ON social_share_consent(user_id, category, purpose, granted_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS consent_one_active_scope_idx
  ON consent_record(user_id, purpose, scope)
  WHERE revoked_at IS NULL;

-- OTP challenges store only a one-way code hash. Delivery is handled by a
-- provider adapter; raw OTPs must never be persisted or logged.
CREATE TABLE IF NOT EXISTS auth_otp_challenge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  destination text NOT NULL,
  code_hash bytea NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('sign_in', 'sign_up', 'verify_contact', 'step_up')),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts smallint NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  request_ip_hash bytea,
  request_user_agent_hash bytea,
  CHECK (attempts <= max_attempts),
  CHECK (expires_at > requested_at),
  CHECK (consumed_at IS NULL OR consumed_at >= requested_at),
  CHECK (invalidated_at IS NULL OR invalidated_at >= requested_at)
);
CREATE INDEX IF NOT EXISTS auth_otp_lookup_idx
  ON auth_otp_challenge(channel, destination, purpose, requested_at DESC);
CREATE INDEX IF NOT EXISTS auth_otp_expiry_idx
  ON auth_otp_challenge(expires_at)
  WHERE consumed_at IS NULL AND invalidated_at IS NULL;

-- Sessions use a random opaque bearer token held only by the client cookie;
-- the database stores its SHA-256 digest, never the raw token.
CREATE TABLE IF NOT EXISTS auth_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoke_reason text,
  ip_hash bytea,
  user_agent_hash bytea,
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);
CREATE INDEX IF NOT EXISTS auth_session_user_active_idx
  ON auth_session(user_id, expires_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS auth_session_expiry_idx
  ON auth_session(expires_at)
  WHERE revoked_at IS NULL;

-- Minimal security audit trail. metadata must not contain OTPs, tokens,
-- passwords, raw provider payloads, or unnecessary personal data.
CREATE TABLE IF NOT EXISTS auth_security_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  subject_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'otp_requested', 'otp_failed', 'otp_verified', 'session_created',
    'session_revoked', 'session_expired', 'contact_verified',
    'consent_granted', 'consent_withdrawn', 'account_locked'
  )),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid,
  ip_hash bytea,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS auth_security_event_subject_idx
  ON auth_security_event(subject_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS auth_security_event_type_idx
  ON auth_security_event(event_type, occurred_at DESC);

-- Case-insensitive email uniqueness prevents duplicate identities differing
-- only by letter case. Existing collisions must be resolved before migration.
CREATE UNIQUE INDEX IF NOT EXISTS app_user_email_lower_unique_idx
  ON app_user(lower(email));

COMMIT;

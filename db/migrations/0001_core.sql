-- Vivaah initial relational model. Apply through a reviewed migration runner.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  phone_e164 text UNIQUE,
  status text NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification','active','suspended','deletion_requested','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE member_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  date_of_birth date,
  city text,
  country_code char(2),
  profession text,
  education text,
  lifecycle_state text NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_state IN ('draft','incomplete','active','paused','under_review','suspended','deletion_requested','deleted')),
  visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_profile_discovery_idx ON member_profile(lifecycle_state, country_code, city);

-- Append-oriented consent ledger: withdraw by setting revoked_at; never overwrite history.
CREATE TABLE consent_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  policy_version text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  actor_user_id uuid REFERENCES app_user(id),
  source text NOT NULL,
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);
CREATE INDEX consent_user_purpose_idx ON consent_record(user_id, purpose, granted_at DESC);

CREATE TABLE partner_preference (
  user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  must_have jsonb NOT NULL DEFAULT '{}'::jsonb,
  flexible jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE social_connection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('facebook','instagram','linkedin')),
  provider_subject_hash text,
  encrypted_token_ref text, -- reference to a managed secret; never store raw tokens here
  granted_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','connected','expired','revoked','error')),
  connected_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE TABLE social_share_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('pages','communities','interests','creators','content_themes')),
  purpose text NOT NULL DEFAULT 'match_overlap',
  policy_version text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(user_id, category, purpose)
);

CREATE TABLE social_entity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider text CHECK (provider IN ('facebook','instagram','linkedin','manual')),
  category text NOT NULL CHECK (category IN ('pages','communities','interests','creators','content_themes')),
  external_id_hash text NOT NULL,
  display_label text NOT NULL,
  source text NOT NULL CHECK (source IN ('provider','member_curated')),
  fetched_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, external_id_hash)
);
CREATE INDEX social_entity_overlap_idx ON social_entity(category, external_id_hash);
CREATE INDEX social_entity_owner_idx ON social_entity(user_id, category);

CREATE TABLE member_block (
  blocker_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(blocker_user_id, blocked_user_id),
  CHECK(blocker_user_id <> blocked_user_id)
);

CREATE TABLE match_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  candidate_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('viewed','shortlisted','interested','passed','reported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(user_id <> candidate_user_id)
);
CREATE INDEX match_feedback_user_idx ON match_feedback(user_id, created_at DESC);

-- Contact verification and operational indexes.
BEGIN;

ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_authenticated_at timestamptz;

CREATE INDEX IF NOT EXISTS auth_otp_destination_recent_idx
  ON auth_otp_challenge(destination, requested_at DESC);
CREATE INDEX IF NOT EXISTS member_profile_active_discovery_idx
  ON member_profile(country_code, city, updated_at DESC)
  WHERE lifecycle_state = 'active';

COMMIT;

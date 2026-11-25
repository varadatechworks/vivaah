-- Run with psql after migrations 0001 and 0002:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/0002_identity_consent_hardening.sql
-- All test data is rolled back.
BEGIN;

DO $$
DECLARE
  test_user uuid;
  grant_count integer;
  active_count integer;
BEGIN
  INSERT INTO app_user(email, status)
  VALUES ('vivaah-migration-test-' || gen_random_uuid()::text || '@example.invalid', 'active')
  RETURNING id INTO test_user;

  INSERT INTO social_share_consent(user_id, category, purpose, policy_version)
  VALUES (test_user, 'pages', 'match_overlap', 'test-v1');

  UPDATE social_share_consent
     SET revoked_at = now()
   WHERE user_id = test_user
     AND category = 'pages'
     AND purpose = 'match_overlap'
     AND revoked_at IS NULL;

  -- Re-grant after withdrawal must create a new historical row.
  INSERT INTO social_share_consent(user_id, category, purpose, policy_version)
  VALUES (test_user, 'pages', 'match_overlap', 'test-v2');

  SELECT count(*), count(*) FILTER (WHERE revoked_at IS NULL)
    INTO grant_count, active_count
    FROM social_share_consent
   WHERE user_id = test_user
     AND category = 'pages'
     AND purpose = 'match_overlap';

  IF grant_count <> 2 OR active_count <> 1 THEN
    RAISE EXCEPTION 'Expected two historical grants and one active grant; got %, %',
      grant_count, active_count;
  END IF;

  -- A second simultaneous active grant must be rejected.
  BEGIN
    INSERT INTO social_share_consent(user_id, category, purpose, policy_version)
    VALUES (test_user, 'pages', 'match_overlap', 'test-v3');
    RAISE EXCEPTION 'Expected duplicate active consent to fail';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Generic consent must preserve history and allow one active grant per scope.
  INSERT INTO consent_record(user_id, purpose, scope, policy_version, source)
  VALUES (test_user, 'profile_discovery', '{"discoverable":true}'::jsonb, 'test-v1', 'test');
  UPDATE consent_record SET revoked_at = now()
   WHERE user_id = test_user AND purpose = 'profile_discovery' AND revoked_at IS NULL;
  INSERT INTO consent_record(user_id, purpose, scope, policy_version, source)
  VALUES (test_user, 'profile_discovery', '{"discoverable":true}'::jsonb, 'test-v2', 'test');

  IF (SELECT count(*) FROM consent_record
       WHERE user_id = test_user AND purpose = 'profile_discovery'
         AND scope = '{"discoverable":true}'::jsonb) <> 2 THEN
    RAISE EXCEPTION 'Expected two historical generic consent grants';
  END IF;

  -- Invalid OTP counters must be rejected by database constraints.
  BEGIN
    INSERT INTO auth_otp_challenge(
      channel, destination, code_hash, purpose, attempts, max_attempts, expires_at
    ) VALUES (
      'email', 'test@example.invalid', decode(repeat('00', 32), 'hex'),
      'sign_in', 11, 5, now() + interval '5 minutes'
    );
    RAISE EXCEPTION 'Expected invalid OTP counters to fail';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END $$;

ROLLBACK;

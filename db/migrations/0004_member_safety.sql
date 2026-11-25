-- Member safety primitives: reports and block indexes.
BEGIN;

CREATE TABLE IF NOT EXISTS member_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('fake_profile', 'harassment', 'fraud', 'safety_concern', 'other')),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  resolution_note text,
  CHECK (reporter_user_id <> reported_user_id),
  CHECK (reviewed_at IS NULL OR reviewed_at >= created_at)
);

CREATE INDEX IF NOT EXISTS member_report_queue_idx
  ON member_report(status, created_at ASC);
CREATE INDEX IF NOT EXISTS member_report_subject_idx
  ON member_report(reported_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS member_block_target_idx
  ON member_block(blocked_user_id, blocker_user_id);

COMMIT;

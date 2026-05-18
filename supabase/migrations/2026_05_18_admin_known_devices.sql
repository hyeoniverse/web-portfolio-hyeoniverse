-- ────────────────────────────────────────────────────────────
-- admin_known_devices — 새 기기 로그인 이메일 인증
-- ────────────────────────────────────────────────────────────
-- 로그인 시점에 user-agent fingerprint 조회.
-- 처음 보는 fingerprint 면 이메일로 approve 토큰 발송 → 클릭 후 trusted.
-- service role 만 접근. admin 1명이라 user_id 별 unique 만으로 충분.

CREATE TABLE IF NOT EXISTS admin_known_devices (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid NOT NULL,
  fingerprint                text NOT NULL,
  user_agent                 text NOT NULL DEFAULT '',
  ip_address                 text NOT NULL DEFAULT '',
  approved                   boolean NOT NULL DEFAULT false,
  approve_token              text,
  approve_token_expires_at   timestamptz,
  first_seen_at              timestamptz NOT NULL DEFAULT now(),
  last_seen_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS admin_known_devices_token_idx
  ON admin_known_devices (approve_token);

ALTER TABLE admin_known_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_known_devices_service_only"
  ON admin_known_devices FOR ALL
  USING (true)
  WITH CHECK (true);

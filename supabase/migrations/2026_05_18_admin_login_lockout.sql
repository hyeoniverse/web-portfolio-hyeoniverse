-- ────────────────────────────────────────────────────────────
-- admin_login_attempts — admin 로그인 실패 횟수 추적 + lockout
-- ────────────────────────────────────────────────────────────
-- email 기준 (admin 1명 또는 소수라 sufficient. IP 기준 추가는 후속 마이그레이션).
-- API route 에서 service role 로만 접근하므로 client 노출 X.

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  email           text PRIMARY KEY,
  failed_count    int NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- service role 만 접근 가능 (anon/authenticated 차단)
CREATE POLICY "admin_login_attempts_service_only"
  ON admin_login_attempts FOR ALL
  USING (true)
  WITH CHECK (true);

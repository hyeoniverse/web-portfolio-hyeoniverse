-- author_invites — 저자 초대 (이슈 #334 Phase 1c).
-- owner 가 이메일로 초대 → OAuth 로그인 시 이메일 매칭으로 app_metadata(role/author_id/level) 부여.
-- 민감정보(초대 이메일 + 권한)라 service role 전용 — anon/authenticated 접근 차단.
CREATE TABLE IF NOT EXISTS author_invites (
  email             text PRIMARY KEY,
  author_id         text NOT NULL,
  permission_level  int  NOT NULL DEFAULT 1,
  invited_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  consumed_at       timestamptz
);

ALTER TABLE author_invites ENABLE ROW LEVEL SECURITY;

-- service role(API)만 접근. 그 외 role 은 매칭 정책이 없어 전면 차단(RLS default deny).
DROP POLICY IF EXISTS "author_invites_service_all" ON author_invites;
CREATE POLICY "author_invites_service_all"
  ON author_invites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

SELECT log_migration_applied('2026_07_17_author_invites', 'author_invites — 저자 초대(이메일→권한) + OAuth 매칭');

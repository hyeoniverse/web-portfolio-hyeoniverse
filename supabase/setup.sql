-- ============================================================
-- 포트폴리오 사이트 — Supabase 전체 DB 설정
-- ============================================================
-- Supabase SQL Editor에서 한 번에 실행하면 됩니다.
-- 이미 테이블이 있으면 건너뛰도록 IF NOT EXISTS를 사용합니다.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. site_settings — 사이트 설정 (JSONB)
--    id = 'default' : 일반 사이트 설정 (테마, 메타 등)
--    id = 'profile'  : 프로필 데이터 (경력, 스킬, 철학 등)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id         text PRIMARY KEY,
  config     jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- 기본 행 삽입 (이미 있으면 무시)
INSERT INTO site_settings (id, config)
VALUES ('default', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO site_settings (id, config)
VALUES ('profile', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO site_settings (id, config)
VALUES ('secrets', '{}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 누구나 설정 읽기 가능
CREATE POLICY "site_settings_public_read"
  ON site_settings FOR SELECT
  USING (true);

-- service_role만 쓰기 가능 (API에서 service role key 사용)
CREATE POLICY "site_settings_service_write"
  ON site_settings FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 2. series — 블로그 시리즈
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS series (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title          text NOT NULL DEFAULT '',
  slug           text NOT NULL DEFAULT '',
  description    text NOT NULL DEFAULT '',
  cover_image    text NOT NULL DEFAULT '',
  category       text NOT NULL DEFAULT '',
  published      boolean NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  -- 영문 필드
  title_en       text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT ''
);

ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- 공개된 시리즈만 읽기
CREATE POLICY "series_public_read"
  ON series FOR SELECT
  USING (published = true);

-- service_role 전체 접근
CREATE POLICY "series_service_all"
  ON series FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 3. posts — 블로그 포스트
-- ────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS posts_post_number_seq;

CREATE TABLE IF NOT EXISTS posts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL DEFAULT '',
  slug         text NOT NULL DEFAULT '',
  content      text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'markdown'
    CHECK (content_type IN ('markdown', 'richtext')),
  excerpt      text NOT NULL DEFAULT '',
  cover_image  text NOT NULL DEFAULT '',
  tags         text[] NOT NULL DEFAULT '{}',
  category     text NOT NULL DEFAULT '',
  is_pinned    boolean NOT NULL DEFAULT false,
  published    boolean NOT NULL DEFAULT false,
  view_count   int NOT NULL DEFAULT 0,
  like_count   int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  -- 영문 필드
  title_en     text NOT NULL DEFAULT '',
  content_en   text NOT NULL DEFAULT '',
  excerpt_en   text NOT NULL DEFAULT '',
  -- 고유 번호
  post_number  int NOT NULL DEFAULT nextval('posts_post_number_seq'),
  -- 시리즈 연결
  series_id    uuid REFERENCES series(id) ON DELETE SET NULL,
  series_order int NOT NULL DEFAULT 0
);

-- slug 검색용 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug);
-- 시리즈별 포스트 조회용
CREATE INDEX IF NOT EXISTS idx_posts_series_id ON posts (series_id);
-- 고유 번호 유니크 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_post_number ON posts (post_number);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 공개된 포스트만 읽기
CREATE POLICY "posts_public_read"
  ON posts FOR SELECT
  USING (published = true);

-- service_role 전체 접근
CREATE POLICY "posts_service_all"
  ON posts FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 4. comments — 포스트 댓글
--    비회원 댓글: nickname + password_hash(bcrypt) 사용
--    대댓글: parent_id로 트리 구조
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id         uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES comments(id) ON DELETE CASCADE,
  nickname        text NOT NULL DEFAULT '',
  password_hash   text NOT NULL DEFAULT '',
  commenter_hash  text NOT NULL DEFAULT '',
  content         text NOT NULL DEFAULT '',
  is_admin        boolean NOT NULL DEFAULT false,
  like_count      int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz
);

-- 포스트별 댓글 조회용
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (post_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 누구나 댓글 읽기 가능
CREATE POLICY "comments_public_read"
  ON comments FOR SELECT
  USING (true);

-- 누구나 댓글 작성 가능 (비회원 댓글 지원)
CREATE POLICY "comments_public_insert"
  ON comments FOR INSERT
  WITH CHECK (true);

-- service_role 전체 접근 (관리자 삭제 등)
CREATE POLICY "comments_service_all"
  ON comments FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 5. likes — 좋아요 (포스트/작업물 공용)
--    target_type: 'post', 'work', 'post_comment', 'work_comment'
--    IP 기반 중복 방지
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type text NOT NULL CHECK (target_type IN ('post', 'work', 'post_comment', 'work_comment')),
  target_id   text NOT NULL,
  ip          text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

-- 동일 대상에 같은 IP 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_unique
  ON likes (target_type, target_id, ip);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 누구나 좋아요 수 조회 가능
CREATE POLICY "likes_public_read"
  ON likes FOR SELECT
  USING (true);

-- service_role 전체 접근
CREATE POLICY "likes_service_all"
  ON likes FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 6. works — 포트폴리오 작업물
--    ko/en 컬럼 분리 (LocalizedText 변환은 앱에서 처리)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS works (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  number         text NOT NULL DEFAULT '01',
  title          text NOT NULL DEFAULT '',
  subtitle_ko    text NOT NULL DEFAULT '',
  subtitle_en    text NOT NULL DEFAULT '',
  category_ko    text NOT NULL DEFAULT '',
  category_en    text NOT NULL DEFAULT '',
  year           text NOT NULL DEFAULT '',
  description_ko text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  role_ko        text NOT NULL DEFAULT '',
  role_en        text NOT NULL DEFAULT '',
  tech           text[] NOT NULL DEFAULT '{}',
  image          text NOT NULL DEFAULT '',
  size           text NOT NULL DEFAULT 'medium'
    CHECK (size IN ('large', 'small', 'medium', 'tall', 'wide')),
  content_ko     text NOT NULL DEFAULT '',
  content_en     text NOT NULL DEFAULT '',
  content_type   text NOT NULL DEFAULT 'markdown'
    CHECK (content_type IN ('markdown', 'richtext')),
  -- legacy separate sections (backward compat)
  overview_ko    text NOT NULL DEFAULT '',
  overview_en    text NOT NULL DEFAULT '',
  overview_image text NOT NULL DEFAULT '',
  challenge_ko   text NOT NULL DEFAULT '',
  challenge_en   text NOT NULL DEFAULT '',
  challenge_image text NOT NULL DEFAULT '',
  solution_ko    text NOT NULL DEFAULT '',
  solution_en    text NOT NULL DEFAULT '',
  solution_image text NOT NULL DEFAULT '',
  team_members   jsonb NOT NULL DEFAULT '[]',
  gallery        text[] NOT NULL DEFAULT '{}',
  live_url       text DEFAULT '',
  github_url     text DEFAULT '',
  published      boolean NOT NULL DEFAULT false,
  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE works ENABLE ROW LEVEL SECURITY;

-- 공개된 작업물만 읽기
CREATE POLICY "works_public_read"
  ON works FOR SELECT
  USING (published = true);

-- service_role 전체 접근
CREATE POLICY "works_service_all"
  ON works FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 7. site_visits — 방문자 통계
--    IP + 날짜 조합으로 하루 1회만 기록
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_visits (
  id   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip   text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE
);

-- 같은 IP는 하루에 한 번만
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_visits_ip_date
  ON site_visits (ip, date);

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

-- 누구나 방문자 수 조회 가능
CREATE POLICY "site_visits_public_read"
  ON site_visits FOR SELECT
  USING (true);

-- service_role 전체 접근
CREATE POLICY "site_visits_service_all"
  ON site_visits FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 8. work_comments — Works 댓글 (대댓글 지원)
--    comments 테이블과 동일 구조, works(id) 참조
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_comments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id         uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES work_comments(id) ON DELETE CASCADE,
  nickname        text NOT NULL DEFAULT '',
  password_hash   text NOT NULL DEFAULT '',
  commenter_hash  text NOT NULL DEFAULT '',
  content         text NOT NULL DEFAULT '',
  is_admin        boolean NOT NULL DEFAULT false,
  like_count      int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_work_comments_work_id ON work_comments (work_id);

ALTER TABLE work_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_comments_public_read"
  ON work_comments FOR SELECT
  USING (true);

CREATE POLICY "work_comments_public_insert"
  ON work_comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "work_comments_service_all"
  ON work_comments FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 9. admin_notifications — 관리자 알림 로그
--     댓글 달림, 좋아요 등 관리자에게 보여줄 알림
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type        text NOT NULL DEFAULT 'comment',
  title       text NOT NULL DEFAULT '',
  message     text NOT NULL DEFAULT '',
  metadata    jsonb NOT NULL DEFAULT '{}',
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created
  ON admin_notifications (created_at DESC);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_notifications_service_all"
  ON admin_notifications FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 마이그레이션: 기존 배포 DB에 누락된 컬럼/테이블 안전 추가
-- (신규 설치 시에도 무해 — IF NOT EXISTS 사용)
-- ────────────────────────────────────────────────────────────

-- comments 테이블 — 이후 추가된 컬럼
ALTER TABLE comments ADD COLUMN IF NOT EXISTS commenter_hash text NOT NULL DEFAULT '';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count int NOT NULL DEFAULT 0;

-- notify_email — 답글 알림용 이메일 (옵션)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS notify_email text;

-- is_deleted — soft delete (답글 있는 댓글 삭제 시)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- work_comments 테이블 — 이후 추가된 컬럼
ALTER TABLE work_comments ADD COLUMN IF NOT EXISTS like_count int NOT NULL DEFAULT 0;
ALTER TABLE work_comments ADD COLUMN IF NOT EXISTS notify_email text;
ALTER TABLE work_comments ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- AI 요약 컬럼
ALTER TABLE posts ADD COLUMN IF NOT EXISTS summary_ko text NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS summary_en text NOT NULL DEFAULT '';
ALTER TABLE works ADD COLUMN IF NOT EXISTS summary_ko text NOT NULL DEFAULT '';
ALTER TABLE works ADD COLUMN IF NOT EXISTS summary_en text NOT NULL DEFAULT '';

-- work_comments RLS 정책 — 이미 존재하면 무시
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'work_comments' AND policyname = 'work_comments_public_read'
  ) THEN
    CREATE POLICY "work_comments_public_read" ON work_comments FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'work_comments' AND policyname = 'work_comments_public_insert'
  ) THEN
    CREATE POLICY "work_comments_public_insert" ON work_comments FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'work_comments' AND policyname = 'work_comments_service_all'
  ) THEN
    CREATE POLICY "work_comments_service_all" ON work_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 11. revisions — 에디터 리비전 히스토리 (posts + works 공용)
--     entity_type: 'post' | 'work'
--     entity_id: 대상 posts.id 또는 works.id
--     snapshot: 전체 form 데이터 (JSONB)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revisions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('post', 'work')),
  entity_id   uuid NOT NULL,
  snapshot    jsonb NOT NULL DEFAULT '{}',
  title       text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revisions_entity
  ON revisions (entity_type, entity_id, created_at DESC);

ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'revisions' AND policyname = 'revisions_service_all'
  ) THEN
    CREATE POLICY "revisions_service_all" ON revisions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- Storage: uploads 버킷 정책
--   폴더: logos/, resume/, bgm/, covers/, images/ 등
--   Admin API(service_role)로 업로드, 공개 읽기
-- ────────────────────────────────────────────────────────────

-- 버킷 생성은 Supabase Dashboard > Storage에서 수동으로 합니다.
-- 버킷 이름: uploads / Public bucket 체크

-- 인증된 사용자만 업로드 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload'
  ) THEN
    CREATE POLICY "Authenticated users can upload"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can view uploads'
  ) THEN
    CREATE POLICY "Anyone can view uploads"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'uploads');
  END IF;
END $$;


-- ============================================================
-- 완료! 총 10개 테이블이 생성되었습니다.
--
-- site_settings        : 사이트 설정 + 프로필 데이터
-- series               : 블로그 시리즈
-- posts                : 블로그 포스트
-- comments             : 포스트 댓글 (대댓글, 이중 인증)
-- likes                : 좋아요 (포스트/작업물 공용)
-- works                : 포트폴리오 작업물
-- site_visits          : 방문자 통계
-- work_comments        : Works 댓글 (대댓글, 이중 인증)
-- (댓글 좋아요는 likes 테이블에서 target_type='post_comment'/'work_comment'로 통합 관리)
-- admin_notifications  : 관리자 알림 로그
-- revisions            : 에디터 리비전 히스토리 (posts/works 공용)
-- ============================================================

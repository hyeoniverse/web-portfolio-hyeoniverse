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
  -- 시리즈 연결
  series_id    uuid REFERENCES series(id) ON DELETE SET NULL,
  series_order int NOT NULL DEFAULT 0
);

-- slug 검색용 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug);
-- 시리즈별 포스트 조회용
CREATE INDEX IF NOT EXISTS idx_posts_series_id ON posts (series_id);

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
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id       uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id     uuid REFERENCES comments(id) ON DELETE CASCADE,
  nickname      text NOT NULL DEFAULT '',
  password_hash text NOT NULL DEFAULT '',
  content       text NOT NULL DEFAULT '',
  is_admin      boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
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
--    target_type: 'post' 또는 'work'
--    IP 기반 중복 방지
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type text NOT NULL CHECK (target_type IN ('post', 'work')),
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


-- ============================================================
-- 완료! 총 7개 테이블이 생성되었습니다.
--
-- site_settings  : 사이트 설정 + 프로필 데이터
-- series         : 블로그 시리즈
-- posts          : 블로그 포스트
-- comments       : 댓글 (대댓글 지원)
-- likes          : 좋아요 (포스트/작업물 공용)
-- works          : 포트폴리오 작업물
-- site_visits    : 방문자 통계
-- ============================================================

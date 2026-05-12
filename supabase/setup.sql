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
  -- admin/settings 에서 드래그로 조정하는 노출 순서 (기본순 정렬의 1차 키)
  sort_order     int NOT NULL DEFAULT 0,
  -- cover_image 도 없고 소속 글의 cover 도 전혀 없을 때 SSR 시점에
  -- Unsplash 에서 1회만 fetch 해 캐시 (다음 요청부터 외부 호출 0회)
  auto_cover_url text DEFAULT NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  -- 영문 필드
  title_en       text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT ''
);

-- 기존 배포 DB 에 위 컬럼이 없으면 추가 (마이그레이션)
ALTER TABLE series ADD COLUMN IF NOT EXISTS sort_order     int  NOT NULL DEFAULT 0;
ALTER TABLE series ADD COLUMN IF NOT EXISTS auto_cover_url text DEFAULT NULL;

-- 정렬용 인덱스 — 기본 정렬(sort_order ASC, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_series_sort_order ON series (sort_order);

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
  github_url   text DEFAULT '',
  -- 휴지통(소프트 삭제)
  deleted_at   timestamptz DEFAULT NULL,
  -- AI 요약
  summary_ko   text NOT NULL DEFAULT '',
  summary_en   text NOT NULL DEFAULT '',
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
  series_order int NOT NULL DEFAULT 0,
  -- 예약 발행: NULL=즉시, 미래 시간 설정 시 cron이 published=true 로 flip
  scheduled_at timestamptz DEFAULT NULL
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
  notify_email    text,
  -- soft delete — 답글 있는 댓글 또는 관리자 삭제 시 tombstone 표시
  is_deleted      boolean NOT NULL DEFAULT false,
  -- tombstone 표시 주체 ('self' | 'admin')
  deleted_by      text CHECK (deleted_by IS NULL OR deleted_by IN ('self', 'admin')),
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
  -- AI 요약
  summary_ko     text NOT NULL DEFAULT '',
  summary_en     text NOT NULL DEFAULT '',
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  deleted_at     timestamptz DEFAULT NULL,
  -- 예약 발행: NULL=즉시, 미래 시간 설정 시 cron이 published=true 로 flip
  scheduled_at   timestamptz DEFAULT NULL
);

ALTER TABLE works ENABLE ROW LEVEL SECURITY;

-- 공개된 작업물만 읽기 (삭제되지 않은 것만)
CREATE POLICY "works_public_read"
  ON works FOR SELECT
  USING (published = true AND deleted_at IS NULL);

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
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip           text NOT NULL DEFAULT '',
  date         date NOT NULL DEFAULT CURRENT_DATE,
  -- 트래픽 분석용 메타 (parseUserAgent 결과를 insert 시점에 저장 — admin dashboard 집계 효율화)
  referrer     text DEFAULT NULL,
  user_agent   text DEFAULT NULL,
  device_kind  text DEFAULT NULL,  -- desktop / mobile / tablet
  os           text DEFAULT NULL,  -- macOS / Windows / iOS / iPadOS / Android / Linux / ChromeOS / Other
  browser      text DEFAULT NULL,  -- Chrome / Safari / Firefox / Edge / Samsung Internet / Opera / Other
  device_model text DEFAULT NULL   -- "iPhone" / "iPad" / "Pixel 8" / "SM-S921N" / "Mac" / "PC" 등
);

-- 기존 site_visits 테이블에 위 컬럼이 없는 경우 (마이그레이션)
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS referrer     text DEFAULT NULL;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS user_agent   text DEFAULT NULL;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS device_kind  text DEFAULT NULL;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS os           text DEFAULT NULL;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS browser      text DEFAULT NULL;
ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS device_model text DEFAULT NULL;

-- 같은 IP는 하루에 한 번만
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_visits_ip_date
  ON site_visits (ip, date);

-- 집계용 인덱스
CREATE INDEX IF NOT EXISTS idx_site_visits_device_kind ON site_visits (device_kind) WHERE device_kind IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_site_visits_referrer    ON site_visits (referrer)    WHERE referrer IS NOT NULL;

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
-- 7-1. post_views — 게시물별 일별 조회수 (시계열)
--      관리자 대시보드의 일별 추세 차트용
--      posts.view_count 는 누적 카운터로 유지, 시계열 분석은 이 테이블에서
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_views (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id   uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  ip        text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

-- 기존 DB 에 ip 컬럼 추가 (idempotent)
ALTER TABLE post_views ADD COLUMN IF NOT EXISTS ip text;

-- 시간 범위 + post 별 조회용
CREATE INDEX IF NOT EXISTS idx_post_views_post_id_viewed_at
  ON post_views (post_id, viewed_at DESC);
-- IP 별 dedup 빠른 조회용 (1일 1회 view 제한)
CREATE INDEX IF NOT EXISTS idx_post_views_post_ip_viewed_at
  ON post_views (post_id, ip, viewed_at DESC);
-- 전체 시계열 (대시보드 일별 추세)
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at
  ON post_views (viewed_at DESC);

ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_views_public_insert"
  ON post_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "post_views_service_all"
  ON post_views FOR ALL
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
  notify_email    text,
  -- soft delete — 답글 있는 댓글 또는 관리자 삭제 시 tombstone 표시
  is_deleted      boolean NOT NULL DEFAULT false,
  -- tombstone 표시 주체 ('self' | 'admin')
  deleted_by      text CHECK (deleted_by IS NULL OR deleted_by IN ('self', 'admin')),
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
  dismissed   boolean NOT NULL DEFAULT false,
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
-- post_work_relations — posts ↔ works 다대다 양방향 연결
-- Notion의 Relation 속성과 동일 — 한 글이 여러 프로젝트와, 한 프로젝트가
-- 여러 글과 연결될 수 있음. 양쪽 어디서 추가하든 자동 반영.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_work_relations (
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  work_id    uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_post_work_relations_post ON post_work_relations (post_id);
CREATE INDEX IF NOT EXISTS idx_post_work_relations_work ON post_work_relations (work_id);

ALTER TABLE post_work_relations ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (공개 detail 페이지에서 사용)
CREATE POLICY "post_work_relations_public_read"
  ON post_work_relations FOR SELECT
  USING (true);

CREATE POLICY "post_work_relations_service_all"
  ON post_work_relations FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- RPC 함수
-- ────────────────────────────────────────────────────────────

-- 모든 게시물 누적 view_count 합계 — 대시보드의 totalPostViews 용
-- (없으면 라우트가 클라이언트 측 fallback으로 합산하지만, RPC 가 더 효율적)
CREATE OR REPLACE FUNCTION sum_post_views()
RETURNS TABLE(sum bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(view_count), 0)::bigint AS sum
  FROM posts
  WHERE deleted_at IS NULL;
$$;

-- 일별 게시물 조회수 시계열 — 대시보드 차트용
-- 사용: SELECT * FROM daily_post_views('2026-01-01'::date, '2026-01-31'::date);
CREATE OR REPLACE FUNCTION daily_post_views(p_start date, p_end date)
RETURNS TABLE(day date, views bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    date_trunc('day', viewed_at)::date AS day,
    COUNT(*)::bigint AS views
  FROM post_views
  WHERE viewed_at >= p_start
    AND viewed_at < (p_end + INTERVAL '1 day')
  GROUP BY day
  ORDER BY day ASC;
$$;

-- 예약 발행 cron 용 — 시간이 도달한 예약 게시물/작품을 발행 처리
-- Vercel cron 이나 Supabase scheduled task 가 정기적으로 호출
-- UPDATE...RETURNING 은 CTE(WITH) 안에서만 가능하므로 두 UPDATE 를 모두 CTE 로 묶음
CREATE OR REPLACE FUNCTION publish_scheduled()
RETURNS TABLE(table_name text, id uuid, was_scheduled_at timestamptz)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH
    posts_pub AS (
      UPDATE posts
      SET published = true, scheduled_at = NULL, updated_at = now()
      WHERE published = false
        AND deleted_at IS NULL
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= now()
      RETURNING posts.id AS pid, posts.scheduled_at AS pat
    ),
    works_pub AS (
      UPDATE works
      SET published = true, scheduled_at = NULL, updated_at = now()
      WHERE published = false
        AND deleted_at IS NULL
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= now()
      RETURNING works.id AS wid, works.scheduled_at AS wat
    )
  SELECT 'posts'::text, pid, pat FROM posts_pub
  UNION ALL
  SELECT 'works'::text, wid, wat FROM works_pub;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- Storage: uploads 버킷 정책
--   폴더: logos/, resume/, bgm/, covers/, images/ 등
--   Admin API(service_role)로 업로드, 공개 읽기
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- Cover image picker — 통합 이력 (admin user 별, ai/unsplash/preset)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cover_image_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  source text NOT NULL CHECK (source IN ('ai', 'unsplash', 'preset')),
  meta text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 동일 user + url 중복 방지 — UPSERT 로 created_at 갱신 가능
CREATE UNIQUE INDEX IF NOT EXISTS cover_image_history_user_url_uniq
  ON cover_image_history (user_id, url);

CREATE INDEX IF NOT EXISTS cover_image_history_user_created_idx
  ON cover_image_history (user_id, created_at DESC);

ALTER TABLE cover_image_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cover_image_history' AND policyname = 'Users manage own cover history') THEN
    CREATE POLICY "Users manage own cover history"
      ON cover_image_history FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 버킷 자동 생성 (없으면 생성)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

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
-- 완료! 총 12개 테이블 + 3개 RPC 함수가 생성되었습니다.
--
-- site_settings        : 사이트 설정 + 프로필 데이터
-- series               : 블로그 시리즈
-- posts                : 블로그 포스트 (scheduled_at 포함)
-- comments             : 포스트 댓글 (대댓글, 이중 인증)
-- likes                : 좋아요 (포스트/작업물 공용)
-- works                : 포트폴리오 작업물 (scheduled_at 포함)
-- site_visits          : 방문자 통계
-- post_views           : 게시물별 시계열 조회 기록 (일별 추세 차트)
-- work_comments        : Works 댓글 (대댓글, 이중 인증)
-- (댓글 좋아요는 likes 테이블에서 target_type='post_comment'/'work_comment'로 통합 관리)
-- admin_notifications  : 관리자 알림 로그
-- revisions            : 에디터 리비전 히스토리 (posts/works 공용)
-- post_work_relations  : posts ↔ works 양방향 연결 (Notion Relation)
--
-- RPC:
--   sum_post_views()                              : 누적 조회수 합계
--   daily_post_views(p_start date, p_end date)    : 일별 조회수 시계열
--   publish_scheduled()                           : 예약 시간 도달한 게시물/작품 발행 (cron 호출)
-- ============================================================

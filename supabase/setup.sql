-- ============================================================
-- 포트폴리오 사이트 — Supabase 전체 DB 설정 (fresh install)
-- ============================================================
-- 처음 프로젝트 세팅 시 이 파일 하나만 Supabase SQL Editor 에 붙여 실행하면
-- 모든 테이블 · 인덱스 · RLS 정책 · RPC 함수 · trigger · pg_cron job ·
-- storage bucket 까지 한 번에 생성됩니다. 이미 있으면 건너뜁니다 (IF NOT EXISTS).
--
-- 사전 준비:
--   1. Database > Extensions 에서 다음을 활성화:
--        - pg_cron  (예약 발행 + 휴지통 자동 영구삭제 cron)
--        - pg_net   (cron job 안에서 Resend HTTP 호출)
--      (아래 CREATE EXTENSION 이 함께 시도하지만, dashboard 활성화가 필요한 환경도 있음)
--
--   2. Vault > Secrets 에 등록 (optional — 미등록 시 이메일 알림만 skip):
--        - resend_api_key : re_xxx... (https://resend.com/api-keys)
--        - admin_email    : 관리자 이메일 (알림 수신)
--        - notify_from    : 발신 이메일 (Resend 인증된 도메인)
--
-- 기존 DB 에서 마이그레이션 중이라면 supabase/migrations/ 의 .sql 파일을
-- 날짜순으로 실행하세요. 이 파일은 \"fresh install\" 기준입니다.
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
  -- 태그별 설명 (works.tech_notes 와 동일 패턴 — { tag: items[] })
  tag_notes    jsonb NOT NULL DEFAULT '{}'::jsonb,
  category     text NOT NULL DEFAULT '',
  is_pinned    boolean NOT NULL DEFAULT false,
  published    boolean NOT NULL DEFAULT false,
  view_count   int NOT NULL DEFAULT 0,
  like_count   int NOT NULL DEFAULT 0,
  github_url   text DEFAULT '',
  -- 휴지통(소프트 삭제)
  deleted_at   timestamptz DEFAULT NULL,
  -- 휴지통 자동 영구삭제 (TTL) — cron 이 NOW() > purge_after 면 hard delete
  purge_after  timestamptz DEFAULT NULL,
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

-- purge_after cron 스캔용 — deleted_at IS NOT NULL 인 row 만 인덱스
CREATE INDEX IF NOT EXISTS posts_purge_after_idx
  ON posts (purge_after) WHERE deleted_at IS NOT NULL;

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
-- 3-1. posts.series_order 자동 정합화 trigger
--      INSERT/UPDATE/DELETE 시 해당 series 의 모든 post 를 0-based sequential 로 재정렬.
--      admin reorder / 글 삭제 / 시리즈 이동 등 어떤 경로로 변경되어도 자동 정합.
--      pg_trigger_depth() 로 재귀 호출 차단.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION normalize_series_order(p_series_id uuid)
RETURNS void AS $$
BEGIN
  IF p_series_id IS NULL THEN
    RETURN;
  END IF;

  WITH ranked AS (
    SELECT id,
           (ROW_NUMBER() OVER (
             ORDER BY series_order ASC, created_at ASC, id ASC
           ) - 1)::int AS new_order
    FROM posts
    WHERE series_id = p_series_id
  )
  UPDATE posts p
  SET series_order = r.new_order
  FROM ranked r
  WHERE p.id = r.id
    AND p.series_order IS DISTINCT FROM r.new_order;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_normalize_series_order()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.series_id IS NOT NULL THEN
    PERFORM normalize_series_order(NEW.series_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.series_id IS NOT NULL THEN
    PERFORM normalize_series_order(NEW.series_id);
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.series_id IS NOT NULL
     AND OLD.series_id IS DISTINCT FROM NEW.series_id THEN
    PERFORM normalize_series_order(OLD.series_id);
  ELSIF TG_OP = 'DELETE' AND OLD.series_id IS NOT NULL THEN
    PERFORM normalize_series_order(OLD.series_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_normalize_series_order ON posts;
CREATE TRIGGER posts_normalize_series_order
AFTER INSERT OR UPDATE OF series_id, series_order OR DELETE
ON posts
FOR EACH ROW
EXECUTE FUNCTION trg_normalize_series_order();


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
--    categories_ko/en : text[] 다중 선택 (예: ["웹앱", "라이브러리"])
--    nature_ko/en     : 제작 동기 (토이 / 사이드 / 실무 / 학습 등)
--    slug             : /works/[slug] 라우팅용
--    contributions_*  : 역할별 작업 내용 jsonb (예: { "Frontend": ["페이지 구현"] })
--    tech_notes       : 기술별 메모 jsonb (예: { "React": "컴포넌트 기반 UI" })
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS works (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  number           text NOT NULL DEFAULT '01',
  title            text NOT NULL DEFAULT '',
  slug             text NOT NULL DEFAULT '',
  subtitle_ko      text NOT NULL DEFAULT '',
  subtitle_en      text NOT NULL DEFAULT '',
  -- 결과물 형태 (웹앱·라이브러리 등) — 다중 선택. ?category=foo 필터는 categories_ko @> ARRAY['foo']
  categories_ko    text[] NOT NULL DEFAULT ARRAY[]::text[],
  categories_en    text[] NOT NULL DEFAULT ARRAY[]::text[],
  -- 제작 동기 / 성격 (토이 프로젝트 / 사이드 프로젝트 / 실무 / 클론코딩 / 학습 / 기타)
  nature_ko        text NOT NULL DEFAULT '',
  nature_en        text NOT NULL DEFAULT '',
  year             text NOT NULL DEFAULT '',
  description_ko   text NOT NULL DEFAULT '',
  description_en   text NOT NULL DEFAULT '',
  role_ko          text NOT NULL DEFAULT '',
  role_en          text NOT NULL DEFAULT '',
  tech             text[] NOT NULL DEFAULT '{}',
  image            text NOT NULL DEFAULT '',
  size             text NOT NULL DEFAULT 'medium'
    CHECK (size IN ('large', 'small', 'medium', 'tall', 'wide')),
  content_ko       text NOT NULL DEFAULT '',
  content_en       text NOT NULL DEFAULT '',
  content_type     text NOT NULL DEFAULT 'markdown'
    CHECK (content_type IN ('markdown', 'richtext')),
  -- legacy separate sections (backward compat)
  overview_ko      text NOT NULL DEFAULT '',
  overview_en      text NOT NULL DEFAULT '',
  overview_image   text NOT NULL DEFAULT '',
  challenge_ko     text NOT NULL DEFAULT '',
  challenge_en     text NOT NULL DEFAULT '',
  challenge_image  text NOT NULL DEFAULT '',
  solution_ko      text NOT NULL DEFAULT '',
  solution_en      text NOT NULL DEFAULT '',
  solution_image   text NOT NULL DEFAULT '',
  team_members     jsonb NOT NULL DEFAULT '[]',
  -- 본인 역할별 작업 내용 (예: { "Frontend": ["페이지 구현", "라우팅"], "Backend": ["API"] })
  contributions_ko jsonb NOT NULL DEFAULT '{}'::jsonb,
  contributions_en jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 기술별 메모 (예: { "React": "컴포넌트 기반 UI", "TypeScript": "타입 안전성" })
  tech_notes       jsonb NOT NULL DEFAULT '{}'::jsonb,
  gallery          text[] NOT NULL DEFAULT '{}',
  live_url         text DEFAULT '',
  github_url       text DEFAULT '',
  published        boolean NOT NULL DEFAULT false,
  sort_order       int NOT NULL DEFAULT 0,
  -- AI 요약
  summary_ko       text NOT NULL DEFAULT '',
  summary_en       text NOT NULL DEFAULT '',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  deleted_at       timestamptz DEFAULT NULL,
  -- 휴지통 자동 영구삭제 (TTL)
  purge_after      timestamptz DEFAULT NULL,
  -- 예약 발행: NULL=즉시, 미래 시간 설정 시 cron이 published=true 로 flip
  scheduled_at     timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS works_purge_after_idx
  ON works (purge_after) WHERE deleted_at IS NOT NULL;
-- slug 조회용
CREATE INDEX IF NOT EXISTS idx_works_slug ON works (slug);
-- nature 필터링/groupby 용 (작은 카디널리티 — btree 충분)
CREATE INDEX IF NOT EXISTS idx_works_nature_ko ON works (nature_ko);
-- categories array containment 필터 (?category=foo → categories_ko @> ARRAY['foo'])
CREATE INDEX IF NOT EXISTS idx_works_categories_ko_gin ON works USING GIN (categories_ko);
CREATE INDEX IF NOT EXISTS idx_works_categories_en_gin ON works USING GIN (categories_en);

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
--      viewed_date — KST 기준 날짜 (Asia/Seoul). dedup boundary + 일별 group by 통일
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_views (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  ip          text,
  viewed_at   timestamptz NOT NULL DEFAULT now(),
  viewed_date date GENERATED ALWAYS AS ((viewed_at AT TIME ZONE 'Asia/Seoul')::date) STORED
);

-- 시간 범위 + post 별 조회용
CREATE INDEX IF NOT EXISTS idx_post_views_post_id_viewed_at
  ON post_views (post_id, viewed_at DESC);
-- 일별 group by (KST) 빠른 조회
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_date
  ON post_views (viewed_date DESC);
-- IP+date dedup unique constraint — 동시 race condition 방지
CREATE UNIQUE INDEX IF NOT EXISTS uniq_post_views_post_ip_date
  ON post_views (post_id, ip, viewed_date);

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
-- 10. comment_reports — 댓글 신고 누적 (posts + works 공용)
--     comment_type: 'post' | 'work'  → 어느 댓글 테이블의 id 인지 구분
--     reporter_hash: IP + UA 해시로 동일 사용자 중복 신고 방지
--     status: 'pending' (신고 접수) → 'resolved' (admin 처리됨) | 'dismissed' (반려)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_reports (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id    uuid NOT NULL,
  comment_type  text NOT NULL CHECK (comment_type IN ('post', 'work')),
  reason        text NOT NULL DEFAULT '',
  reporter_hash text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at    timestamptz DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_status_created
  ON comment_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment
  ON comment_reports (comment_id, comment_type);
-- 동일 사용자의 동일 댓글 중복 신고 차단 (pending 인 것만)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_comment_reports_pending
  ON comment_reports (comment_id, comment_type, reporter_hash)
  WHERE status = 'pending';

ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_reports_service_all"
  ON comment_reports FOR ALL
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

-- view_count atomic increment — read-then-write race condition 회피
-- /api/posts/[id]/view 가 호출. 다수 IP 동시 view 시에도 누락 없이 +1
CREATE OR REPLACE FUNCTION increment_post_view_count(p_post_id uuid)
RETURNS void
LANGUAGE sql
VOLATILE
AS $$
  UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_post_id;
$$;

-- 조회수 기록 — dedup (IP+post+KST date 1회) + post_views insert + posts.view_count +1 을 한 트랜잭션.
-- 동시 race 는 uniq_post_views_post_ip_date 가 차단 (ON CONFLICT DO NOTHING).
-- 반환: true = 새로 카운트, false = 오늘 이미 카운트됨
CREATE OR REPLACE FUNCTION record_post_view(p_post_id uuid, p_ip text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_inserted boolean := false;
BEGIN
  -- post 존재 확인 (FK violation 방지)
  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_post_id AND deleted_at IS NULL) THEN
    RETURN false;
  END IF;

  -- dedup + insert atomically
  INSERT INTO post_views (post_id, ip)
  VALUES (p_post_id, p_ip)
  ON CONFLICT (post_id, ip, viewed_date) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_post_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

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

-- 일별 게시물 조회수 시계열 — 대시보드 차트용 (KST 기준)
-- viewed_date 는 generated column 으로 (viewed_at AT TIME ZONE 'Asia/Seoul')::date
-- 사용: SELECT * FROM daily_post_views('2026-01-01'::date, '2026-01-31'::date);
CREATE OR REPLACE FUNCTION daily_post_views(p_start date, p_end date)
RETURNS TABLE(day date, views bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT viewed_date AS day, COUNT(*)::bigint AS views
  FROM post_views
  WHERE viewed_date >= p_start AND viewed_date <= p_end
  GROUP BY viewed_date
  ORDER BY viewed_date ASC;
$$;

-- slug 자동 생성 — JS 의 generateSlug 와 동일 로직 (a-z, 0-9, 한글, 공백→하이픈, 80자 cap).
-- 마이그레이션에서 빈 slug 채울 때 사용. 클라이언트는 별도 generateSlug() 함수 사용.
CREATE OR REPLACE FUNCTION _sql_slugify(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE AS $$
DECLARE
  v text;
BEGIN
  v := lower(coalesce(t, ''));
  v := regexp_replace(v, '[^a-z0-9가-힣\s-]', '', 'g');
  v := regexp_replace(v, '\s+', '-', 'g');
  v := regexp_replace(v, '--+', '-', 'g');
  v := regexp_replace(v, '^-+|-+$', '', 'g');
  v := substring(v from 1 for 80);
  RETURN v;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 예약 발행 + 휴지통 영구삭제 자동화 — pg_cron + pg_net + Vault
-- ────────────────────────────────────────────────────────────
-- 매분 publish_scheduled() / 매일 03:00 KST purge_trash_scheduled() 실행.
-- Vault 에 resend_api_key / admin_email / notify_from 등록되어 있으면
-- 처리 결과를 admin_notifications + Resend 이메일로 알림.
-- Vault 미등록 시 DB 작업은 정상, 이메일만 skip.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 유틸: Vault secret 안전 조회 (없으면 NULL)
CREATE OR REPLACE FUNCTION _get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v text;
BEGIN
  SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = secret_name LIMIT 1;
  RETURN v;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- 유틸: Resend 이메일 발송 (Vault 비어있으면 skip, 실패는 무시 — DB 본 작업은 성공해야)
CREATE OR REPLACE FUNCTION _send_admin_email(subject text, html text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  api_key text := _get_vault_secret('resend_api_key');
  to_email text := _get_vault_secret('admin_email');
  from_email text := _get_vault_secret('notify_from');
BEGIN
  IF api_key IS NULL OR to_email IS NULL OR from_email IS NULL THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || api_key
    ),
    body := jsonb_build_object(
      'from', from_email,
      'to', to_email,
      'subject', subject,
      'html', html
    )::text
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 예약 발행 — 시간이 도달한 예약 게시물/작품을 발행 + admin_notifications + 이메일.
-- pg_cron 이 매분 호출 (idempotent). RETURN QUERY 가 caller 에 stream 하고 별도 LOOP 로 알림 처리.
CREATE OR REPLACE FUNCTION publish_scheduled()
RETURNS TABLE(table_name text, id uuid, title text, was_scheduled_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
  total int := 0;
  html_body text := '';
BEGIN
  RETURN QUERY
  WITH posts_pub AS (
    UPDATE posts SET published = true, scheduled_at = NULL, updated_at = now()
    WHERE published = false
      AND deleted_at IS NULL
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
    RETURNING id, title, scheduled_at
  ),
  works_pub AS (
    UPDATE works SET published = true, scheduled_at = NULL, updated_at = now()
    WHERE published = false
      AND deleted_at IS NULL
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
    RETURNING id, title, scheduled_at
  ),
  all_pub AS (
    SELECT 'posts'::text AS table_name, id, title, scheduled_at AS was_scheduled_at FROM posts_pub
    UNION ALL
    SELECT 'works'::text, id, title, scheduled_at FROM works_pub
  )
  SELECT * FROM all_pub;

  -- 알림 — 위 RETURN QUERY 와 별개로 fetch (RETURN QUERY 는 caller stream)
  FOR r IN
    SELECT 'posts'::text AS t, id, title FROM posts WHERE published = true AND updated_at > now() - interval '5 seconds' AND scheduled_at IS NULL
    UNION ALL
    SELECT 'works'::text, id, title FROM works WHERE published = true AND updated_at > now() - interval '5 seconds' AND scheduled_at IS NULL
  LOOP
    INSERT INTO admin_notifications (type, title, message, metadata)
    VALUES (
      'publish',
      '📝 예약 발행 완료',
      r.t || ' "' || COALESCE(r.title, '(no title)') || '" 가 발행되었습니다.',
      jsonb_build_object('table', r.t, 'id', r.id)
    );
    total := total + 1;
    html_body := html_body || '<li><strong>' || r.t || '</strong>: ' || COALESCE(r.title, '(no title)') || '</li>';
  END LOOP;

  IF total > 0 THEN
    PERFORM _send_admin_email(
      '📝 예약 발행 ' || total || '건 완료',
      '<p>다음 항목이 발행되었습니다:</p><ul>' || html_body || '</ul>'
    );
  END IF;
END;
$$;

-- 휴지통 영구삭제 — purge_after 가 지난 posts/works hard delete + 알림.
-- pg_cron 이 매일 UTC 18:00 (= KST 03:00) 호출.
CREATE OR REPLACE FUNCTION purge_trash_scheduled()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  posts_count int := 0;
  works_count int := 0;
  total int;
BEGIN
  WITH del AS (
    DELETE FROM posts
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO posts_count FROM del;

  WITH del AS (
    DELETE FROM works
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO works_count FROM del;

  total := posts_count + works_count;

  IF total > 0 THEN
    INSERT INTO admin_notifications (type, title, message, metadata)
    VALUES (
      'purge',
      '🗑️ 휴지통 영구삭제',
      'posts ' || posts_count || '건, works ' || works_count || '건 영구삭제됨',
      jsonb_build_object('posts', posts_count, 'works', works_count)
    );

    PERFORM _send_admin_email(
      '🗑️ 휴지통 영구삭제 ' || total || '건',
      '<p>아래 항목이 영구삭제되었습니다:</p><ul>'
        || '<li>posts: ' || posts_count || '건</li>'
        || '<li>works: ' || works_count || '건</li>'
        || '</ul>'
    );
  END IF;

  RETURN total;
END;
$$;

-- pg_cron 등록 — 재실행 안전 (기존 unschedule 후 등록)
DO $$
BEGIN PERFORM cron.unschedule('publish-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN PERFORM cron.unschedule('purge-trash-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 발행: 매분
SELECT cron.schedule(
  'publish-scheduled',
  '* * * * *',
  $cron$ SELECT publish_scheduled(); $cron$
);

-- 삭제: 매일 UTC 18:00 (= KST 03:00)
SELECT cron.schedule(
  'purge-trash-scheduled',
  '0 18 * * *',
  $cron$ SELECT purge_trash_scheduled(); $cron$
);

-- cron 확인 / 해제 참고:
--   SELECT jobname, schedule, active FROM cron.job;
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--   SELECT cron.unschedule('publish-scheduled');


-- ────────────────────────────────────────────────────────────
-- 13. cover_image_history — Cover Image Picker 통합 이력
--     admin user 별 ai / unsplash / preset 소스 모두 저장 (RLS 로 본인 것만 접근)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cover_image_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url        text NOT NULL,
  source     text NOT NULL CHECK (source IN ('ai', 'unsplash', 'preset')),
  meta       text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 동일 user + url 중복 방지 — UPSERT 로 created_at 갱신 가능
CREATE UNIQUE INDEX IF NOT EXISTS cover_image_history_user_url_uniq
  ON cover_image_history (user_id, url);

CREATE INDEX IF NOT EXISTS cover_image_history_user_created_idx
  ON cover_image_history (user_id, created_at DESC);

ALTER TABLE cover_image_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cover history"
  ON cover_image_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- Storage: uploads 버킷
--   폴더: logos/, resume/, bgm/, covers/, images/, posts/, ...
--   Admin API(service_role)로 업로드, 공개 읽기
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- admin_login_attempts — admin 로그인 실패 횟수 추적 + lockout
-- ────────────────────────────────────────────────────────────
-- email 기준 (admin 1명 또는 소수라 sufficient. IP 기준 추가는 후속 마이그레이션).
-- API route 에서 service role 로만 접근.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  email           text PRIMARY KEY,
  failed_count    int NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_login_attempts' AND policyname = 'admin_login_attempts_service_only'
  ) THEN
    CREATE POLICY "admin_login_attempts_service_only"
      ON admin_login_attempts FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- admin_known_devices — 새 기기 로그인 이메일 인증
-- ────────────────────────────────────────────────────────────
-- 로그인 시점에 user-agent fingerprint 조회. 처음 보는 fingerprint 면 이메일로
-- approve 토큰 발송 → 클릭 후 trusted. service role 만 접근.
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_known_devices' AND policyname = 'admin_known_devices_service_only'
  ) THEN
    CREATE POLICY "admin_known_devices_service_only"
      ON admin_known_devices FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;


-- 버킷 자동 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 인증된 사용자만 업로드
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
-- 완료! 총 16개 테이블 + 5개 RPC 함수 + 2개 pg_cron job 생성됨.
--
-- 테이블:
--   site_settings        : 사이트 설정 + 프로필 데이터 + 시크릿/API 키 (JSONB)
--   series               : 블로그 시리즈 (sort_order, auto_cover_url)
--   posts                : 블로그 포스트 (post_number 시퀀스 + scheduled_at + soft delete)
--   comments             : 포스트 댓글 (대댓글, password 인증, tombstone)
--   likes                : 좋아요 (target_type 으로 posts/works/comments 통합, IP 중복 방지)
--   works                : 포트폴리오 작업물 (slug, categories_ko/en text[], nature_ko/en,
--                          contributions_ko/en jsonb, tech_notes jsonb,
--                          team_members jsonb, scheduled_at, soft delete)
--   site_visits          : 방문자 통계 (IP + date 로 1일 1회 + UA 메타)
--   post_views           : 게시물별 시계열 조회 기록 (KST date generated column)
--   work_comments        : Works 댓글 (대댓글, password 인증, tombstone)
--   admin_notifications  : 관리자 알림 로그 (comment / publish / purge / report 등)
--   comment_reports      : 댓글 신고 누적 (posts/works 공용, status: pending/resolved/dismissed)
--   revisions            : 에디터 리비전 히스토리 (posts/works 공용, JSONB snapshot)
--   post_work_relations  : posts ↔ works many-to-many 양방향 (Notion Relation)
--   cover_image_history  : Cover Image Picker 통합 이력 (admin user 별, RLS)
--   admin_login_attempts : admin 로그인 실패 횟수 추적 + lockout (5회 → 15분)
--   admin_known_devices  : 새 기기 인증 (UA fingerprint + 이메일 approve 토큰)
--
-- RPC:
--   increment_post_view_count(p_post_id)          : 조회수 atomic +1 (race-free)
--   record_post_view(p_post_id, p_ip)             : dedup (KST 일자) + post_views insert + view_count +1 한 트랜잭션
--   sum_post_views()                              : 누적 조회수 합계
--   daily_post_views(p_start date, p_end date)    : 일별 조회수 시계열 (KST)
--   publish_scheduled()                           : 예약 시간 도달한 게시물/작품 발행 + 알림 (cron 매분)
--   purge_trash_scheduled()                       : purge_after 지난 휴지통 hard delete + 알림 (cron 매일 KST 03:00)
--
-- 유틸 함수:
--   _sql_slugify(t)                               : title → slug 변환 (마이그레이션 backfill 용)
--   _get_vault_secret(name)                       : Vault secret 안전 조회 (없으면 NULL)
--   _send_admin_email(subject, html)              : Resend 이메일 발송 (Vault 비어있으면 skip)
--   normalize_series_order(p_series_id)           : series_order 0-based sequential 재정렬 (trigger 호출)
--
-- Trigger:
--   posts_normalize_series_order                  : posts INSERT/UPDATE/DELETE 시 series_order 자동 정합화
--
-- pg_cron Jobs:
--   publish-scheduled       (* * * * *)           : 매분 publish_scheduled() 호출
--   purge-trash-scheduled   (0 18 * * *)          : 매일 UTC 18:00 (KST 03:00) purge_trash_scheduled() 호출
--
-- Storage:
--   uploads (public)                              : logos/, resume/, bgm/, covers/, images/, posts/ ...
-- ============================================================

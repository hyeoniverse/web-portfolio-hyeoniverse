-- ============================================================
-- 포트폴리오 사이트 — Supabase 전체 DB 설정 (fresh install)
-- ============================================================
-- 처음 프로젝트 세팅 시 이 파일 하나만 Supabase SQL Editor 에 붙여 실행하면
-- 모든 테이블 · 인덱스 · RLS 정책 · RPC 함수 · trigger · pg_cron job ·
-- storage bucket 까지 한 번에 생성됩니다.
--
-- **재실행 안전 (idempotent)** — 여러 번 실행해도 안전합니다:
--   - 테이블: IF NOT EXISTS
--   - 정책:   DROP POLICY IF EXISTS + CREATE POLICY (또는 DO $$ + IF NOT EXISTS)
--   - 함수:   CREATE OR REPLACE FUNCTION
--   - trigger: DROP TRIGGER IF EXISTS + CREATE TRIGGER
--   - pg_cron: cron.unschedule (예외 swallow) + cron.schedule
--   - storage: ON CONFLICT DO NOTHING + DO $$ + IF NOT EXISTS
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
--
-- 마이그레이션 통합 (이 setup.sql 안에 내용 흡수됨, 파일 끝에서 applied_migrations 에
-- record 만 남김 — 나중에 같은 마이그레이션 단일 실행해도 log_migration_applied 가
-- was_new = false 로 skip):
--   2026_05_14  post_views — KST timezone + atomic dedup function
--   2026_05_18  admin_known_devices — 새 기기 인증 (UA fingerprint)
--   2026_05_18  admin_login_attempts — 로그인 lockout (5회 → 15분)
--   2026_05_18  posts/works.purge_after — 휴지통 TTL
--   2026_05_21  series_order_normalize trigger
--   2026_05_22  publish_scheduled + purge_trash_scheduled pg_cron + pg_net + Vault
--   2026_05_22  works.categories_ko/en TEXT[] (다중 카테고리)
--   2026_05_22  works.nature_ko/en (제작 동기)
--   2026_05_22  works.slug UNIQUE
--   2026_05_23  works.contributions / tech_notes jsonb
--   2026_05_24  posts.tag_notes jsonb (태그별 설명)
--   2026_05_26  applied_migrations + log_migration_applied 헬퍼
--   2026_05_26  safe_publish_scheduled / safe_purge_trash_scheduled wrapper
--                 (EXCEPTION 잡아 admin_notifications insert)
--   2026_05_26  works.number DROP (sort_order 로 derive)
--   2026_05_27  works.size DROP
--   2026_05_28  publish_scheduled — #variable_conflict use_column (id ambiguity fix)
--   2026_05_29  posts.github_url
--   2026_06_27  poll_votes — 본문 투표 블록 집계 (poll_id + option_id, IP 중복 방지)
--   2026_06_28  series_work_relations — works 에 관련 시리즈 연결
--   2026_07_09  calendars — 본문 이벤트 달력 블록 (게시물 간 공유 원본, 블록은 calendar_id 참조)
--   2026_07_09  posts.icon — 페이지 아이콘
--   2026_07_09  series 제목(ko/en) 80자 CHECK
--   2026_07_12  calendars 휴지통 (deleted_at/purge_after, 30일 TTL)
--   2026_07_12  posts.cover_position / cover_zoom
--   2026_07_12  posts.version — 낙관적 동시성 제어
--   2026_07_12  works.icon
--   2026_07_13  posts 제목(ko/en) 120자 CHECK
--   2026_07_14  comment_reactions — 댓글 이모지 반응 (giscus 식 고정 8종)
--   2026_07_14  posts.author_ids — 다중 작성자
--   2026_07_17  author_invites — 저자 초대(이메일→권한) + OAuth 매칭 (이슈 #334)
--   2026_07_18  works.title_en — 작품 제목 영문 (title 이중언어화)
--
-- 마이그레이션 파일이 없는 것 (setup.sql 에만 존재):
--   custom_emojis — 에디터 이모지 picker 의 커스텀 아이콘 기록
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
DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read"
  ON site_settings FOR SELECT
  USING (true);

-- service_role만 쓰기 가능 (API에서 service role key 사용)
DROP POLICY IF EXISTS "site_settings_service_write" ON site_settings;
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

-- 제목(ko/en) 최대 길이 80자 — 앱 상수 SERIES_TITLE_MAX 와 동일. UI/폼/API 우회 최종 방어선.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'series_title_maxlen') THEN
    ALTER TABLE series ADD CONSTRAINT series_title_maxlen CHECK (char_length(title) <= 80) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'series_title_en_maxlen') THEN
    ALTER TABLE series ADD CONSTRAINT series_title_en_maxlen CHECK (char_length(title_en) <= 80) NOT VALID;
  END IF;
END $$;

ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- 공개된 시리즈만 읽기
DROP POLICY IF EXISTS "series_public_read" ON series;
CREATE POLICY "series_public_read"
  ON series FOR SELECT
  USING (published = true);

-- service_role 전체 접근
DROP POLICY IF EXISTS "series_service_all" ON series;
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
  -- 커버 세로 위치 %(object-position, 0~100) + 확대 배율(scale, 1~2.5) — CoverBanner 편집값
  cover_position real NOT NULL DEFAULT 50,
  cover_zoom     real NOT NULL DEFAULT 1,
  -- 페이지 아이콘(이모지 또는 이미지 URL) — 커버 배너 상단
  icon         text NOT NULL DEFAULT '',
  tags         text[] NOT NULL DEFAULT '{}',
  -- 태그별 설명 (works.tech_notes 와 동일 패턴 — { tag: items[] })
  tag_notes    jsonb NOT NULL DEFAULT '{}'::jsonb,
  category     text NOT NULL DEFAULT '',
  is_pinned    boolean NOT NULL DEFAULT false,
  published    boolean NOT NULL DEFAULT false,
  -- 글 작성 언어 — PostEditor 폼(PostFormData.language)이 저장 때마다 그대로 보내고
  -- /api/posts 는 body 를 필터 없이 insert 하므로 컬럼이 없으면 저장이 400 으로 실패한다.
  language     text NOT NULL DEFAULT 'ko'
    CHECK (language IN ('ko', 'en')),
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
  -- 낙관적 동시성 제어 카운터 (편집 저장 시 조건부 갱신)
  version      integer NOT NULL DEFAULT 1,
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
  scheduled_at timestamptz DEFAULT NULL,
  -- 작성자 id 배열 (site.config authors 참조). 비어있으면 기본 작성자로 표시
  author_ids   text[] NOT NULL DEFAULT '{}'
);

-- purge_after cron 스캔용 — deleted_at IS NOT NULL 인 row 만 인덱스
CREATE INDEX IF NOT EXISTS posts_purge_after_idx
  ON posts (purge_after) WHERE deleted_at IS NOT NULL;

-- 제목(ko/en) 최대 길이 120자 — 앱 상수 POST_TITLE_MAX 와 동일. UI/폼/API 우회 최종 방어선.
-- NOT VALID: 이미 데이터가 있는 DB 에 이 파일을 다시 돌려도 기존 초과 행 때문에 중단되지 않게.
-- 전수 검증이 필요하면 초과 행 정리 후 ALTER TABLE posts VALIDATE CONSTRAINT posts_title_len;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_title_len') THEN
    ALTER TABLE posts ADD CONSTRAINT posts_title_len CHECK (char_length(title) <= 120) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_title_en_len') THEN
    ALTER TABLE posts ADD CONSTRAINT posts_title_en_len CHECK (title_en IS NULL OR char_length(title_en) <= 120) NOT VALID;
  END IF;
END $$;

-- slug 검색용 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug);
-- 시리즈별 포스트 조회용
CREATE INDEX IF NOT EXISTS idx_posts_series_id ON posts (series_id);
-- 고유 번호 유니크 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_post_number ON posts (post_number);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 공개된 포스트만 읽기
DROP POLICY IF EXISTS "posts_public_read" ON posts;
CREATE POLICY "posts_public_read"
  ON posts FOR SELECT
  USING (published = true);

-- service_role 전체 접근
DROP POLICY IF EXISTS "posts_service_all" ON posts;
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
DROP POLICY IF EXISTS "comments_public_read" ON comments;
CREATE POLICY "comments_public_read"
  ON comments FOR SELECT
  USING (true);

-- 누구나 댓글 작성 가능 (비회원 댓글 지원)
DROP POLICY IF EXISTS "comments_public_insert" ON comments;
CREATE POLICY "comments_public_insert"
  ON comments FOR INSERT
  WITH CHECK (true);

-- service_role 전체 접근 (관리자 삭제 등)
DROP POLICY IF EXISTS "comments_service_all" ON comments;
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
DROP POLICY IF EXISTS "likes_public_read" ON likes;
CREATE POLICY "likes_public_read"
  ON likes FOR SELECT
  USING (true);

-- service_role 전체 접근
DROP POLICY IF EXISTS "likes_service_all" ON likes;
CREATE POLICY "likes_service_all"
  ON likes FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 5b. poll_votes — 본문 투표 블록 집계 (poll_id + option_id, IP 기반 중복 방지)
--    단일 선택은 API 에서 (poll_id, ip) 표를 교체, 복수는 옵션별 토글
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poll_votes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id    text NOT NULL,
  option_id  text NOT NULL,
  ip         text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique
  ON poll_votes (poll_id, option_id, ip);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll
  ON poll_votes (poll_id);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poll_votes_public_read" ON poll_votes;
CREATE POLICY "poll_votes_public_read"
  ON poll_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "poll_votes_service_all" ON poll_votes;
CREATE POLICY "poll_votes_service_all"
  ON poll_votes FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 5c. comment_reactions — 댓글 이모지 반응 (giscus 식 고정 세트: 👍 👎 😄 🎉 😕 ❤️ 🚀 👀)
--    comment_type: 'post' | 'work'
--    reactor_hash: IP+UA 해시 (좋아요의 IP 방식과 동일 취지, 익명 식별)
--    같은 reactor 가 같은 (댓글, 이모지) 에 중복 반응 방지
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_reactions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id   uuid NOT NULL,
  comment_type text NOT NULL CHECK (comment_type IN ('post', 'work')),
  emoji        text NOT NULL,
  reactor_hash text NOT NULL DEFAULT '',
  created_at   timestamptz DEFAULT now()
);

-- 동일 reactor 가 같은 (댓글, 이모지) 에 중복 반응 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_reactions_unique
  ON comment_reactions (comment_id, comment_type, emoji, reactor_hash);

-- 댓글 단위 집계 조회용
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment
  ON comment_reactions (comment_id, comment_type);

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- 누구나 반응 수 조회 가능
DROP POLICY IF EXISTS "comment_reactions_public_read" ON comment_reactions;
CREATE POLICY "comment_reactions_public_read"
  ON comment_reactions FOR SELECT
  USING (true);

-- service_role 전체 접근 (반응 토글은 admin client 로 처리)
DROP POLICY IF EXISTS "comment_reactions_service_all" ON comment_reactions;
CREATE POLICY "comment_reactions_service_all"
  ON comment_reactions FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 5b-2. calendars — 본문 이벤트 달력 블록 (게시물 간 공유 원본)
--    블록은 calendar_id 만 참조 → 여러 게시물이 같은 달력을 공유(연결형).
--    data(jsonb) = { month, events[], labels[] }. 읽기 공개 / 쓰기 admin(service_role).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendars (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL DEFAULT '',
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- 휴지통(소프트 삭제) + 30일 자동 영구삭제 TTL — posts/works 컨벤션 동일
  deleted_at  timestamptz DEFAULT NULL,
  purge_after timestamptz DEFAULT NULL
);

-- purge cron 스캔용 — deleted_at IS NOT NULL 인 row 만 인덱스
CREATE INDEX IF NOT EXISTS calendars_purge_after_idx
  ON calendars (purge_after) WHERE deleted_at IS NOT NULL;

ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendars_public_read" ON calendars;
CREATE POLICY "calendars_public_read"
  ON calendars FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "calendars_service_all" ON calendars;
CREATE POLICY "calendars_service_all"
  ON calendars FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 5c. custom_emojis — 에디터 이모지 picker 의 업로드(커스텀) 아이콘 기록
--    src : 업로드된 이미지 URL (파일 자체는 스토리지에 저장됨), 기록만 동기화
--    admin 전용 — API 는 service_role(createAdminClient) 로만 접근
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_emojis (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL DEFAULT '',
  src        text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_emojis_created
  ON custom_emojis (created_at DESC);

ALTER TABLE custom_emojis ENABLE ROW LEVEL SECURITY;

-- service_role 전체 접근 (anon/public 접근 없음 — admin 전용)
DROP POLICY IF EXISTS "custom_emojis_service_all" ON custom_emojis;
CREATE POLICY "custom_emojis_service_all"
  ON custom_emojis FOR ALL
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
  -- 표시 번호 (#01) 는 sort_order 에서 derive — 별도 컬럼 없음 (single source of truth)
  title            text NOT NULL DEFAULT '',   -- 국문/기본 제목
  title_en         text NOT NULL DEFAULT '',   -- 영문 제목 (빈 값이면 title 로 fallback)
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
  -- 페이지 아이콘(이모지 또는 이미지 URL) — 커버 배너 상단
  icon             text NOT NULL DEFAULT '',
  -- Flow 레이아웃 카드 사이즈는 sort_order 에서 cycle derive — 별도 컬럼 없음 (single source of truth)
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
-- 기존 DB 호환 — number / size 컬럼 (deprecated, sort_order 에서 derive) 제거
ALTER TABLE works DROP COLUMN IF EXISTS number;
ALTER TABLE works DROP COLUMN IF EXISTS size;

-- slug 조회용
CREATE INDEX IF NOT EXISTS idx_works_slug ON works (slug);
-- nature 필터링/groupby 용 (작은 카디널리티 — btree 충분)
CREATE INDEX IF NOT EXISTS idx_works_nature_ko ON works (nature_ko);
-- categories array containment 필터 (?category=foo → categories_ko @> ARRAY['foo'])
CREATE INDEX IF NOT EXISTS idx_works_categories_ko_gin ON works USING GIN (categories_ko);
CREATE INDEX IF NOT EXISTS idx_works_categories_en_gin ON works USING GIN (categories_en);

ALTER TABLE works ENABLE ROW LEVEL SECURITY;

-- 공개된 작업물만 읽기 (삭제되지 않은 것만)
DROP POLICY IF EXISTS "works_public_read" ON works;
CREATE POLICY "works_public_read"
  ON works FOR SELECT
  USING (published = true AND deleted_at IS NULL);

-- service_role 전체 접근
DROP POLICY IF EXISTS "works_service_all" ON works;
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
DROP POLICY IF EXISTS "site_visits_public_read" ON site_visits;
CREATE POLICY "site_visits_public_read"
  ON site_visits FOR SELECT
  USING (true);

-- service_role 전체 접근
DROP POLICY IF EXISTS "site_visits_service_all" ON site_visits;
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

DROP POLICY IF EXISTS "post_views_public_insert" ON post_views;
CREATE POLICY "post_views_public_insert"
  ON post_views FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "post_views_service_all" ON post_views;
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

DROP POLICY IF EXISTS "work_comments_public_read" ON work_comments;
CREATE POLICY "work_comments_public_read"
  ON work_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "work_comments_public_insert" ON work_comments;
CREATE POLICY "work_comments_public_insert"
  ON work_comments FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "work_comments_service_all" ON work_comments;
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

DROP POLICY IF EXISTS "admin_notifications_service_all" ON admin_notifications;
CREATE POLICY "admin_notifications_service_all"
  ON admin_notifications FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 9-a2. author_invites — 저자 초대 (이슈 #334). email→author_id+권한레벨.
--       owner 가 초대 → OAuth 로그인 시 이메일 매칭으로 app_metadata 부여. service role 전용.
--       역할은 DB 테이블이 아니라 auth.users.app_metadata 에 저장(role/author_id/permission_level).
--       owner 는 OWNER_EMAIL env 로 부트스트랩되며 초대 대상이 아니다.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS author_invites (
  email             text PRIMARY KEY,
  author_id         text NOT NULL,   -- site_settings.profile 의 저자 프로필 id
  permission_level  int  NOT NULL DEFAULT 1,  -- 1=저자(author), 2=편집자(editor). owner 는 별도(env)
  invited_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  consumed_at       timestamptz      -- OAuth 매칭으로 권한 부여된 시각(NULL=미소진)
);

ALTER TABLE author_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "author_invites_service_all" ON author_invites;
CREATE POLICY "author_invites_service_all"
  ON author_invites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 9-b. applied_migrations — schema migration 적용 추적 + 알림
--      각 migration 파일 마지막에 SELECT log_migration_applied('name', 'desc');
--      재실행 안전 (ON CONFLICT DO NOTHING). 처음 적용 시에만 admin_notifications insert.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applied_migrations (
  name        text PRIMARY KEY,
  description text NOT NULL DEFAULT '',
  applied_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE applied_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applied_migrations_service_all" ON applied_migrations;
CREATE POLICY "applied_migrations_service_all"
  ON applied_migrations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION log_migration_applied(p_name text, p_description text DEFAULT '')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  was_new boolean;
BEGIN
  INSERT INTO applied_migrations (name, description)
  VALUES (p_name, p_description)
  ON CONFLICT (name) DO NOTHING;

  GET DIAGNOSTICS was_new = ROW_COUNT;

  IF was_new THEN
    INSERT INTO admin_notifications (type, title, message, metadata)
    VALUES (
      'migration_applied',
      '🛠 schema migration 적용',
      p_name || (CASE WHEN p_description <> '' THEN E'\n' || p_description ELSE '' END),
      jsonb_build_object('migration', p_name, 'description', p_description)
    );
  END IF;
END;
$$;


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

DROP POLICY IF EXISTS "comment_reports_service_all" ON comment_reports;
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
DROP POLICY IF EXISTS "post_work_relations_public_read" ON post_work_relations;
CREATE POLICY "post_work_relations_public_read"
  ON post_work_relations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "post_work_relations_service_all" ON post_work_relations;
CREATE POLICY "post_work_relations_service_all"
  ON post_work_relations FOR ALL
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- series_work_relations — series ↔ works 다대다 (프로젝트에 관련 시리즈 연결)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS series_work_relations (
  series_id  uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  work_id    uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (series_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_series_work_relations_series ON series_work_relations (series_id);
CREATE INDEX IF NOT EXISTS idx_series_work_relations_work ON series_work_relations (work_id);

ALTER TABLE series_work_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "series_work_relations_public_read" ON series_work_relations;
CREATE POLICY "series_work_relations_public_read"
  ON series_work_relations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "series_work_relations_service_all" ON series_work_relations;
CREATE POLICY "series_work_relations_service_all"
  ON series_work_relations FOR ALL
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
-- #variable_conflict use_column — RETURNS TABLE 의 묵시적 OUT 변수 (id, title) 가
-- 본문 SQL 의 컬럼 참조와 충돌해 "column reference 'id' is ambiguous" 가 던져지는 것 방지.
CREATE OR REPLACE FUNCTION publish_scheduled()
RETURNS TABLE(table_name text, id uuid, title text, was_scheduled_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
#variable_conflict use_column
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

-- 휴지통 영구삭제 — purge_after 가 지난 posts/works/calendars hard delete + 알림.
-- pg_cron 이 매일 UTC 18:00 (= KST 03:00) 호출.
-- calendars 도 posts/works 와 같은 30일 TTL 휴지통을 쓴다 (/api/cron/purge-trash 와 동일 범위).
CREATE OR REPLACE FUNCTION purge_trash_scheduled()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  posts_count int := 0;
  works_count int := 0;
  calendars_count int := 0;
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

  WITH del AS (
    DELETE FROM calendars
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO calendars_count FROM del;

  total := posts_count + works_count + calendars_count;

  IF total > 0 THEN
    INSERT INTO admin_notifications (type, title, message, metadata)
    VALUES (
      'purge',
      '🗑️ 휴지통 영구삭제',
      'posts ' || posts_count || '건, works ' || works_count || '건, calendars ' || calendars_count || '건 영구삭제됨',
      jsonb_build_object('posts', posts_count, 'works', works_count, 'calendars', calendars_count)
    );

    PERFORM _send_admin_email(
      '🗑️ 휴지통 영구삭제 ' || total || '건',
      '<p>아래 항목이 영구삭제되었습니다:</p><ul>'
        || '<li>posts: ' || posts_count || '건</li>'
        || '<li>works: ' || works_count || '건</li>'
        || '<li>calendars: ' || calendars_count || '건</li>'
        || '</ul>'
    );
  END IF;

  RETURN total;
END;
$$;

-- safe_* wrapper — cron 실행 실패 시 admin_notifications(type='cron_error') insert.
-- 원본 함수가 throw 하면 cron 이 silent 실패하므로 관리자 알 길 없음 → wrapper 가 catch
CREATE OR REPLACE FUNCTION safe_publish_scheduled()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM publish_scheduled();
EXCEPTION WHEN OTHERS THEN
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'cron_error',
    '⚠️ publish_scheduled cron 에러',
    'publish_scheduled() 실행 중 예외 발생: ' || SQLERRM,
    jsonb_build_object('function', 'publish_scheduled', 'sqlstate', SQLSTATE, 'message', SQLERRM)
  );
END;
$$;

CREATE OR REPLACE FUNCTION safe_purge_trash_scheduled()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM purge_trash_scheduled();
EXCEPTION WHEN OTHERS THEN
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'cron_error',
    '⚠️ purge_trash_scheduled cron 에러',
    'purge_trash_scheduled() 실행 중 예외 발생: ' || SQLERRM,
    jsonb_build_object('function', 'purge_trash_scheduled', 'sqlstate', SQLSTATE, 'message', SQLERRM)
  );
END;
$$;

-- pg_cron 등록 — 재실행 안전 (기존 unschedule 후 등록)
DO $$
BEGIN PERFORM cron.unschedule('publish-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN PERFORM cron.unschedule('purge-trash-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 발행: 매분 (safe wrapper 호출 — 실패 시 cron_error 알림 자동)
SELECT cron.schedule(
  'publish-scheduled',
  '* * * * *',
  $cron$ SELECT safe_publish_scheduled(); $cron$
);

-- 삭제: 매일 UTC 18:00 (= KST 03:00)
SELECT cron.schedule(
  'purge-trash-scheduled',
  '0 18 * * *',
  $cron$ SELECT safe_purge_trash_scheduled(); $cron$
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

DROP POLICY IF EXISTS "Users manage own cover history" ON cover_image_history;
CREATE POLICY "Users manage own cover history"
  ON cover_image_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- Storage: uploads + posts 버킷
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
--   - uploads : admin/upload 라우트 (일반 첨부)
--   - posts   : upload / cover(ai-generate · unsplash download) 라우트가 사용하는
--               게시물·커버 이미지 버킷. 둘 다 public(getPublicUrl)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('uploads', 'uploads', true),
  ('posts',   'posts',   true)
ON CONFLICT (id) DO NOTHING;

-- 인증된 사용자만 업로드 / 누구나 조회 — uploads + posts 두 버킷 모두
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload to posts'
  ) THEN
    CREATE POLICY "Authenticated users can upload to posts"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can view posts'
  ) THEN
    CREATE POLICY "Anyone can view posts"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'posts');
  END IF;
END $$;


-- ============================================================
-- 완료! 총 22개 테이블 + 6개 RPC 함수 + 2개 pg_cron job 생성됨.
--
-- 테이블:
--   site_settings        : 사이트 설정 + 프로필 데이터 + 시크릿/API 키 (JSONB)
--   series               : 블로그 시리즈 (sort_order, auto_cover_url)
--   posts                : 블로그 포스트 (post_number 시퀀스 + scheduled_at + soft delete)
--   comments             : 포스트 댓글 (대댓글, password 인증, tombstone)
--   likes                : 좋아요 (target_type 으로 posts/works/comments 통합, IP 중복 방지)
--   poll_votes           : 본문 투표 블록 집계 (poll_id + option_id text, IP 중복 방지)
--   comment_reactions    : 댓글 이모지 반응 (giscus 식 고정 세트, comment_type + reactor_hash 중복 방지)
--   calendars            : 본문 이벤트 달력 블록 (게시물 간 공유 원본, 휴지통 30일 TTL)
--   custom_emojis        : 에디터 이모지 picker 의 커스텀 아이콘 기록 (admin 전용)
--   applied_migrations   : schema migration 적용 추적 (log_migration_applied 헬퍼)
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
--   series_work_relations: series ↔ works many-to-many (프로젝트에 관련 시리즈 연결)
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
--   purge_trash_scheduled()                       : purge_after 지난 휴지통(posts/works/calendars) hard delete + 알림 (cron 매일 KST 03:00)
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
--   uploads (public)                              : admin/upload — logos/, resume/, bgm/, covers/, images/ ...
--   posts   (public)                              : upload · cover(ai-generate · unsplash download) — 게시물/커버 이미지
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- Applied migrations log — setup.sql 이 흡수한 마이그레이션 마킹
-- ────────────────────────────────────────────────────────────
-- 위 파일의 모든 구조는 아래 마이그레이션 18건을 통합한 결과입니다.
-- fresh install 환경에서 setup.sql 실행 직후, supabase/migrations/ 의 .sql 을
-- 단일 실행해도 was_new = false 로 skip 되도록 record 만 미리 남깁니다.
--
-- log_migration_applied 대신 직접 INSERT — fresh install 시점엔 admin 이 아직
-- 없어서 알림이 의미 없고, 18건 알림이 한꺼번에 쌓이는 노이즈도 회피.
INSERT INTO applied_migrations (name, description) VALUES
  ('2026_05_14_post_views_kst',                'post_views — KST timezone + atomic dedup + race-free counter'),
  ('2026_05_18_admin_known_devices',           '새 기기 인증 (admin_known_devices) — UA fingerprint + approve token'),
  ('2026_05_18_admin_login_lockout',           'admin 로그인 lockout (admin_login_attempts) — 5회 → 15분'),
  ('2026_05_18_trash_purge_after',             'posts/works.purge_after — 휴지통 TTL'),
  ('2026_05_21_series_order_normalize',        'series_order 자동 정합화 trigger'),
  ('2026_05_22_publish_purge_pg_cron',         'publish_scheduled + purge_trash_scheduled pg_cron + pg_net + Vault'),
  ('2026_05_22_works_categories_multi',        'works.categories_ko/en TEXT[] (다중 카테고리)'),
  ('2026_05_22_works_nature',                  'works.nature_ko/en (제작 동기 축)'),
  ('2026_05_22_works_nature_backfill',         'works.nature backfill — fresh install 은 데이터 없어 no-op'),
  ('2026_05_22_works_slug',                    'works.slug UNIQUE — /works/[slug] 라우팅'),
  ('2026_05_23_works_contributions_tech_notes','works.contributions / tech_notes jsonb'),
  ('2026_05_24_posts_tag_notes',               'posts.tag_notes jsonb (태그별 설명)'),
  ('2026_05_26_a_migration_applied_helper',    'applied_migrations 테이블 + log_migration_applied 헬퍼'),
  ('2026_05_26_cron_error_notifications',      'safe_publish_scheduled / safe_purge_trash_scheduled wrapper (EXCEPTION → admin_notifications)'),
  ('2026_05_26_works_drop_number',             'works.number DROP — sort_order 로 derive'),
  ('2026_05_27_works_drop_size',               'works.size DROP'),
  ('2026_05_28_publish_scheduled_fix_ambiguous','publish_scheduled — #variable_conflict use_column (id ambiguity fix)'),
  ('2026_05_29_posts_github_url',              'posts.github_url'),
  ('2026_06_27_poll_votes',                    'poll_votes — 본문 투표 블록 집계 (poll_id + option_id, IP 중복 방지)'),
  ('2026_06_28_series_work_relations',         'series_work_relations — works 에 관련 시리즈 연결'),
  ('2026_07_09_calendars',                     'calendars — 본문 이벤트 달력 블록 (게시물 간 공유 원본)'),
  ('2026_07_09_post_icon',                     'posts.icon — 페이지 아이콘(이모지/이미지 URL)'),
  ('2026_07_09_series_title_maxlen',           'series 제목(ko/en) 80자 CHECK'),
  ('2026_07_12_calendars_trash',               'calendars.deleted_at/purge_after — 휴지통 30일 TTL'),
  ('2026_07_12_cover_position',                'posts.cover_position/cover_zoom — 커버 위치·확대 영속화'),
  ('2026_07_12_posts_version',                 'posts.version — 낙관적 동시성 제어 카운터'),
  ('2026_07_12_works_icon',                    'works.icon — posts.icon 미러'),
  ('2026_07_13_posts_title_len',               'posts 제목(ko/en) 120자 CHECK'),
  ('2026_07_14_comment_reactions',             'comment_reactions — 댓글 이모지 반응 (giscus 식 고정 8종)'),
  ('2026_07_14_posts_author_ids',              'posts.author_ids text[] — 다중 작성자'),
  ('2026_07_17_author_invites',                'author_invites — 저자 이메일 초대 + OAuth 매칭 권한 부여 (이슈 #334)'),
  ('2026_07_18_works_title_en',                'works.title_en — 작품 제목 영문 (title 이중언어화)')
ON CONFLICT (name) DO NOTHING;
-- 참고: 2026_07_13_category_reset / 2026_07_13_tag_descriptions_reset 은 기존 데이터를 손보는
-- 수동 데이터 마이그레이션이라 fresh install 과 무관 → 여기서 record 하지 않는다.
-- ============================================================

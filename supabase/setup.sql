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
--        - pg_cron  (예약 발행 · 휴지통 영구삭제 · 방문 IP 익명화 · service_logs · demo_usage 정리 cron)
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
--   2026_05_22  works.slug 인덱스 (비-unique, /works/[slug] 라우팅)
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
--   2026_07_21  about_erd_valid — About Studio ERD 설정 CHECK 제약
--   2026_07_23  about_erd_valid 확장 — 컬럼 제약·테이블 kind 검증
--   2026_08_02  settings_required — 설정 필수값 CHECK (제목·이름·테마색·giscus·멤버이름)
--   2026_08_03  site_visits — 트래픽 메타 (referrer/user_agent/device_kind/os/browser/device_model) + 인덱스
--   2026_08_05  revisions.entity_id uuid→text
--   2026_08_22  RLS 관리자 정책 — app_metadata(JWT) 기반 is_admin/is_owner/can_edit_post
--   2026_08_22  RLS 관리자 정책 확장(콘텐츠·중재·통계 15개 + owner 전용 2개)
--   2026_08_22  익명 직접 읽기 범위 축소 (댓글 민감 컬럼·좋아요 임의 삭제)
--   2026_08_22  "Authenticated users have full access" 포괄 정책 제거
--   2026_08_22  service 전용 정책을 service_role 로 한정
--   2026_08_25  service_role 전용 정책 제거 — service_role 은 RLS 를 우회하므로 무의미
--   2026_08_25  스토리지 직접 업로드 정책 제거 · posts/works 4단계 권한 정책 · 권한 클레임 파싱 강화
--               · anon 쓰기 회수 · can_edit_work 팀원 개방
--   2026_09_03  series_public_read 복구
--   2026_09_15  works.is_pinned/view_count/like_count
--   2026_09_21  works.gallery_notes — 갤러리 장마다의 음성
--   2026_09_27  traffic_excluded_ips + 방문 IP 90일 보관 pg_cron
--   2026_09_30  service_logs + 예약 작업 기록 · 휴지통 영구삭제에 calendars 포함
--   2026_10_09  content_translations(번역 캐시) · demo_usage(라이브 데모 하루 상한)
--   2026_10_11~12  content_translations.source_type — ui · site_ui · post_meta · work_meta · series_meta
--   2026_10_13  posts/works.auto_translation — 자동 번역 표식
--   2026_10_14~17  page_views 로 조회 기록 통일 · visitor_counts · 옛 site_visits/post_views/work_views 삭제
--   2026_10_18  content_translations.source_type — admin_text
--   2026_10_19  contact-attachments 버킷(문의 첨부, 비공개 25MB) · posts/works.source_lang + 원문 백업
--   2026_10_20  works.cover_position / cover_zoom — 작업물 커버 위치·확대 (posts 미러)
--   2026_08_25  스토리지 직접 업로드 정책 제거 (서버 검증 우회 차단)
--   2026_08_25  posts/works 정책을 4단계 권한 모델에 맞춤
--   2026_08_25  app_level/app_author_id 클레임 파싱 강화 — TS 와 SQL 이 같은 값을 같게 읽도록
--   2026_08_25  anon 역할 쓰기 권한 회수 (심층 방어)
--   2026_08_25  can_edit_work — 팀원으로 등록된 멤버에게 그 작업물만 개방
--   2026_09_03  series_public_read — 방문자가 공개 시리즈를 읽도록 복구
--   2026_09_15  works.is_pinned/view_count/like_count + work_views + record_work_view
--   2026_09_21  works.gallery_notes — 갤러리 장마다의 음성
--   2026_09_25  site_visits — 분석 컬럼 (country/path/utm_*)
--   2026_09_27  traffic_excluded_ips + anonymize_old_site_visits (방문 IP 90일 보관) + pg_cron
--   2026_09_30  service_logs + 예약 작업 기록(_log_cron) + 90일 보관 pg_cron
--   2026_09_30  purge_trash_scheduled 에 calendars 포함 (운영 DB 를 setup 과 같은 범위로)
--   2026_10_09  content_translations — 상세 화면 다른 언어 번역 캐시
--   2026_10_09  demo_usage — About 라이브 데모 하루 상한(demo_take/refund/remaining) + 7일 보관 pg_cron
--   2026_10_11  content_translations.source_type 에 ui — 본문 안 라벨 번역 캐시(언어마다 한 줄)
--   2026_10_12  content_translations.source_type 에 site_ui · post_meta · work_meta · series_meta — 사이트 전체 번역 캐시
--   2026_10_14  page_views — 페이지 조회 기록(30분 중복 제거) + 머문 시간 + 집계 RPC, IP 90일 보관에 포함
--   2026_10_15  page_views 로 조회 기록 통일 1단계 — 방문 정보 · 방문자 칸, 옛 기록 복사, 글/작업물 view_count 도 record_page_view 에서
--   2026_10_16  visitor_counts — 오늘 · 전체 방문자 수(푸터 · 대시보드 같은 기준)
--   2026_10_17  page_views 로 조회 기록 통일 2단계 — site_visits · post_views · work_views 와 옛 조회 함수 삭제
--   2026_10_19  posts · works.source_lang · content_translations 원문 백업(post_source · work_source · settings_source) — 기본 언어를 바꾸면 원문을 번역해 덮어쓴다
--
-- 권한 모델 요약 (owner / admin / author / visitor):
--   owner   app_role() = 'owner'                 전부
--   admin   app_level() >= 2                     콘텐츠·중재·통계 전부 (설정 일부는 owner 전용)
--   author  app_role() = 'author'                자기 글(author_ids) · 자기 작업물(team_members)
--   visitor 로그인 없음                            공개된 것만 읽기
--   판정 함수: app_role / app_level / app_author_id → is_owner / is_admin / is_member
--             / can_edit_post(author_ids) / can_edit_work(team_members)
--
-- 마이그레이션 파일이 없는 것 (setup.sql 에만 존재):
--   custom_emojis — 에디터 이모지 picker 의 커스텀 아이콘 기록
--
-- 흡수하지 않은 것 (일회성 데이터 리셋 — 스키마 변경 아님, fresh install 엔 리셋할 데이터가 없어 무의미):
--   2026_07_13_category_reset, 2026_07_13_tag_descriptions_reset
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
/* site_settings 공개 SELECT 제거 — 개인정보/설정이 담겨 있고, 조회는 모두 서버에서 한다. */

-- service_role 은 BYPASSRLS 라 정책 없이 통과한다 — 별도 정책을 두지 않는다.
-- (authenticated 용 규칙은 아래 등급별 정책 블록의 site_settings_owner_all 이 담당)


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
  -- 원문 칸(title · content · excerpt)이 쓰인 언어(#1425) — 비어 있으면 ko. 기본 언어가 바뀌면 편집 화면에서 번역해 덮어쓴다
  source_lang  text,
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
  -- 자동 번역 표식 (src/lib/api/autoTranslationMark.ts)
  auto_translation jsonb,
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

-- ────────────────────────────────────────────────────────────
-- JWT(app_metadata) 기반 권한 헬퍼 — RLS 정책이 요청자의 역할을 직접 판정한다.
--   지금까지 관리자 접근은 service_role 로 RLS 를 우회하고 API 코드가 검문했다.
--   코드가 검문을 빠뜨리면 그대로 새므로(실제로 ?all=true 로 비공개 글이 노출된 적 있음),
--   데이터베이스가 마지막 방어선이 되도록 정책에 판정을 옮긴다.
--   주의: 정책은 JWT 클레임만 본다 → 권한 변경은 토큰이 갱신되어야 반영된다
--         (권한 변경 시 Realtime broadcast 로 대상 세션을 새로 고친다).
--   주의: SQL 은 OWNER_EMAIL env 를 못 읽는다. 최초 로그인의 ensureOwnerRole 이
--         app_metadata.role='owner' 를 박은 뒤부터 정책도 owner 를 인식한다.
-- ────────────────────────────────────────────────────────────
--   2단계 인증(aal2) 세션의 클레임만 인정한다 — 비밀번호만으로 만든 aal1 세션은 공개 정책만 받는다(2026_10_22_rls_require_aal2).
CREATE OR REPLACE FUNCTION app_claims() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN auth.jwt() ->> 'aal' = 'aal2'
              THEN coalesce(auth.jwt() -> 'app_metadata', '{}'::jsonb)
              ELSE '{}'::jsonb END;
$$;
CREATE OR REPLACE FUNCTION app_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(app_claims() ->> 'role', '');
$$;
CREATE OR REPLACE FUNCTION app_level() RETURNS int LANGUAGE sql STABLE AS $$
  SELECT CASE jsonb_typeof(claim)
           WHEN 'number' THEN
             /* 여기까지 왔으면 숫자가 확실하다 — 중첩 CASE 라야 타입 가드가 먼저 평가된다.
                한 WHEN 안에서 AND 로 늘어놓으면 Postgres 가 순서를 바꿀 수 있고,
                그러면 문자열 클레임에 ::numeric 이 먼저 걸려 캐스트 에러가 난다. */
             CASE WHEN n = trunc(n) AND n BETWEEN 1 AND 2 THEN n::int ELSE 0 END
           ELSE 0
         END
  FROM (SELECT app_claims() -> 'permission_level' AS claim) s,
  LATERAL (SELECT CASE WHEN jsonb_typeof(claim) = 'number'
                       THEN (claim #>> '{}')::numeric END AS n) t;
$$;
CREATE OR REPLACE FUNCTION app_author_id() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN jsonb_typeof(claim) = 'string' THEN claim #>> '{}' END
  FROM (SELECT app_claims() -> 'author_id' AS claim) s;
$$;
/* 권한 4단계 — owner / admin(level>=2) / author(level 1) / visitor(로그인 없음).
   is_admin 을 role IN ('owner','author') 로 두면 자기 글만 쓰는 저자까지 관리자가 된다. */
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app_role() = 'owner' OR app_level() >= 2;
$$;
/* 로그인한 구성원 전부 — 자기 글 작업에 필요한 테이블용. */
CREATE OR REPLACE FUNCTION is_member() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app_role() IN ('owner', 'author');
$$;
CREATE OR REPLACE FUNCTION is_owner() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app_role() = 'owner';
$$;
/* TS 의 canEditPost 와 같은 규칙 — owner/editor 는 전부, author 는 자기 글만. */
CREATE OR REPLACE FUNCTION can_edit_post(target_author_ids text[])
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT is_owner()
      OR app_level() >= 2
      OR (app_role() = 'author'
          AND app_author_id() IS NOT NULL
          AND app_author_id() = ANY (coalesce(target_author_ids, '{}')));
$$;

/* 이 작업물을 수정할 수 있는가 — TS 의 canEditWork 와 같은 규칙.
   works 에는 author_ids 가 없어 팀원 목록으로 소유권을 표현한다.
   관리자는 전부, 그 밖에는 team_members 에 자신의 저자 프로필이 들어 있을 때만.
   중첩 CASE 라야 타입 확인이 먼저 평가된다 — AND 는 평가 순서를 보장하지 않아
   배열이 아닌 값에 jsonb_array_elements 가 걸리면 statement 가 죽는다. */
CREATE OR REPLACE FUNCTION can_edit_work(target_team_members jsonb)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT CASE
           WHEN is_admin() THEN true
           WHEN app_author_id() IS NULL THEN false
           ELSE CASE jsonb_typeof(target_team_members)
                  WHEN 'array' THEN EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(target_team_members) AS m
                    WHERE m ->> 'author_id' = app_author_id()
                  )
                  ELSE false
                END
         END;
$$;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 공개된 포스트만 읽기
DROP POLICY IF EXISTS "posts_public_read" ON posts;
CREATE POLICY "posts_public_read"
  ON posts FOR SELECT
  USING (published = true AND deleted_at IS NULL);

-- service_role 전체 접근

-- 관리자 정책 — 세션 클라이언트로도 초안·휴지통을 다룰 수 있게 한다.
-- 편집·삭제는 소유권까지 확인한다(author 는 자기 글만).
DROP POLICY IF EXISTS "posts_admin_select" ON posts;
CREATE POLICY "posts_admin_select" ON posts FOR SELECT TO authenticated USING (can_edit_post(author_ids));

DROP POLICY IF EXISTS "posts_admin_insert" ON posts;
CREATE POLICY "posts_admin_insert" ON posts FOR INSERT TO authenticated WITH CHECK (is_member());

DROP POLICY IF EXISTS "posts_admin_update" ON posts;
CREATE POLICY "posts_admin_update" ON posts FOR UPDATE TO authenticated
  USING (can_edit_post(author_ids)) WITH CHECK (can_edit_post(author_ids));

DROP POLICY IF EXISTS "posts_admin_delete" ON posts;
CREATE POLICY "posts_admin_delete" ON posts FOR DELETE TO authenticated USING (can_edit_post(author_ids));


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
/* comments 공개 SELECT 제거 — 테이블 직접 조회는 API 의 tombstone 처리를 건너뛰어
   삭제된 본문·password_hash·notify_email 이 그대로 노출된다. 댓글 조회는 서버에서만 한다. */

-- 누구나 댓글 작성 가능 (비회원 댓글 지원)

-- service_role 전체 접근 (관리자 삭제 등)


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
/* likes 공개 SELECT 제거 — 개인정보/설정이 담겨 있고, 조회는 모두 서버에서 한다. */

-- service_role 전체 접근


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
/* poll_votes 공개 SELECT 제거 — 개인정보/설정이 담겨 있고, 조회는 모두 서버에서 한다. */


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
/* comment_reactions 공개 SELECT 제거 — 개인정보/설정이 담겨 있고, 조회는 모두 서버에서 한다. */

-- service_role 전체 접근 (반응 토글은 admin client 로 처리)


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
  USING (deleted_at IS NULL);


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
  -- 커버 세로 위치 %(0~100) · 확대 배율(1~2.5) — 편집기 위치 조정, 상세 커버에 반영
  cover_position   real NOT NULL DEFAULT 50,
  cover_zoom       real NOT NULL DEFAULT 1,
  -- Flow 레이아웃 카드 사이즈는 sort_order 에서 cycle derive — 별도 컬럼 없음 (single source of truth)
  content_ko       text NOT NULL DEFAULT '',
  content_en       text NOT NULL DEFAULT '',
  -- 자동 번역 표식 (src/lib/api/autoTranslationMark.ts)
  auto_translation jsonb,
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
  gallery_notes    jsonb NOT NULL DEFAULT '{}'::jsonb, -- 갤러리 장마다의 음성(그림 주소 → 대본·음성 파일)
  live_url         text DEFAULT '',
  github_url       text DEFAULT '',
  published        boolean NOT NULL DEFAULT false,
  sort_order       int NOT NULL DEFAULT 0,
  -- 홈 Selected Works 랭킹 신호 (posts 와 동형) — 핀 · 조회수 · 좋아요
  is_pinned        boolean NOT NULL DEFAULT false,
  view_count       int NOT NULL DEFAULT 0,
  like_count       int NOT NULL DEFAULT 0,
  -- AI 요약
  summary_ko       text NOT NULL DEFAULT '',
  summary_en       text NOT NULL DEFAULT '',
  source_lang      text,                       -- 원문 칸(ko)이 쓰인 언어(#1425) — 비어 있으면 ko
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  deleted_at       timestamptz DEFAULT NULL,
  -- 휴지통 자동 영구삭제 (TTL)
  purge_after      timestamptz DEFAULT NULL,
  -- 예약 발행: NULL=즉시, 미래 시간 설정 시 cron이 published=true 로 flip
  scheduled_at     timestamptz DEFAULT NULL
);

COMMENT ON COLUMN works.gallery_notes IS
  '갤러리 장마다의 음성 — 그림 주소 → { script, audio, audioSource, audioScript }';

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

-- 관리자 정책 — works 에는 author_ids 가 없다. 대신 팀원 목록(team_members)에 연결된
-- 저자 프로필로 소유권을 표현한다: 프로젝트 팀원이면 그 작업물의 편집자다.
-- 조회는 멤버 전체, 수정은 관리자 또는 팀원, 생성·삭제는 관리자.
-- (TS 의 canEditWork 가 같은 규칙을 쓴다)
DROP POLICY IF EXISTS "works_admin_select" ON works;
CREATE POLICY "works_admin_select" ON works FOR SELECT TO authenticated USING (is_member());

DROP POLICY IF EXISTS "works_admin_write" ON works;

DROP POLICY IF EXISTS "works_admin_insert" ON works;
CREATE POLICY "works_admin_insert" ON works FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "works_admin_update" ON works;
CREATE POLICY "works_admin_update" ON works FOR UPDATE TO authenticated
  USING (can_edit_work(team_members)) WITH CHECK (can_edit_work(team_members));

DROP POLICY IF EXISTS "works_admin_delete" ON works;
CREATE POLICY "works_admin_delete" ON works FOR DELETE TO authenticated USING (is_admin());


-- ────────────────────────────────────────────────────────────
-- 7. page_views — 사이트의 조회 기록 (#1399)
--    페이지가 보일 때마다 한 행(같은 IP · 경로 30분 안은 한 번). 방문 · 방문자 · 유입 · 기기 · 국가 · UTM ·
--    페이지 조회수 · 머문 시간 · 글/작업물 조회수(view_count)가 전부 이 기록에서 나온다.
--    방문(세션) = session_id(30분 무활동이면 새로), 방문의 첫 조회 = is_landing — 유입 · 기기 · 국가 · UTM 은 그 줄에만.
--    방문자 = visitor_id(브라우저의 임의 값, 신규 · 재방문). 봇은 device_kind 'bot' 으로 남기고 집계에서 뺀다.
--    IP 는 90일 뒤 NULL. service_role 전용.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.page_views (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path          text,               -- 옛 방문 기록에서 옮긴 줄 중 랜딩 경로를 모르는 것은 NULL
  ip            text,
  session_id    text,
  visitor_id    text,
  is_landing    boolean NOT NULL DEFAULT false,
  viewed_at     timestamptz NOT NULL DEFAULT now(),
  viewed_date   date GENERATED ALWAYS AS ((viewed_at AT TIME ZONE 'Asia/Seoul')::date) STORED,
  duration_ms   integer,
  device_kind   text,               -- desktop / mobile / tablet / bot (모든 줄)
  -- 방문 정보 (첫 조회 줄에만)
  referrer      text,
  user_agent    text,
  os            text,
  browser       text,
  device_model  text,
  country       text,               -- Vercel x-vercel-ip-country (ISO 3166-1 alpha-2)
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  migrated_from text                -- 옛 테이블(site_visits · post_views · work_views)에서 옮긴 줄의 출처. 새 기록은 NULL
);

-- 일별 · 기간 집계
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_date ON public.page_views (viewed_date DESC);
-- 30분 중복 확인
CREATE INDEX IF NOT EXISTS idx_page_views_ip_path_at ON public.page_views (ip, path, viewed_at DESC);
-- 방문의 첫 조회 확인 · 세션 집계
CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.page_views (session_id);
-- 방문 · 유입 · 기기 집계는 첫 조회 줄만 본다
CREATE INDEX IF NOT EXISTS idx_page_views_landing_date ON public.page_views (viewed_date DESC) WHERE is_landing;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.page_views FROM anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 7-3. traffic_excluded_ips — 운영자가 '내 IP' 로 지정한 IP (#1169)
--      이 IP 의 방문은 기록하지 않고, 이미 쌓인 방문도 트래픽 집계에서 뺀다.
--      서버(service_role)만 읽고 쓴다 — RLS 켜고 정책은 두지 않는다.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS traffic_excluded_ips (
  ip         text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE traffic_excluded_ips ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON traffic_excluded_ips FROM anon, authenticated;


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
/* work_comments 공개 SELECT 제거 — comments 와 같은 이유. */


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


-- ────────────────────────────────────────────────────────────
-- 9-b. applied_migrations — schema migration 적용 추적 + 알림
--      (각 migration 파일 마지막에 SELECT log_migration_applied('name', 'desc'); 호출)
--      재실행 안전 (ON CONFLICT DO NOTHING). 처음 적용 시에만 admin_notifications insert.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applied_migrations (
  name        text PRIMARY KEY,
  description text NOT NULL DEFAULT '',
  applied_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE applied_migrations ENABLE ROW LEVEL SECURITY;


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
-- 9-c. service_logs — AI·외부 서비스·메일·GitHub·예약 작업의 성공/실패 기록
--      category: ai(AI·이미지 검색·TTS) · mail(Resend) · github · cron(예약 작업) · contact(문의 폼 첨부)
--      provider: 공급자나 작업 이름 (gemini, resend, publish-scheduled …)
--      서버(service_role)만 읽고 쓴다 — RLS 켜고 정책은 두지 않는다. 화면은 /api/admin/ai-log(owner).
--      보관 90일 — purge_old_service_logs 를 pg_cron 이 매일 지운다 (아래 예약 작업 섹션).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_logs (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at        timestamptz NOT NULL DEFAULT now(),
  category  text NOT NULL CHECK (category IN ('ai', 'mail', 'github', 'cron', 'contact')),
  provider  text NOT NULL,
  ok        boolean NOT NULL,
  kind      text,
  status    int,
  message   text,
  units     int,
  meta      jsonb
);

CREATE INDEX IF NOT EXISTS service_logs_at_idx ON service_logs (at DESC);
CREATE INDEX IF NOT EXISTS service_logs_category_at_idx ON service_logs (category, at DESC);

ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON service_logs FROM anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 9-d. content_translations — 글·작업물 상세의 "다른 언어로 읽기" 번역 캐시
--      ko · en 은 posts/works 의 칸에 두고, 그 밖의 언어(lib/translationLanguages)만 여기에 한 줄씩.
--      source_hash 는 번역에 쓴 원문의 해시 — 원문이 바뀌면 다음 요청이 다시 번역한다.
--      source_id 는 posts/works 두 표를 가리켜 외래 키를 두지 않는다.
--      서버(service_role)만 읽고 쓴다 — RLS 켜고 정책은 두지 않는다. 공개 API 는 /api/content-translate.
--      source_type 'ui' 는 본문 안 라벨(코드 블록 단추 · 투표 …) — 글마다 같아 언어마다 한 줄,
--      source_id 는 고정값(00000000-…). 원문은 영어 라벨(src/lib/bodyLabels).
--      source_type 'site_ui' 는 방문자 화면 글(locales/en.json) 전체 — 언어마다 한 줄, source_id 고정값.
--      'post_meta' · 'work_meta' · 'series_meta' 는 목록 카드의 짧은 칸(제목 · 요약 …)만 — 본문은 넣지 않는다.
--      공개 API 는 /api/site-translate/ui · /api/site-translate/items.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_translations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('post', 'work', 'ui', 'site_ui', 'post_meta', 'work_meta', 'series_meta', 'admin_text', 'post_source', 'work_source', 'settings_source')),
  source_id   uuid NOT NULL,
  lang        text NOT NULL,
  fields      jsonb NOT NULL DEFAULT '{}',
  source_hash text NOT NULL,
  provider    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, lang)
);

ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_translations FROM anon, authenticated;
-- 9-e. demo_usage — About 라이브 데모(번역 · 요약 · 커버 · 음성)의 하루 사용 횟수
--      IP(HMAC 해시)마다 perIp 번 + 사이트 전체 total 번. 날짜는 UTC. 상한 값은 앱이 넘긴다(src/lib/demo/quota.ts).
--      서버리스 인스턴스마다 메모리가 따로라 DB 에 센다. 서버(service_role)만 쓴다 — RLS 켜고 정책 없음.
--      demo_take 가 두 상한을 보고 한 번 쓰고, 공급자가 모두 실패하면 demo_refund 로 돌려준다.
--      같은 기능 · 같은 날의 요청은 advisory lock 으로 줄을 세운다(합계를 읽고 더하는 사이 끼어들기 방지).
--      보관 7일 — purge_old_demo_usage 를 pg_cron 이 매일 지운다 (아래 예약 작업 섹션).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demo_usage (
  day      date NOT NULL,
  feature  text NOT NULL CHECK (feature IN ('translate', 'summary', 'cover', 'speech')),
  ip_hash  text NOT NULL,
  count    int  NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (day, feature, ip_hash)
);

ALTER TABLE demo_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON demo_usage FROM anon, authenticated;

-- 두 상한을 따로 보고 한 번 쓴다. 남은 횟수, 넘었으면 -1 (상한이 0 이하면 꺼 둔 기능)
CREATE OR REPLACE FUNCTION public.demo_take(p_feature text, p_ip_hash text, p_per_ip int, p_total int)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day   date := (now() AT TIME ZONE 'UTC')::date;
  v_mine  int;
  v_total int;
BEGIN
  IF p_per_ip IS NULL OR p_total IS NULL THEN
    RETURN -1;
  END IF;
  IF p_per_ip <= 0 OR p_total <= 0 THEN
    RETURN -1;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('demo_usage:' || p_feature || ':' || v_day::text));

  SELECT COALESCE(SUM(count), 0) INTO v_total FROM public.demo_usage WHERE day = v_day AND feature = p_feature;
  SELECT COALESCE(MAX(count), 0) INTO v_mine FROM public.demo_usage WHERE day = v_day AND feature = p_feature AND ip_hash = p_ip_hash;

  IF v_mine >= p_per_ip THEN
    RETURN -1;
  END IF;
  IF v_total >= p_total THEN
    RETURN -1;
  END IF;

  INSERT INTO public.demo_usage (day, feature, ip_hash, count)
  VALUES (v_day, p_feature, p_ip_hash, 1)
  ON CONFLICT (day, feature, ip_hash) DO UPDATE SET count = public.demo_usage.count + 1;

  RETURN LEAST(p_per_ip - (v_mine + 1), p_total - (v_total + 1));
END;
$$;

-- 공급자가 모두 실패했을 때 한 번 돌려준다. 남은 횟수
CREATE OR REPLACE FUNCTION public.demo_refund(p_feature text, p_ip_hash text, p_per_ip int, p_total int)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('demo_usage:' || p_feature || ':' || v_day::text));
  UPDATE public.demo_usage SET count = count - 1
  WHERE day = v_day AND feature = p_feature AND ip_hash = p_ip_hash AND count > 0;
  RETURN public.demo_remaining(p_feature, p_ip_hash, p_per_ip, p_total);
END;
$$;

-- 지금 남은 횟수(쓰지 않음)
CREATE OR REPLACE FUNCTION public.demo_remaining(p_feature text, p_ip_hash text, p_per_ip int, p_total int)
RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day   date := (now() AT TIME ZONE 'UTC')::date;
  v_mine  int;
  v_total int;
BEGIN
  SELECT COALESCE(SUM(count), 0) INTO v_total FROM public.demo_usage WHERE day = v_day AND feature = p_feature;
  SELECT COALESCE(MAX(count), 0) INTO v_mine FROM public.demo_usage WHERE day = v_day AND feature = p_feature AND ip_hash = p_ip_hash;
  RETURN GREATEST(0, LEAST(COALESCE(p_per_ip, 0) - v_mine, COALESCE(p_total, 0) - v_total));
END;
$$;

REVOKE ALL ON FUNCTION public.demo_take(text, text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demo_refund(text, text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demo_remaining(text, text, int, int) FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 9-f. rate_limits — 공유 속도 제한(댓글 · 좋아요 · 투표 · 공개 번역 · 문의 · AI 요약 · 댓글 비밀번호 · 알림 메일).
--      서버리스 인스턴스마다 메모리가 따로라 DB 에서 (bucket, key, 시간 창) 횟수를 원자적으로 센다.
--      key 는 앱이 만든 HMAC 해시(src/lib/api/rateLimit.ts). 서버(service_role)만 쓴다. 지난 창은 pg_cron 이 매일 지운다.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket       text        NOT NULL,
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        int         NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

-- 한 번 세고 허용 여부를 돌려준다(창 안 횟수가 p_max 이하면 true). 창은 p_window_seconds 단위로 끊는다
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_bucket text, p_key text, p_window_seconds int, p_max int)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window timestamptz;
  v_count  int;
BEGIN
  IF p_window_seconds IS NULL OR p_window_seconds <= 0 OR p_max IS NULL OR p_max <= 0 THEN
    RETURN false;
  END IF;
  v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  INSERT INTO public.rate_limits AS r (bucket, key, window_start, count)
  VALUES (p_bucket, p_key, v_window, 1)
  ON CONFLICT (bucket, key, window_start) DO UPDATE SET count = r.count + 1
  RETURNING r.count INTO v_count;
  RETURN v_count <= p_max;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_hit(text, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, text, int, int) TO service_role;

-- 지난 창 정리 — 가장 긴 창(하루)보다 넉넉히 2일
CREATE OR REPLACE FUNCTION public.purge_old_rate_limits()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_deleted int;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '2 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_old_rate_limits() FROM PUBLIC, anon, authenticated;


GRANT EXECUTE ON FUNCTION public.demo_take(text, text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.demo_refund(text, text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.demo_remaining(text, text, int, int) TO service_role;


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


-- ────────────────────────────────────────────────────────────
-- 11. revisions — 에디터 리비전 히스토리 (posts + works 공용)
--     entity_type: 'post' | 'work'
--     entity_id: 대상 posts.id 또는 works.id (uuid), 또는 저장 전 새 글의 draft sentinel
--                ("draft-new-post" / "draft-new-work") → 그래서 uuid 가 아니라 text.
--     snapshot: 전체 form 데이터 (JSONB)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revisions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('post', 'work')),
  entity_id   text NOT NULL,
  snapshot    jsonb NOT NULL DEFAULT '{}',
  title       text NOT NULL DEFAULT '',
  dismissed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revisions_entity
  ON revisions (entity_type, entity_id, created_at DESC);

ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;


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

-- 누구나 읽기 가능 (공개 detail 페이지에서 사용) — 양쪽 모두 공개된 연결만(비공개 글 · 작업물 id 가 드러나지 않게)
DROP POLICY IF EXISTS "post_work_relations_public_read" ON post_work_relations;
CREATE POLICY "post_work_relations_public_read"
  ON post_work_relations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.published AND p.deleted_at IS NULL)
    AND EXISTS (SELECT 1 FROM works w WHERE w.id = work_id AND w.published AND w.deleted_at IS NULL)
  );


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
  USING (
    EXISTS (SELECT 1 FROM series s WHERE s.id = series_id AND s.published)
    AND EXISTS (SELECT 1 FROM works w WHERE w.id = work_id AND w.published AND w.deleted_at IS NULL)
  );


-- ────────────────────────────────────────────────────────────
-- RPC 함수
-- ────────────────────────────────────────────────────────────

-- 페이지 조회 (#1399) — 사이트의 조회 기록 하나. 30분 중복 제거 기록(글 · 작업물 view_count 도 여기서 +1) · 머문 시간 · 집계. 모두 service_role 전용
-- 조회 기록 — 반환: 조회 id · 새로 셌는가 · 방문의 첫 조회인가
CREATE OR REPLACE FUNCTION public.record_page_view(
  p_path text, p_ip text, p_session text, p_visitor text, p_meta jsonb DEFAULT '{}'
)
RETURNS TABLE(view_id uuid, created boolean, landing boolean)
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_landing boolean;
  v_bot boolean := COALESCE(p_meta->>'device_kind', '') = 'bot';
  v_slug text;
BEGIN
  -- 같은 IP · 경로의 동시 요청이 둘 다 새 행을 만들지 않게 줄 세운다
  PERFORM pg_advisory_xact_lock(hashtext('page_view:' || COALESCE(p_ip, '') || ':' || COALESCE(p_path, '')));

  SELECT pv.id INTO v_id
    FROM page_views pv
   WHERE pv.ip = p_ip AND pv.path = p_path AND pv.viewed_at > now() - interval '30 minutes'
   ORDER BY pv.viewed_at DESC
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, false, false;
    RETURN;
  END IF;

  v_landing := p_session IS NULL OR NOT EXISTS (SELECT 1 FROM page_views pv WHERE pv.session_id = p_session);

  INSERT INTO page_views (
    path, ip, session_id, visitor_id, is_landing, device_kind,
    referrer, user_agent, os, browser, device_model, country, utm_source, utm_medium, utm_campaign
  )
  VALUES (
    p_path, p_ip, p_session, p_visitor, v_landing, p_meta->>'device_kind',
    CASE WHEN v_landing THEN p_meta->>'referrer' END,
    CASE WHEN v_landing THEN p_meta->>'user_agent' END,
    CASE WHEN v_landing THEN p_meta->>'os' END,
    CASE WHEN v_landing THEN p_meta->>'browser' END,
    CASE WHEN v_landing THEN p_meta->>'device_model' END,
    CASE WHEN v_landing THEN p_meta->>'country' END,
    CASE WHEN v_landing THEN p_meta->>'utm_source' END,
    CASE WHEN v_landing THEN p_meta->>'utm_medium' END,
    CASE WHEN v_landing THEN p_meta->>'utm_campaign' END
  )
  RETURNING page_views.id INTO v_id;

  -- 글 · 작업물 조회수(목록 정렬 · 표시용 카운터) — 상세 경로의 새 조회일 때만
  IF NOT v_bot AND p_path ~ '^/(posts|works)/[^/]+$' THEN
    v_slug := split_part(p_path, '/', 3);
    IF p_path LIKE '/posts/%' THEN
      UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE slug = v_slug AND deleted_at IS NULL;
    ELSE
      UPDATE works SET view_count = COALESCE(view_count, 0) + 1 WHERE slug = v_slug AND deleted_at IS NULL;
    END IF;
  END IF;

  RETURN QUERY SELECT v_id, true, v_landing;
END;
$$;

-- 머문 시간 더하기 — 같은 IP 가 하루 안에 보낸 것만 받는다(남의 조회 id 로 시간을 부풀리지 못하게)
CREATE OR REPLACE FUNCTION public.record_page_duration(p_id uuid, p_ip text, p_ms integer)
RETURNS void
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  UPDATE page_views
     SET duration_ms = LEAST(COALESCE(duration_ms, 0) + GREATEST(p_ms, 0), 7200000)
   WHERE id = p_id
     AND ip IS NOT DISTINCT FROM p_ip
     AND viewed_at > now() - interval '1 day';
$$;

-- 집계 — 봇 줄은 모두 뺀다
CREATE OR REPLACE FUNCTION public.daily_page_views(p_start date, p_end date, p_excluded text[] DEFAULT '{}')
RETURNS TABLE(day date, views bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT viewed_date AS day, COUNT(*)::bigint AS views
    FROM page_views
   WHERE viewed_date >= p_start AND viewed_date <= p_end
     AND (device_kind IS NULL OR device_kind <> 'bot')
     AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))))
   GROUP BY viewed_date
   ORDER BY viewed_date ASC;
$$;

CREATE OR REPLACE FUNCTION public.page_view_totals(p_excluded text[] DEFAULT '{}')
RETURNS TABLE(total bigint, since date)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint AS total, MIN(viewed_date) AS since
    FROM page_views
   WHERE (device_kind IS NULL OR device_kind <> 'bot')
     AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))));
$$;

CREATE OR REPLACE FUNCTION public.page_view_stats(p_start date, p_end date, p_excluded text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH v AS (
    SELECT path, session_id, duration_ms
      FROM page_views
     WHERE viewed_date >= p_start AND viewed_date <= p_end
       AND (device_kind IS NULL OR device_kind <> 'bot')
       AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))))
  ), s AS (
    SELECT session_id, COUNT(*) AS n, SUM(COALESCE(duration_ms, 0)) AS ms
      FROM v
     WHERE session_id IS NOT NULL
     GROUP BY session_id
  ), p AS (
    SELECT path, COUNT(*) AS views, ROUND(AVG(duration_ms) FILTER (WHERE duration_ms > 0))::bigint AS avg_ms
      FROM v
     WHERE path IS NOT NULL
     GROUP BY path
     ORDER BY views DESC, path
     LIMIT 20
  )
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM v),
    'avg_duration_ms', (SELECT ROUND(AVG(duration_ms))::bigint FROM v WHERE duration_ms > 0),
    'sessions', (SELECT COUNT(*) FROM s),
    'pages_per_session', (SELECT ROUND(AVG(n)::numeric, 1) FROM s),
    'avg_session_ms', (SELECT ROUND(AVG(ms) FILTER (WHERE ms > 0))::bigint FROM s),
    'top_paths', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('path', path, 'views', views, 'avg_ms', avg_ms) ORDER BY views DESC, path) FROM p),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.record_page_view(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_page_duration(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.daily_page_views(date, date, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.page_view_totals(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.page_view_stats(date, date, text[]) FROM PUBLIC, anon, authenticated;

-- 오늘 · 전체 방문자 수 — 푸터 · 대시보드 맨 위 숫자(방문의 첫 조회의 visitor_id, 옛 기록은 IP)
CREATE OR REPLACE FUNCTION public.visitor_counts(p_today date, p_excluded text[] DEFAULT '{}')
RETURNS TABLE(today bigint, total bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT COALESCE(visitor_id, ip)) FILTER (WHERE viewed_date = p_today) AS today,
         COUNT(DISTINCT COALESCE(visitor_id, ip)) AS total
    FROM page_views
   WHERE is_landing
     AND (device_kind IS NULL OR device_kind <> 'bot')
     AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))));
$$;

REVOKE ALL ON FUNCTION public.visitor_counts(date, text[]) FROM PUBLIC, anon, authenticated;

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
-- 매일 03:30 KST 방문 IP 익명화, 03:40 KST service_logs 90일 정리, 03:45 KST demo_usage 7일 정리.
-- 각 작업 결과는 _log_cron 이 service_logs(category='cron') 에 남긴다.
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

-- 예약 작업 기록 — service_logs(category='cron') 한 줄. 기록 실패가 작업을 막지 않는다.
CREATE OR REPLACE FUNCTION public._log_cron(job text, ok boolean, n int, msg text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.service_logs (category, provider, ok, kind, units, message)
  VALUES ('cron', job, ok, CASE WHEN ok THEN NULL ELSE 'server' END, n, msg);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._log_cron(text, boolean, int, text) FROM PUBLIC, anon, authenticated;

-- safe_* wrapper — cron 실행 결과를 service_logs 에 남기고, 실패 시 admin_notifications(type='cron_error') insert.
-- 원본 함수가 throw 하면 cron 이 silent 실패하므로 관리자 알 길 없음 → wrapper 가 catch
-- publish-scheduled 는 매분 돌아서 실제로 발행했거나 실패했을 때만 남긴다 (하루 1,440줄 방지).
CREATE OR REPLACE FUNCTION safe_publish_scheduled()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM publish_scheduled();
  IF n > 0 THEN
    PERFORM public._log_cron('publish-scheduled', true, n);
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM public._log_cron('publish-scheduled', false, NULL, SQLERRM);
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
DECLARE
  n int;
BEGIN
  n := purge_trash_scheduled();
  PERFORM public._log_cron('purge-trash-scheduled', true, n);
EXCEPTION WHEN OTHERS THEN
  PERFORM public._log_cron('purge-trash-scheduled', false, NULL, SQLERRM);
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'cron_error',
    '⚠️ purge_trash_scheduled cron 에러',
    'purge_trash_scheduled() 실행 중 예외 발생: ' || SQLERRM,
    jsonb_build_object('function', 'purge_trash_scheduled', 'sqlstate', SQLSTATE, 'message', SQLERRM)
  );
END;
$$;

-- 위 SECURITY DEFINER 함수들은 pg_cron(소유자) · service_role 만 부른다 — anon · authenticated 실행 권한을 거둔다.
-- 거두지 않으면 PostgREST(/rest/v1/rpc)로 공개 anon 키만으로 실행된다(_get_vault_secret 은 Vault 비밀값을 그대로 돌려준다).
-- 2026_10_21_revoke_definer_functions.sql 과 같다
REVOKE ALL ON FUNCTION public._get_vault_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._send_admin_email(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_migration_applied(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_scheduled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_trash_scheduled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.safe_publish_scheduled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.safe_purge_trash_scheduled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_scheduled() TO service_role;
ALTER FUNCTION public._get_vault_secret(text) SET search_path = public, pg_temp;
ALTER FUNCTION public._send_admin_email(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_migration_applied(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.publish_scheduled() SET search_path = public, pg_temp;
ALTER FUNCTION public.purge_trash_scheduled() SET search_path = public, pg_temp;
ALTER FUNCTION public.safe_publish_scheduled() SET search_path = public, pg_temp;
ALTER FUNCTION public.safe_purge_trash_scheduled() SET search_path = public, pg_temp;

-- 방문 IP 보관 기한 (#1169) — retention_days 가 지난 기록의 원문 IP 를 지운다.
--   page_views: IP 는 30분 중복 확인 · 머문 시간 본인 확인에만 쓰이므로 NULL 로 비운다(조회수 · 방문 정보는 그대로).
--   (이름은 옛 site_visits 시절 그대로 — cron 작업 · 기록과 맞춘다)
CREATE OR REPLACE FUNCTION public.anonymize_old_site_visits(retention_days int DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.page_views
     SET ip = NULL
   WHERE viewed_date < CURRENT_DATE - retention_days
     AND ip IS NOT NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_old_site_visits(int) FROM PUBLIC, anon, authenticated;

-- anonymize 의 cron wrapper — 결과를 service_logs 에 남긴다 (하루 한 번이라 매번)
CREATE OR REPLACE FUNCTION public.safe_anonymize_old_site_visits()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  n := public.anonymize_old_site_visits(90);
  PERFORM public._log_cron('anonymize-site-visits', true, n);
EXCEPTION WHEN OTHERS THEN
  PERFORM public._log_cron('anonymize-site-visits', false, NULL, SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.safe_anonymize_old_site_visits() FROM PUBLIC, anon, authenticated;

-- service_logs 90일 지난 기록 지우기
CREATE OR REPLACE FUNCTION public.purge_old_service_logs(retention_days int DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM public.service_logs WHERE at < now() - make_interval(days => retention_days);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_service_logs(int) FROM PUBLIC, anon, authenticated;

-- demo_usage 7일 지난 줄 지우기 — 하루가 지나면 셀 일이 없고 ip_hash 만 남는다
CREATE OR REPLACE FUNCTION public.purge_old_demo_usage(retention_days int DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM public.demo_usage WHERE day < (now() AT TIME ZONE 'UTC')::date - retention_days;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_demo_usage(int) FROM PUBLIC, anon, authenticated;

-- pg_cron 등록 — 재실행 안전 (기존 unschedule 후 등록)
DO $$
BEGIN PERFORM cron.unschedule('publish-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN PERFORM cron.unschedule('purge-trash-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN PERFORM cron.unschedule('anonymize-site-visits'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN PERFORM cron.unschedule('purge-service-logs'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN PERFORM cron.unschedule('purge-demo-usage'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

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

-- 방문 IP 익명화: 매일 UTC 18:30 (= KST 03:30)
SELECT cron.schedule(
  'anonymize-site-visits',
  '30 18 * * *',
  $cron$ SELECT public.safe_anonymize_old_site_visits(); $cron$
);

-- service_logs 정리: 매일 UTC 18:40 (= KST 03:40)
SELECT cron.schedule(
  'purge-service-logs',
  '40 18 * * *',
  $cron$ SELECT public.purge_old_service_logs(90); $cron$
);

-- demo_usage 정리: 매일 UTC 18:45 (= KST 03:45)
SELECT cron.schedule(
  'purge-demo-usage',
  '45 18 * * *',
  $cron$ SELECT public.purge_old_demo_usage(7); $cron$
);

-- rate_limits 정리: 매일 UTC 18:50 (= KST 03:50)
DO $$ BEGIN PERFORM cron.unschedule('purge-rate-limits'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'purge-rate-limits',
  '50 18 * * *',
  $cron$ SELECT public.purge_old_rate_limits(); $cron$
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
  USING (auth.uid() = user_id AND is_member())
  WITH CHECK (auth.uid() = user_id AND is_member());


-- ────────────────────────────────────────────────────────────
-- 등급별 RLS 정책 (일괄) — 대상 테이블이 전부 만들어진 뒤에 건다.
--   owner  = 소유자만(코드의 requireOwner 와 짝) · admin = owner + level>=2 · member = 로그인한 구성원 전부
--   to_regclass 가 NULL 인 테이블은 건너뛰므로, 테이블 생성보다 먼저 돌면 정책이 빠진다.
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  -- owner 전용
  FOREACH t IN ARRAY ARRAY['site_settings', 'author_invites'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (is_owner()) WITH CHECK (is_owner())', t || '_owner_all', t);
  END LOOP;

  -- admin 이상 (중재 · 운영 지표)
  FOREACH t IN ARRAY ARRAY[
    'comments', 'work_comments', 'comment_reports', 'comment_reactions',
    'admin_notifications', 'poll_votes'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', t || '_admin_all', t);
  END LOOP;

  -- member 이상 (자기 글 작업)
  FOREACH t IN ARRAY ARRAY[
    'series', 'calendars', 'revisions', 'post_work_relations', 'series_work_relations',
    'custom_emojis', 'cover_image_history'   -- 에디터 기능 (커버 picker · 이모지 picker)
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_member_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (is_member()) WITH CHECK (is_member())', t || '_member_all', t);
  END LOOP;
END $$;


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


-- 버킷 자동 생성
--   - uploads : admin/upload 라우트 (일반 첨부)
--   - posts   : upload / cover(ai-generate · unsplash download) 라우트가 사용하는
--               게시물·커버 이미지 버킷. 둘 다 public(getPublicUrl)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('uploads', 'uploads', true),
  ('posts',   'posts',   true)
ON CONFLICT (id) DO NOTHING;

--   - contact-attachments : 문의 폼 첨부(src/lib/contact/limits.ts CONTACT_BUCKET). 비공개 —
--               방문자는 서버가 발급한 서명 URL(/api/contact/upload)로 올리고, 메일에는 7일짜리
--               서명 내려받기 링크가 붙는다. 정책(RLS)은 두지 않는다: 서명 토큰과 service_role 은
--               정책을 보지 않고, 그 밖의 누구도 읽거나 쓰지 못해야 한다. 크기 상한 25MB 를 버킷에서도 막는다
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('contact-attachments', 'contact-attachments', false, 26214400)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit;

-- 정책(RLS)은 두지 않는다 — 공개 버킷은 정책 없이도 URL 로 파일을 내준다. 공개 SELECT 정책은 목록 조회만 더 열어
--   전체 폴더 구조를 보여 줬다(2026_10_21_b). 업로드도 서버가 발급한 서명 URL(uploadToSignedUrl) · service_role 로만 —
--   authenticated INSERT 를 열어 두면 멤버가 서버의 확장자 · 크기 검증을 건너뛸 수 있다.
DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view posts" ON storage.objects;


-- ============================================================
-- 완료! 총 26개 테이블 + 34개 함수 + 5개 pg_cron job 생성됨.
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
--   page_views           : 사이트의 조회 기록 하나 — 경로 · 세션 · 방문자 · 방문 정보(유입/기기/국가/UTM) · 머문 시간, 30분 중복 제거 (service_role 전용)
--   traffic_excluded_ips : 운영자 IP — 방문 기록·트래픽 집계에서 제외 (service_role 전용)
--   service_logs         : AI·메일·GitHub·예약 작업 성공/실패 기록 (service_role 전용, 90일 보관)
--   content_translations : 상세 화면 다른 언어 번역 캐시 (글/작업물 × 언어, service_role 전용)
--   demo_usage           : About 라이브 데모 하루 사용 횟수 (day + feature + ip_hash, service_role 전용, 7일 보관)
--   author_invites       : 저자 초대 (email → author_id + 권한 레벨, OAuth 매칭)
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
--   record_page_view(path, ip, session, visitor, meta) : 조회 기록 — 같은 IP · 경로 30분 안이면 앞 행 id, 첫 조회에 방문 정보, 글/작업물 view_count +1 (service_role 전용)
--   record_page_duration(p_id, p_ip, p_ms)        : 그 조회에 머문 시간 더하기 (한 조회 2시간 상한, service_role 전용)
--   daily_page_views / page_view_totals / page_view_stats : 페이지 조회 집계 — 일별 · 전체와 처음 센 날 · 기간 상세 (service_role 전용)
--   visitor_counts(p_today, p_excluded)          : 오늘 · 전체 방문자 수 — 푸터 (service_role 전용)
--   publish_scheduled()                           : 예약 시간 도달한 게시물/작품 발행 + 알림 (cron 매분)
--   purge_trash_scheduled()                       : purge_after 지난 휴지통(posts/works/calendars) hard delete + 알림 (cron 매일 KST 03:00)
--   anonymize_old_site_visits(retention_days)     : 보관 기한 지난 page_views 의 IP 비우기 (cron 매일 KST 03:30)
--   purge_old_service_logs(retention_days)        : 보관 기한 지난 service_logs 삭제 (cron 매일 KST 03:40)
--   demo_take(feature, ip_hash, per_ip, total)    : 라이브 데모 하루 상한 확인 + 1회 사용 (남은 횟수, 넘었으면 -1, service_role 전용)
--   demo_refund(feature, ip_hash, per_ip, total)  : 공급자 실패 시 1회 반환 (남은 횟수, service_role 전용)
--   demo_remaining(feature, ip_hash, per_ip, total): 라이브 데모 남은 횟수 (service_role 전용)
--   purge_old_demo_usage(retention_days)          : 보관 기한 지난 demo_usage 삭제 (cron 매일 KST 03:45)
--
-- 권한 헬퍼 (RLS 정책용):
--   app_role / app_level / app_author_id / is_owner / is_admin / is_member / can_edit_post / can_edit_work
--
-- 유틸 함수:
--   _sql_slugify(t)                               : title → slug 변환 (마이그레이션 backfill 용)
--   _get_vault_secret(name)                       : Vault secret 안전 조회 (없으면 NULL)
--   _send_admin_email(subject, html)              : Resend 이메일 발송 (Vault 비어있으면 skip)
--   normalize_series_order(p_series_id)           : series_order 0-based sequential 재정렬 (trigger 호출)
--   log_migration_applied(name, desc)             : applied_migrations 기록 + 처음이면 알림
--   _log_cron(job, ok, n, msg)                    : 예약 작업 결과를 service_logs 에 기록
--   safe_publish_scheduled / safe_purge_trash_scheduled / safe_anonymize_old_site_visits
--                                                 : cron wrapper — 결과 기록 + 실패 시 cron_error 알림
--   about_erd_valid(cfg jsonb)                    : About Studio ERD 설정 형태 검증 (site_settings CHECK 제약, IMMUTABLE)
--   settings_required_valid(cfg jsonb)            : 사이트 설정 필수값 검증 — 제목·이름·테마색·giscus·멤버이름 (site_settings CHECK 제약, IMMUTABLE)
--
-- Trigger:
--   posts_normalize_series_order                  : posts INSERT/UPDATE/DELETE 시 series_order 자동 정합화
--
-- pg_cron Jobs:
--   publish-scheduled       (* * * * *)           : 매분 publish_scheduled() 호출
--   purge-trash-scheduled   (0 18 * * *)          : 매일 UTC 18:00 (KST 03:00) purge_trash_scheduled() 호출
--   anonymize-site-visits   (30 18 * * *)         : 매일 UTC 18:30 (KST 03:30) safe_anonymize_old_site_visits() 호출
--   purge-service-logs      (40 18 * * *)         : 매일 UTC 18:40 (KST 03:40) purge_old_service_logs(90) 호출
--   purge-demo-usage        (45 18 * * *)         : 매일 UTC 18:45 (KST 03:45) purge_old_demo_usage(7) 호출
--
-- Storage:
--   uploads (public)                              : admin/upload — logos/, resume/, bgm/, covers/, images/ ...
--   posts   (public)                              : upload · cover(ai-generate · unsplash download) — 게시물/커버 이미지
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- About Studio ERD 설정 검증 — site_settings.config CHECK
-- ────────────────────────────────────────────────────────────
-- About 페이지 ERD 는 About Studio 에서 편집돼 site_settings.config JSONB 안에 저장된다.
-- UI(ErdTableModal) · API(src/lib/api/validateAboutErd.ts) 와 동일 규칙을 DB 에서도 강제:
--   테이블 이름 필수 / 테이블 이름 중복 금지
--   테이블당 컬럼 1개 이상
--   컬럼 이름·타입 필수 / 컬럼 이름 중복 금지 (테이블 내)
--   선택 필드의 타입 (required/unique/indexed = bool, defaultValue/comment = text,
--                    enumValues = text[], 테이블 kind = 'view' 만)
-- 공개 About 패널이 col.type 을 그대로 SVG 에 그리므로, 비면 배포된 ERD 에 빈 칸이 남는다.
-- 선택 필드는 SQL 가져오기가 채우는 값이라 손으로 넣을 일이 없지만, API 를 직접 부르면
-- 아무 타입이나 들어올 수 있고 공개 패널이 그걸 그대로 그린다.
-- 3중 검증(UI·API·DB)은 이 저장소 관례 — posts_title_len(2026_07_13) 과 동일.
--
-- config 는 { delta, savedDefaults } wrapper 구조.
-- 읽기 경로(src/lib/getSiteConfig.ts)의 `config.delta ?? config` 와 똑같이 언랩한다.
CREATE OR REPLACE FUNCTION public.about_erd_valid(cfg jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  tables jsonb;
  t      jsonb;
  c      jsonb;
  tname  text;
  cname  text;
  ctype  text;
  tnames text[] := '{}';
  cnames text[];
  bkey   text;
  skey   text;
BEGIN
  IF cfg IS NULL OR jsonb_typeof(cfg) <> 'object' THEN
    RETURN true;
  END IF;

  tables := COALESCE(cfg #> '{delta,about,erdTables}', cfg #> '{about,erdTables}');

  -- ERD 를 건드리지 않는 저장(대부분의 설정 변경)은 그대로 통과
  IF tables IS NULL OR jsonb_typeof(tables) = 'null' THEN
    RETURN true;
  END IF;
  IF jsonb_typeof(tables) <> 'array' THEN
    RETURN false;
  END IF;

  FOR t IN SELECT * FROM jsonb_array_elements(tables) LOOP
    IF jsonb_typeof(t) <> 'object' THEN
      RETURN false;
    END IF;

    tname := lower(btrim(COALESCE(t ->> 'name', '')));
    IF tname = '' OR tname = ANY(tnames) THEN
      RETURN false;
    END IF;
    tnames := tnames || tname;

    IF jsonb_typeof(t -> 'columns') <> 'array' OR jsonb_array_length(t -> 'columns') = 0 THEN
      RETURN false;
    END IF;

    cnames := '{}';
    FOR c IN SELECT * FROM jsonb_array_elements(t -> 'columns') LOOP
      IF jsonb_typeof(c) <> 'object' THEN
        RETURN false;
      END IF;
      cname := lower(btrim(COALESCE(c ->> 'name', '')));
      ctype := btrim(COALESCE(c ->> 'type', ''));
      IF cname = '' OR ctype = '' OR cname = ANY(cnames) THEN
        RETURN false;
      END IF;
      cnames := cnames || cname;

      -- 선택 필드 — 없으면 통과, 있으면 타입이 맞아야 한다
      FOREACH bkey IN ARRAY ARRAY['pk', 'required', 'unique', 'indexed'] LOOP
        IF c ? bkey AND jsonb_typeof(c -> bkey) NOT IN ('boolean', 'null') THEN
          RETURN false;
        END IF;
      END LOOP;
      FOREACH skey IN ARRAY ARRAY['fk', 'defaultValue', 'comment'] LOOP
        IF c ? skey AND jsonb_typeof(c -> skey) NOT IN ('string', 'null') THEN
          RETURN false;
        END IF;
      END LOOP;
      IF c ? 'enumValues' AND jsonb_typeof(c -> 'enumValues') NOT IN ('array', 'null') THEN
        RETURN false;
      END IF;
      IF jsonb_typeof(c -> 'enumValues') = 'array' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(c -> 'enumValues') v
        WHERE jsonb_typeof(v) <> 'string'
      ) THEN
        RETURN false;
      END IF;
    END LOOP;

    -- 테이블 선택 필드 — kind 는 뷰 표시에만 쓰이므로 'view' 외 값을 받지 않는다
    IF t ? 'kind' AND COALESCE(t ->> 'kind', 'view') <> 'view' THEN
      RETURN false;
    END IF;
    IF t ? 'comment' AND jsonb_typeof(t -> 'comment') NOT IN ('string', 'null') THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$fn$;

-- NOT VALID — 기존 행은 검사하지 않고 앞으로의 INSERT/UPDATE 에만 적용.
-- fresh install 은 site_settings 가 비어 있어 차이 없지만 migration 파일과 동일하게 유지.
-- 기존 행까지 확정하려면 아래를 먼저 확인하고 VALIDATE 한다:
--   SELECT id FROM site_settings WHERE NOT public.about_erd_valid(config);
--   ALTER TABLE site_settings VALIDATE CONSTRAINT site_settings_about_erd_valid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_about_erd_valid') THEN
    ALTER TABLE site_settings
      ADD CONSTRAINT site_settings_about_erd_valid
      CHECK (public.about_erd_valid(config)) NOT VALID;
  END IF;
END $$;


-- site_settings.config 필수값 검증 (2026_08_02_settings_required)
-- UI(설정 화면 validationError·섹션 저장 가드) · API(validateRequiredSettings → 400) 와 동일 규칙:
--   사이트 제목 / 이름 / 테마 색상 5종 — 비울 수 없음
--   이메일 — 입력 시 형식 검사 (빈 값 허용)
--   댓글 provider 가 giscus 면 repo·repoId·category·categoryId 필수
--   멤버(authors) 각 항목 이름 필수
-- config 는 { delta, savedDefaults } wrapper — "delta 에 있으면서 빈 값"이면 위반.
CREATE OR REPLACE FUNCTION public.settings_required_valid(cfg jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  provider text;
  email    text;
  authors  jsonb;
  a        jsonb;
  gpath    text;
  gval     text;
  tpath    text;
  tval     text;
BEGIN
  IF cfg IS NULL OR jsonb_typeof(cfg) <> 'object' THEN
    RETURN true;
  END IF;

  FOREACH tpath IN ARRAY ARRAY[
    'metadata,title', 'personal,name',
    'theme,accentColor', 'theme,lightBg', 'theme,lightText', 'theme,darkBg', 'theme,darkText'
  ] LOOP
    tval := COALESCE(
      cfg #>> ('{delta,' || tpath || '}')::text[],
      cfg #>> ('{' || tpath || '}')::text[]
    );
    IF tval IS NOT NULL AND btrim(tval) = '' THEN
      RETURN false;
    END IF;
  END LOOP;

  email := COALESCE(cfg #>> '{delta,contact,email}', cfg #>> '{contact,email}');
  IF email IS NOT NULL AND btrim(email) <> '' AND btrim(email) !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' THEN
    RETURN false;
  END IF;

  provider := COALESCE(cfg #>> '{delta,comments,provider}', cfg #>> '{comments,provider}', 'system');
  IF provider = 'giscus' THEN
    FOREACH gpath IN ARRAY ARRAY[
      'comments,giscus,repo', 'comments,giscus,repoId', 'comments,giscus,category', 'comments,giscus,categoryId'
    ] LOOP
      gval := COALESCE(
        cfg #>> ('{delta,' || gpath || '}')::text[],
        cfg #>> ('{' || gpath || '}')::text[],
        ''
      );
      IF btrim(gval) = '' THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  authors := COALESCE(cfg #> '{delta,authors}', cfg #> '{authors}');
  IF authors IS NOT NULL AND jsonb_typeof(authors) = 'array' THEN
    FOR a IN SELECT * FROM jsonb_array_elements(authors) LOOP
      IF jsonb_typeof(a) <> 'object' OR btrim(COALESCE(a ->> 'name', '')) = '' THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
END;
$fn$;

-- NOT VALID — 기존 행은 검사하지 않고 앞으로의 INSERT/UPDATE 에만 적용 (about_erd_valid 와 동일).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_required_valid') THEN
    ALTER TABLE site_settings
      ADD CONSTRAINT site_settings_required_valid
      CHECK (public.settings_required_valid(config)) NOT VALID;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- Applied migrations log — setup.sql 이 흡수한 마이그레이션 마킹
-- ────────────────────────────────────────────────────────────
-- 위 파일의 모든 구조는 아래 마이그레이션 67건을 통합한 결과입니다.
-- fresh install 환경에서 setup.sql 실행 직후, supabase/migrations/ 의 .sql 을
-- 단일 실행해도 was_new = false 로 skip 되도록 record 만 미리 남깁니다.
--
-- log_migration_applied 대신 직접 INSERT — fresh install 시점엔 admin 이 아직
-- 없어서 알림이 의미 없고, 67건 알림이 한꺼번에 쌓이는 노이즈도 회피.
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
  ('2026_05_22_works_slug',                    'works.slug 인덱스 — /works/[slug] 라우팅'),
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
  ('2026_07_18_works_title_en',                'works.title_en — 작품 제목 영문 (title 이중언어화)'),
  ('2026_07_21_about_erd_valid',               'site_settings.config About ERD 필수값 CHECK (테이블·컬럼 이름/타입)'),
  ('2026_07_23_about_erd_fields',              'about_erd_valid 확장 — 컬럼 제약(required/unique/indexed/defaultValue/comment/enumValues)·테이블 kind 타입 검증'),
  ('2026_08_02_settings_required',             'site_settings.config 필수값 CHECK (제목·이름·테마색·giscus·멤버이름)'),
  ('2026_08_03_site_visits_traffic_meta',      'site_visits 트래픽 메타 컬럼(referrer/user_agent/device_kind/os/browser/device_model) + 인덱스 — 옛 DB 누락분'),
  ('2026_08_05_revisions_entity_id_text',      'revisions.entity_id uuid→text — 저장 전 새 글 draft sentinel 허용 (autosave 500 방지)'),
  -- 권한을 service-role 우회에서 RLS 정책으로 옮긴 전환 (2026_08_22 ~ 08_25)
  ('2026_08_22_close_public_table_reads',      '익명 직접 읽기 범위 축소 — 댓글 민감 컬럼 노출·좋아요 임의 삭제 차단'),
  ('2026_08_22_drop_blanket_authenticated',    '"Authenticated users have full access" 포괄 정책 제거'),
  ('2026_08_22_rls_admin_policies',            'RLS 관리자 정책 1단계 — app_metadata(JWT) 기반 is_admin/is_owner/can_edit_post'),
  ('2026_08_22_rls_admin_policies_rest',       'RLS 권한 등급 정정 + 나머지 테이블 정책 (1단계 마무리)'),
  ('2026_08_22_scope_service_policies',        'service 전용 정책을 service_role 로 한정 — 익명 전체 접근 차단'),
  ('2026_08_25_drop_redundant_service_policies','service_role 전용 정책 제거 (service_role 은 RLS 를 우회하므로 무의미)'),
  ('2026_08_25_drop_storage_authenticated_insert','스토리지 직접 업로드 정책 제거 — 서버 검증 우회 차단'),
  ('2026_08_25_fix_posts_tier_policies',       'posts/works 정책을 4단계 권한 모델에 맞춤'),
  ('2026_08_25_harden_permission_level',       'app_level/app_author_id 클레임 파싱 강화 — 코드(TS)와 정책(SQL)이 같은 값을 같게 읽도록'),
  ('2026_08_25_revoke_anon_writes',            'anon 역할의 INSERT/UPDATE/DELETE 회수 (심층 방어)'),
  ('2026_08_25_work_team_member_access',       'can_edit_work — 팀원으로 등록된 멤버에게 그 작업물만 개방'),
  ('2026_09_03_series_public_read',            'series_public_read 복구 — 방문자가 공개 시리즈를 읽도록'),
  ('2026_09_15_works_pinned_views_likes',      'works.is_pinned/view_count/like_count + work_views + record_work_view'),
  ('2026_09_21_works_gallery_notes',           'works.gallery_notes — 갤러리 장마다의 음성'),
  ('2026_09_25_site_visits_analytics_columns', 'site_visits 분석 컬럼 (country/path/utm_source/utm_medium/utm_campaign)'),
  ('2026_09_27_site_visits_ip_retention',      'traffic_excluded_ips + anonymize_old_site_visits (방문 IP 90일 보관) + pg_cron'),
  ('2026_09_30_service_logs',                  'service_logs 테이블 + 예약 작업(publish/purge/anonymize) 기록 + 90일 보관'),
  ('2026_09_30_purge_trash_calendars',         'purge_trash_scheduled — 휴지통 영구삭제에 calendars 포함 (앱 /api/cron/purge-trash 와 같은 범위)'),
  ('2026_10_09_content_translations',          'content_translations — 상세 화면 다른 언어 번역 캐시 (service_role 전용)'),
  ('2026_10_09_demo_usage',                    'demo_usage 테이블 + demo_take/demo_refund/demo_remaining (라이브 데모 하루 상한) + 7일 보관'),
  ('2026_10_11_content_translations_ui',       'content_translations.source_type 에 ui 추가 — 본문 안 라벨 번역 캐시 (언어마다 한 줄)'),
  ('2026_10_12_content_translations_site',     'content_translations.source_type 에 site_ui · post_meta · work_meta · series_meta 추가 — 사이트 전체 번역 캐시'),
  ('2026_10_13_auto_translation_mark',         'posts/works.auto_translation — 자동 번역 표식(원문 · 번역 칸 해시)'),
  ('2026_10_14_page_views',                    'page_views — 페이지 조회 기록(30분 중복 제거) + 페이지별 머문 시간'),
  ('2026_10_15_page_views_unify',              'page_views 로 조회 기록 통일 1단계 — 방문 정보 · 방문자 칸, 옛 기록 복사'),
  ('2026_10_16_visitor_counts',                'visitor_counts — 오늘 · 전체 방문자 수(푸터 · 대시보드 같은 기준)'),
  ('2026_10_17_drop_legacy_views',             'page_views 로 조회 기록 통일 2단계 — site_visits · post_views · work_views 삭제'),
  ('2026_10_18_content_translations_admin_text','content_translations.source_type 에 admin_text 추가 — 관리자 화면 알림 등 시스템 글 번역 캐시'),
  ('2026_10_19_contact_attachments_bucket',    'contact-attachments 버킷 — 문의 폼 첨부(비공개, 25MB)'),
  ('2026_10_19_content_source_lang',           '원문 언어(posts · works.source_lang)와 덮어쓰기 전 원문 백업(content_translations post_source · work_source · settings_source)'),
  ('2026_10_20_works_cover_position',          'works.cover_position/cover_zoom — 작업물 커버 위치·확대 영속화 (posts 미러)'),
  ('2026_10_21_revoke_definer_functions',      'SECURITY DEFINER 함수(vault · 메일 · 예약 작업)의 anon · authenticated 실행 권한 회수 + search_path 고정'),
  ('2026_10_21_b_rate_limits_public_read',     'rate_limits 공유 속도 제한 + 휴지통 글 · 캘린더 · 관계 테이블 공개 읽기 조이기 + 버킷 목록 정책 제거'),
  ('2026_10_22_rls_require_aal2',              '정책의 역할 판정(app_role · app_level · app_author_id)을 2단계 인증(aal2) 세션에서만')
ON CONFLICT (name) DO NOTHING;
-- 참고: 2026_07_13_category_reset / 2026_07_13_tag_descriptions_reset 은 기존 데이터를 손보는
-- 수동 데이터 마이그레이션이라 fresh install 과 무관 → 여기서 record 하지 않는다.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 익명 역할의 쓰기 권한 회수 (심층 방어)
--   Supabase 기본값은 public 스키마 전 테이블에 anon 앞으로 GRANT ALL 이다.
--   브라우저는 테이블에 직접 쓰지 않으므로(auth · Realtime · storage 만 사용) 회수한다.
--   SELECT 는 남긴다 — 공개 목록/상세가 anon 클라이언트로 읽고 *_public_read 가 범위를 정한다.
--   정책을 한 번 잘못 써도(TO 절 누락 등) 익명이 쓰기를 시도조차 못 하게 하는 층이다.
-- ────────────────────────────────────────────────────────────
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon;

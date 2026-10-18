import type { ErdTable, ErdRelation, ErdDesignNote } from "./types";
import { schemaTables, schemaRelations } from "@/data/generated/erdSchema";

/* 테이블 · 칼럼 · FK 는 supabase/setup.sql 에서 빌드 전에 굽는다(scripts/gen-erd.ts → data/generated/erdSchema.ts).
   스키마가 바뀌면 setup.sql 만 고치면 된다 — 예전엔 여기 손으로 적어서 마이그레이션이 쌓이는 동안 낡았다 */
export const erdTables: ErdTable[] = schemaTables;

/** FK 가 없는 논리 관계 — 대상 종류(target_type · entity_type · comment_type)로 여러 테이블을 가리켜 SQL 에 REFERENCES 가 없다.
 *  좋아요는 글 · 작업물에만(댓글 좋아요는 comment_reactions 로 옮겨 갔다) */
const logicalRelations: ErdRelation[] = [
  { from: "likes", fromField: "target_id", to: "posts", toField: "id", label: "N:1" },
  { from: "likes", fromField: "target_id", to: "works", toField: "id", label: "N:1" },
  { from: "revisions", fromField: "entity_id", to: "posts", toField: "id", label: "N:1" },
  { from: "revisions", fromField: "entity_id", to: "works", toField: "id", label: "N:1" },
  { from: "comment_reactions", fromField: "comment_id", to: "comments", toField: "id", label: "N:1" },
  { from: "comment_reactions", fromField: "comment_id", to: "work_comments", toField: "id", label: "N:1" },
];

export const erdRelations: ErdRelation[] = [...schemaRelations, ...logicalRelations];

export const erdDesignNotes: ErdDesignNote[] = [
  {
    title: { ko: "체험 데모의 하루 상한", en: "Daily Limits for the Live Demos" },
    tag: "PK (day, feature, ip_hash) · demo_take() · advisory lock · 7일 보관",
    description: {
      ko: "About 의 AI 체험(번역 · 요약 · 커버 · 음성)은 실제 공급자를 부르므로 IP 마다, 그리고 사이트 전체로 하루 상한을 둡니다. 서버리스 인스턴스끼리 수를 나눠 가질 수 없어 DB 에 셉니다. IP 는 HMAC 해시로만 저장하고, demo_take() 가 같은 기능 · 같은 날 요청을 advisory lock 으로 줄 세워 두 상한을 한 번에 확인하고 더합니다. 공급자가 실패하면 demo_refund() 로 한 번 돌려줍니다. 표는 service_role 만 쓰고, 7일 지난 행은 pg_cron 이 매일 지웁니다.",
      en: "The About page's AI demos (translate, summary, cover, voice) call real providers, so each feature has a per-IP and a site-wide daily limit. Serverless instances can't share a counter, so it lives in the database. IPs are stored only as HMAC hashes; demo_take() serializes same-feature, same-day requests with an advisory lock, checking both limits and incrementing in one step. A failed provider call gets one back via demo_refund(). Only service_role touches the table, and pg_cron clears rows older than seven days.",
    },
    relatedTable: "demo_usage",
  },
  {
    title: { ko: "이 다이어그램은 스키마 파일에서 그려진다", en: "This Diagram Is Drawn from the Schema File" },
    tag: "supabase/setup.sql → 빌드 시 생성 · 스키마와 다르면 테스트 실패 · 관리자 덮어쓰기 없음",
    description: {
      ko: "지금 보고 계신 ERD 는 손으로 그린 그림이 아닙니다. 빌드할 때마다 supabase/setup.sql 을 SQL 파서로 읽어 테이블 · 컬럼 · FK 를 만듭니다. 파서는 CREATE TABLE 만이 아니라 ALTER · DROP · VIEW · ENUM · INDEX · COMMENT 와 DO 블록 안의 DDL 까지 문서 순서대로 적용하고, 생성 파일이 스키마와 다르면 테스트가 실패합니다. 관리자에서 그림을 덮어쓰는 기능은 두지 않습니다. 덮어쓴 값은 스키마가 바뀌어도 그대로 남아 실제와 어긋나기 때문에, 배포된 그림은 늘 그 배포의 스키마와 같습니다. API 장면의 엔드포인트 지도도 같은 방식으로 route.ts 파일에서 빌드 때 만들어집니다. 같은 site_settings.config 에는 설정 필수값(제목·이름·테마 색상·giscus·멤버 이름)을 지키는 site_settings_required_valid CHECK 가 걸려 있어, 빈 값이 저장되는 것을 UI·API·DB 세 곳에서 막습니다.",
      en: "The ERD you're looking at isn't hand-drawn. Every build reads supabase/setup.sql with a SQL parser to produce the tables, columns, and FKs. The parser applies not just CREATE TABLE but ALTER, DROP, VIEW, ENUM, INDEX, COMMENT, and even DDL inside DO blocks in document order, and a test fails if the generated file drifts from the schema. There is no admin override for the diagram: an overridden value stays put when the schema changes and drifts from reality, so the deployed diagram always matches that deployment's schema. The API scene's endpoint map is built the same way, from the route.ts files at build time. The same site_settings.config carries a site_settings_required_valid CHECK that guards required values (title, name, theme colors, giscus, member names), blocking empty saves in three places: UI, API, and the DB.",
    },
    relatedTable: "site_settings",
  },
  {
    title: { ko: "조회 기록 하나에서 모든 숫자를", en: "Every Count from One View Log" },
    tag: "page_views · session_id / visitor_id / is_landing · viewed_date GENERATED",
    description: {
      ko: "페이지가 보일 때마다 page_views 에 한 줄을 남기고, 방문 · 방문자 · 유입 · 기기 · 국가 · UTM · 페이지 조회수 · 머문 시간 · 글과 작업물 조회수를 전부 여기서 셉니다. 예전에는 방문(IP·하루 1행), 글 조회, 작업물 조회, 페이지 조회를 네 테이블에 따로 적어 기준이 달랐고, 푸터 · 대시보드 · 글 조회수가 서로 맞지 않았습니다. 방문은 30분 동안 아무것도 안 보면 끝나는 세션(session_id)이고, 그 첫 조회(is_landing)에만 유입 · 기기 · 국가 · UTM 을 담습니다. 같은 IP 가 같은 경로를 30분 안에 다시 보면 한 번으로 세고, 글 · 작업물 경로의 새 조회는 같은 함수 안에서 view_count 를 올립니다. viewed_date 는 viewed_at 을 Asia/Seoul 로 바꿔 저장하는 생성 컬럼이라 서버 타임존이 달라도 날짜 집계가 흔들리지 않습니다. IP 는 90일 뒤 비웁니다.",
      en: "Every page view adds one row to page_views, and visits, visitors, referrers, devices, countries, UTM, page views, time on page and post/project view counts are all counted from it. Visits (one row per IP per day), post views, project views and page views used to live in four tables with different rules, so the footer, dashboard and post counts disagreed. A visit is a session (session_id) that ends after 30 idle minutes, and only its first view (is_landing) carries referrer, device, country and UTM. A repeat view of the same path by the same IP within 30 minutes counts once, and a new view of a post or project path bumps view_count in the same function. viewed_date is a generated column converting viewed_at to Asia/Seoul, so day counts don't drift with the server timezone. IPs are cleared after 90 days.",
    },
    relatedTable: "page_views",
  },
  {
    title: { ko: "조인 테이블에는 대리 키를 두지 않음", en: "No Surrogate Key on the Join Table" },
    tag: "PRIMARY KEY (post_id, work_id)",
    description: {
      ko: "두 FK 자체가 기본키입니다. id 를 따로 두면 같은 (게시물, 프로젝트) 쌍이 여러 번 들어갈 수 있어 UNIQUE 를 또 걸어야 합니다. 복합 PK 는 중복 방지와 조회 인덱스를 한 번에 해결합니다. 양쪽 FK 모두 ON DELETE CASCADE 라 원본이 지워지면 연결도 함께 사라집니다.",
      en: "The two FKs are the primary key. A separate id would allow the same (post, work) pair twice, forcing an extra UNIQUE. A composite PK covers both dedup and lookup at once. Both FKs cascade on delete, so links disappear with their source rows.",
    },
    relatedTable: "post_work_relations",
  },
  {
    title: { ko: "중복 신고는 막되, 처리 후 재신고는 허용", en: "Block Duplicate Reports, Allow Re-reporting" },
    tag: "UNIQUE (comment_id, comment_type, reporter_hash) WHERE status = 'pending'",
    description: {
      ko: "부분 UNIQUE 인덱스입니다. pending 인 신고에만 걸리므로 같은 사람이 같은 댓글을 중복 신고하는 건 막히지만, 처리(resolved/dismissed)된 뒤 다시 문제가 생기면 새로 신고할 수 있습니다. 신고자는 IP 가 아니라 reporter_hash 로 식별합니다. comment_type CHECK 로 게시물/프로젝트 댓글을 한 테이블에서 다룹니다.",
      en: "A partial UNIQUE index scoped to pending reports. The same person can't file a duplicate open report, but once it's resolved or dismissed they can report again if the problem recurs. Reporters are identified by reporter_hash, not raw IP. A comment_type CHECK lets one table cover both post and work comments.",
    },
    relatedTable: "comment_reports",
  },
  {
    title: { ko: "기기 지문은 버전을 뺀 UA 해시", en: "Device Fingerprint Ignores Browser Versions" },
    tag: "UNIQUE (user_id, fingerprint)",
    description: {
      ko: "fingerprint 는 UA 전체가 아니라 파싱한 브라우저·OS·기기만 해시합니다. Chrome 자동 업데이트로 UA 의 minor 버전이 바뀌어도 같은 지문이 나와 같은 기기가 새 행으로 쌓이지 않습니다. (user_id, fingerprint) UNIQUE 로 계정별 한 기기 한 행을 보장하고, 승인은 approve_token 과 만료 시각으로 메일 링크를 통해 처리합니다.",
      en: "fingerprint hashes only the parsed browser, OS and device — not the raw UA. A Chrome auto-update changes the UA's minor version but yields the same fingerprint, so one device never piles up duplicate rows. UNIQUE (user_id, fingerprint) keeps one row per device per account, and approval runs through approve_token with an expiry via an email link.",
    },
    relatedTable: "admin_known_devices",
  },
  {
    title: { ko: "로그인 잠금 — 계정당 한 행", en: "Login Lockout — One Row per Account" },
    tag: "email PK · 5회 실패 → 15분 잠금",
    description: {
      ko: "시도를 로그로 쌓지 않고 email 을 기본키로 둔 카운터 한 행만 upsert 합니다. 실패 5회면 locked_until 을 15분 뒤로 밀고, 성공하면 행을 지웁니다. 로그 방식이면 시도마다 행이 늘고 잠금 판단에 집계가 필요한데, 이 구조는 단일 행 조회로 끝납니다.",
      en: "Instead of logging every attempt, it upserts a single counter row keyed by email. Five failures push locked_until 15 minutes out; a success deletes the row. A log-style table would grow per attempt and need aggregation to decide lockout — this needs one row lookup.",
    },
    relatedTable: "admin_login_attempts",
  },
  {
    title: { ko: "마이그레이션 적용 원장", en: "Migration Ledger" },
    tag: "name PK · log_migration_applied()",
    description: {
      ko: "마이그레이션 파일 끝에서 log_migration_applied('이름', '설명') 을 호출해 적용 사실을 남깁니다. name 이 기본키이고 ON CONFLICT DO NOTHING 이라 같은 파일을 두 번 실행해도 안전하고, 처음 적용될 때만 admin_notifications 에 알림이 들어갑니다. 이 저장소는 마이그레이션을 Supabase SQL Editor 에서 손으로 적용하므로, 무엇이 적용됐는지 DB 자신이 기억하게 했습니다.",
      en: "Each migration file ends with log_migration_applied('name', 'description'). name is the primary key and the insert is ON CONFLICT DO NOTHING, so re-running a file is safe, and only the first application posts to admin_notifications. Migrations here are applied by hand in the Supabase SQL Editor, so the database itself remembers what has run.",
    },
    relatedTable: "applied_migrations",
  },
  {
    title: { ko: "커버 이미지 이력 — 사용자별 URL 중복 제거", en: "Cover Image History — Deduped per User" },
    tag: "UNIQUE (user_id, url) · source CHECK ('ai' | 'unsplash' | 'preset')",
    description: {
      ko: "같은 사용자가 같은 이미지를 다시 골라도 행이 늘지 않도록 (user_id, url) UNIQUE 를 겁니다. source 는 CHECK 로 세 가지 출처만 허용해, 나중에 출처별로 필터하거나 통계를 낼 때 값이 흩어지지 않습니다. auth.users 를 참조하며 계정이 지워지면 이력도 함께 사라집니다.",
      en: "UNIQUE (user_id, url) keeps re-picking the same image from adding rows. A CHECK constrains source to three known origins so filtering or counting by origin never meets stray values. It references auth.users and cascades, so history disappears with the account.",
    },
    relatedTable: "cover_image_history",
  },
  {
    title: { ko: "커스텀 이모지는 파일이 아니라 행", en: "Custom Emojis Are Rows, Not Files" },
    tag: "name · src · 멤버 전용(RLS is_member)",
    description: {
      ko: "편집기 이모지 피커에서 올린 아이콘을 이름과 이미지 주소 한 쌍으로 남기는 라이브러리입니다. 서버에 행으로 두기 때문에 어느 기기에서 편집기를 열어도 같은 목록이 뜨고, 브라우저의 localStorage 는 바로 보여 주기 위한 캐시로만 씁니다. 본문에는 고른 이미지 주소가 들어갑니다. 읽기와 쓰기 모두 로그인한 멤버(저자 이상)에게만 열려 있습니다.",
      en: "A library of icons uploaded from the editor's emoji picker, stored as a name and image URL pair. Keeping them as rows means every device shows the same list in the picker; the browser's localStorage is only a cache for instant display. Post content stores the chosen image URL. Reads and writes are open only to signed-in members (author and above).",
    },
    relatedTable: "custom_emojis",
  },
  {
    title: { ko: "역할은 테이블이 아니라 app_metadata 에", en: "Roles Live in app_metadata, Not a Table" },
    tag: "email PK · service_role only",
    description: {
      ko: "author_invites 는 \"누구를 초대했는가\" 만 담는 대기열입니다. 실제 역할(소유자/편집자/저자)은 로그인 성공 후 auth.users.app_metadata(service_role 전용)에 저장돼 클라이언트가 조작할 수 없습니다. email 을 PK 로 둬 중복 초대를 막고, 소유자는 초대가 아니라 OWNER_EMAIL env 로 부트스트랩되므로 이 테이블에 없습니다.",
      en: "author_invites is only a queue of \"who was invited\". The actual role (owner/editor/author) is stored in auth.users.app_metadata (service_role only) after login, so the client can't tamper with it. email as PK blocks duplicate invites, and the owner is bootstrapped from OWNER_EMAIL — not invited — so it never appears here.",
    },
    relatedTable: "author_invites",
  },
  {
    title: { ko: "회원가입 없이 좋아요", en: "Likes Without Sign-Up" },
    tag: "UNIQUE (target_type, target_id, ip)",
    description: {
      ko: "likes 테이블에 (target_type, target_id, ip) 복합 UNIQUE 제약 조건을 걸어서, 같은 IP에서 같은 콘텐츠에 중복 좋아요를 DB 레벨에서 차단합니다.",
      en: "A composite UNIQUE constraint on (target_type, target_id, ip) prevents duplicate likes at the database level.",
    },
    relatedTable: "likes",
  },
  {
    title: { ko: "좋아요는 한 테이블에서 target_type 으로", en: "One Likes Table, Split by target_type" },
    tag: "CHECK (target_type IN ('post','work', …))",
    description: {
      ko: "글과 작업물 좋아요를 단일 테이블에서 target_type 으로 구분하고, 같은 규칙(UNIQUE · 개수 동기화)을 한 번만 씁니다. CHECK 에는 댓글 두 종류도 남아 있지만, 댓글에 반응하는 일은 지금 이모지 반응(comment_reactions)이 맡습니다.",
      en: "Post and work likes share one table split by target_type, so the rules (UNIQUE, count sync) are written once. The CHECK still lists the two comment types, but reacting to comments is now handled by emoji reactions (comment_reactions).",
    },
    relatedTable: "likes",
  },
  {
    title: { ko: "설정을 JSONB 번들로 저장", en: "Settings Stored as a Bundle" },
    tag: "config JSONB NOT NULL DEFAULT '{}'",
    description: {
      ko: "사이트 설정, 프로필, 시크릿을 각각 id='default', 'profile', 'secrets' 행의 config JSONB에 저장합니다. 같은 방식으로 AI 공급자 상태(ai_health)와 이번 달 사용량(ai_usage), TTS 읽기 사전(tts_lexicon), 문의 폼 첨부 상태(contact_attachment)도 각자 한 행을 씁니다. 사이트에 하나뿐인 작은 값이라 표를 따로 두지 않았습니다.",
      en: "Site settings, profile, and secrets are stored in config JSONB under id='default', 'profile', 'secrets' rows. The same way, AI provider health (ai_health), this month's usage (ai_usage), the TTS pronunciation lexicon (tts_lexicon) and the contact-attachment state (contact_attachment) each take one row — small site-wide values that don't warrant their own tables.",
    },
    relatedTable: "site_settings",
  },
  {
    title: { ko: "비정규화 카운트 캐싱", en: "Count Caching (Denormalization)" },
    tag: "posts · works .like_count / .view_count — cache column",
    description: {
      ko: "글과 작업물은 목록과 홈의 인기순 정렬에 좋아요 수와 조회수를 쓰므로, 좋아요가 바뀌거나 조회가 기록될 때 like_count · view_count 캐시 컬럼을 함께 고칩니다. 목록을 그릴 때마다 COUNT(*) 를 하지 않습니다.",
      en: "Posts and works use like and view counts for list display and popularity sorting on the home page, so the like_count and view_count cache columns are updated whenever a like changes or a view is recorded. Lists never run COUNT(*) per render.",
    },
    relatedTable: "posts",
  },
  {
    title: { ko: "익명 댓글의 두 해시", en: "Two Hashes on Anonymous Comments" },
    tag: "password_hash (bcrypt) = 인증 · commenter_hash = 표시",
    description: {
      ko: "수정·삭제 인증은 password_hash 하나로만 합니다. commenter_hash 는 댓글마다 아바타와 닉네임을 정하는 표시용 값이고 인증에 쓰지 않습니다.",
      en: "Edit and delete authenticate through password_hash alone. commenter_hash only picks each comment's avatar and nickname; it is never used for authentication.",
    },
    relatedTable: "comments",
  },
  {
    title: { ko: "다형적 리비전 히스토리", en: "Polymorphic Revision History" },
    tag: "entity_type CHECK ('post' | 'work')",
    description: {
      ko: "Posts와 Works 리비전을 단일 테이블에서 entity_type으로 구분. JSONB snapshot으로 폼 전체를 저장합니다.",
      en: "Posts and Works revisions are unified with entity_type. Full form data is stored as JSONB snapshot.",
    },
    relatedTable: "revisions",
  },
  {
    title: { ko: "유연한 태깅 — TEXT 배열", en: "Flexible Tagging — TEXT Array" },
    tag: "tags TEXT[] NOT NULL DEFAULT '{}'",
    description: {
      ko: "별도 태그 테이블 없이 TEXT[] 배열로 태그를 저장합니다. contains 쿼리로 필터링합니다.",
      en: "Tags are stored as TEXT[] arrays without a separate table. Filtered via contains query.",
    },
    relatedTable: "posts",
  },
  {
    title: { ko: "Works 갤러리 — 배열 + JSONB", en: "Works Gallery — Array + JSONB" },
    tag: "gallery TEXT[] · gallery_notes JSONB · team_members JSONB",
    description: {
      ko: "갤러리 이미지는 TEXT[], 장마다의 음성 대본 · 음성 파일은 이미지 주소를 키로 한 gallery_notes JSONB(한국어 칸과 en 칸으로 언어마다 따로), 팀 멤버는 JSONB 로 저장합니다. 별도 테이블 없이 작업물 한 행에 담깁니다.",
      en: "Gallery images are a TEXT[]; each slide's voice script and audio live in gallery_notes JSONB keyed by image URL (Korean fields plus an en field per language); team members are JSONB. All of it sits in the work's single row without separate tables.",
    },
    relatedTable: "works",
  },
  {
    title: { ko: "번역은 언어마다 한 줄로 캐시", en: "Translations Cached One Row per Language" },
    tag: "UNIQUE (source_type, source_id, lang) · source_hash",
    description: {
      ko: "다른 언어로 보기의 번역은 content_translations 에 (원본 종류, 원본 id, 언어)마다 한 줄로 저장합니다. 원본 종류는 글 · 작업물 상세, 본문 안 라벨, 사이트 화면 글 묶음, 목록 카드(글 · 작업물 · 시리즈)입니다. 원문 해시를 함께 두어 원문이 그대로면 다시 번역하지 않고, 일부만 받은 번역은 해시를 비워 두어 다음 요청이 빠진 부분만 다시 번역합니다. 서버(service_role)만 읽고 씁니다.",
      en: "Translations for viewing in another language are stored in content_translations, one row per (source type, source id, language). Source types are post and project details, labels inside bodies, site UI text bundles and list cards (posts, projects, series). A hash of the source is kept so unchanged text is never re-translated, and a partial result is saved with an empty hash so the next request fills only the gaps. Only the server (service_role) reads and writes it.",
    },
    relatedTable: "content_translations",
  },
  {
    title: { ko: "시리즈 카테고리는 소속 글에서 도출", en: "Series Category Derived from Its Posts" },
    tag: "posts.series_id FK → series.id · series.category = legacy",
    description: {
      ko: "글은 series_id FK 로 시리즈에 연결됩니다. 시리즈는 자기 카테고리를 따로 저장하지 않고, 읽을 때 소속 글 중 가장 많은 카테고리(같으면 이름 순)를 그 시리즈의 카테고리로 씁니다. 글을 옮기거나 카테고리를 바꿔도 시리즈를 따로 고칠 일이 없습니다. series.category 컬럼은 예전 데이터 호환으로만 남아 있습니다.",
      en: "Posts link to a series through the series_id FK. A series stores no category of its own; when read, it takes the most common category among its posts (ties broken by name). Moving a post or changing its category never requires editing the series. The series.category column remains only for legacy data.",
    },
    relatedTable: "series",
  },
  {
    title: { ko: "댓글 구조 재사용", en: "Reused Comment Schema" },
    tag: "work_comments ≈ comments (separate FK)",
    description: {
      ko: "work_comments는 comments와 동일한 스키마(닉네임, 비밀번호 인증, 대댓글, 좋아요, 알림 이메일)를 별도 테이블로 분리합니다. FK만 works.id를 참조하여 RLS 정책을 독립적으로 적용합니다.",
      en: "work_comments mirrors the comments schema (nickname, password auth, threading, likes, notification email) in a separate table. Only the FK references works.id, allowing independent RLS policies.",
    },
    relatedTable: "work_comments",
  },
  {
    title: { ko: "서비스 호출 기록", en: "Service Call Log" },
    tag: "category · RLS 정책 없음 · 90일 보관",
    description: {
      ko: "AI·이미지 검색·TTS(ai), Resend 메일(mail), GitHub API(github), 예약 작업(cron), 문의 폼 첨부(contact)의 성공과 실패를 한 줄씩 남깁니다. 실패 원인(kind)·HTTP 상태·키를 가린 메시지와 사용량(units)을 함께 적습니다. 전에는 site_settings 한 행에 최근 300건을 읽고-고쳐-쓰기 해서 요청이 겹치면 기록이 빠졌습니다. 예약 작업은 pg_cron 이 DB 안에서 직접 남기고, 매일 90일 지난 줄을 지웁니다. RLS 를 켜고 정책을 두지 않아 서버만 읽고 씁니다.",
      en: "One row per success or failure for AI, image search and TTS (ai), Resend mail (mail), the GitHub API (github), scheduled jobs (cron) and contact attachments (contact), with the failure cause (kind), HTTP status, a key-masked message and usage (units). It used to be a read-modify-write of the last 300 entries in one site_settings row, which dropped entries when requests overlapped. Scheduled jobs log from inside the DB via pg_cron, and rows older than 90 days are deleted daily. RLS is on with no policies, so only the server reads and writes it.",
    },
    relatedTable: "service_logs",
  },
  {
    title: { ko: "운영자 IP 제외", en: "Excluding the Operator's IP" },
    tag: "PK (ip) · service_role 전용",
    description: {
      ko: "운영자가 '내 IP' 로 지정한 IP 입니다. 이 IP 의 방문은 기록하지 않고, 이미 쌓인 방문도 집계에서 뺍니다. RLS 를 켜고 정책을 두지 않아 서버만 읽고 씁니다.",
      en: "IPs the operator marked as their own. Their visits are not recorded and past visits are dropped from stats. RLS is on with no policies, so only the server reads and writes it.",
    },
    relatedTable: "traffic_excluded_ips",
  },
  {
    title: { ko: "관리자 알림 로그", en: "Admin Notification Log" },
    tag: "type + metadata JSONB",
    description: {
      ko: "댓글 알림 등 관리자 이벤트를 type으로 분류하고, 추가 정보를 metadata JSONB에 저장합니다. read 플래그로 읽음 상태를 관리합니다.",
      en: "Admin events like comment notifications are classified by type, with extra info in metadata JSONB. The read flag tracks read status.",
    },
    relatedTable: "admin_notifications",
  },
  {
    title: { ko: "투표 집계 전용 테이블", en: "Vote-aggregation-only table" },
    tag: "UNIQUE(poll_id, option_id, ip)",
    description: {
      ko: "투표 질문과 옵션 자체는 본문 HTML에 저장되고, poll_votes는 집계만 담당합니다. poll_id/option_id는 FK가 아니라 에디터가 부여한 text id이며, (poll_id, option_id, ip) UNIQUE로 같은 IP의 중복 투표를 차단합니다.",
      en: "Poll questions and options live inside the content HTML; poll_votes only handles aggregation. poll_id/option_id are editor-assigned text ids, not FKs. A UNIQUE(poll_id, option_id, ip) constraint blocks duplicate votes from the same IP.",
    },
    relatedTable: "poll_votes",
  },
  {
    title: { ko: "댓글 반응 — 좋아요를 대체", en: "Comment Reactions — Replacing Likes" },
    tag: "UNIQUE(comment_id, comment_type, emoji, reactor_hash)",
    description: {
      ko: "댓글의 단일 좋아요를 giscus 식 고정 8종(👍👎😄🎉😕❤️🚀👀) 반응으로 대체했습니다. reactor_hash는 IP+UA의 SHA-256으로, 같은 사람이 같은 댓글에 같은 이모지를 중복으로 다는 것만 UNIQUE로 막고 서로 다른 이모지는 여러 개 허용합니다. comment_id는 comments와 work_comments 양쪽을 가리켜야 해서 likes와 같이 FK 없이 comment_type으로 구분합니다.",
      en: "A single like per comment was replaced by a fixed giscus-style set of 8 reactions (👍👎😄🎉😕❤️🚀👀). reactor_hash is a SHA-256 of IP+UA; the UNIQUE constraint only blocks the same person repeating the same emoji on the same comment, while different emojis stay allowed. comment_id must point at either comments or work_comments, so — like likes — it carries no FK and is disambiguated by comment_type.",
    },
    relatedTable: "comment_reactions",
  },
  {
    title: { ko: "캘린더 — 블록은 참조만, 데이터는 테이블", en: "Calendars — Blocks Reference, Table Owns" },
    tag: "calendars.id ← 본문 블록의 calendarId",
    description: {
      ko: "투표(poll_votes)와 달리 캘린더는 실데이터를 본문이 아니라 테이블에 둡니다. 본문 블록은 calendarId만 참조하므로 여러 글이 같은 달력을 공유하고, 한 곳에서 고치면 전부 반영됩니다. 삭제는 posts/works와 같은 휴지통 규약(deleted_at + purge_after)을 그대로 따릅니다.",
      en: "Unlike polls (poll_votes), calendars keep their real data in the table rather than the content body. A content block only references calendarId, so multiple posts can share one calendar and a single edit propagates everywhere. Deletion reuses the same trash convention as posts/works (deleted_at + purge_after).",
    },
    relatedTable: "calendars",
  },
  {
    title: { ko: "낙관적 동시성 제어", en: "Optimistic Concurrency Control" },
    tag: "posts.version — UPDATE … WHERE version = baseVersion",
    description: {
      ko: "여러 탭이나 기기에서 같은 글을 편집할 때 나중 저장이 앞선 저장을 조용히 덮어쓰는 문제를 막습니다. 에디터는 불러온 시점의 version을 baseVersion으로 보내고, 서버는 version이 그대로일 때만 UPDATE합니다. 0행이면 그사이 누군가 저장한 것이므로 409 version_conflict로 응답하고, 에디터가 덮어쓰기·최신 불러오기·취소를 사용자에게 묻습니다.",
      en: "Prevents a later save from silently clobbering an earlier one when the same post is edited across tabs or devices. The editor sends the version it loaded as baseVersion, and the server only UPDATEs while version is unchanged. Zero rows means someone saved in between, so it answers 409 version_conflict and the editor asks the user to overwrite, reload, or cancel.",
    },
    relatedTable: "posts",
  },
  {
    title: { ko: "시리즈↔프로젝트 다대다", en: "Series↔Project many-to-many" },
    tag: "PRIMARY KEY(series_id, work_id)",
    description: {
      ko: "post_work_relations와 동일한 패턴의 조인 테이블로, 시리즈와 프로젝트를 다대다로 연결합니다. (series_id, work_id) 복합 PK를 사용하고, 양쪽 FK 모두 ON DELETE CASCADE로 정리됩니다.",
      en: "A join table following the same pattern as post_work_relations, linking series and works in a many-to-many relationship. Uses a composite PK (series_id, work_id), with both FKs cleaned up via ON DELETE CASCADE.",
    },
    relatedTable: "series_work_relations",
  },
];

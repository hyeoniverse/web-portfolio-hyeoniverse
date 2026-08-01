# DB 설계 결정

### 통합 좋아요 테이블: `likes`

모든 좋아요(포스트, 작업물, 포스트 댓글, 작업물 댓글)를 단일 `likes` 테이블에서 `target_type`으로 구분합니다.

> 현재 댓글 좋아요는 UI 에서 [이모지 반응](#댓글-이모지-반응-comment_reactions)으로 대체됐습니다. 호출부가 없던 `/api/comment-likes` 라우트는 제거했고, `target_type` 의 `post_comment` / `work_comment` 값만 스키마에 남아 있습니다 — 기존 행이 있으면 CHECK 재정의가 실패하고 남아 있어도 무해하므로 마이그레이션 없이 둡니다.

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **단일 테이블** (현재 구조) | Single Source of Truth, 하나의 UNIQUE 제약으로 전체 중복 방지, 새 엔티티 추가 시 CHECK 값 하나만 추가 | `target_type`이 4개 |
| **완전 분리** (post_likes, work_likes, ...) | 쿼리 단순 | 테이블 과다, 스키마 중복 |
| **2테이블** (likes + comment_likes) | 콘텐츠/댓글 관심사 분리 | 동기화 로직 분산, 테이블 수 증가 |

**선택 근거:** `UNIQUE(target_type, target_id, ip)` 하나로 모든 엔티티의 중복을 DB 레벨에서 차단합니다. 댓글 좋아요는 실시간 `COUNT(*)` 쿼리로 조회하고, Posts만 목록 성능을 위해 `posts.like_count` 캐시 컬럼에 동기화합니다. 인덱스가 적용된 상태에서 수천 건까지 성능 차이가 없으므로, 정합성과 단순성을 우선합니다.

### 비정규화 카운트 캐싱: `posts.like_count`

`likes` 테이블이 좋아요의 **source of truth**이고, `posts.like_count`는 목록 조회 성능을 위한 **캐시 컬럼**입니다.

| 엔티티 | 카운트 방식 | 근거 |
|--------|------------|------|
| **Posts** | `posts.like_count` 캐시 컬럼 동기화 | 목록 조회 시 JOIN 없이 즉시 표시 |
| **Works / 댓글** | 실시간 `COUNT(*)` 쿼리 | 목록에서 카운트 불필요, 상세 페이지에서만 조회 |

**선택 근거:** 포트폴리오 사이트는 읽기 >> 쓰기 비율입니다. Posts만 목록에서 좋아요 수를 표시하므로 캐시 컬럼이 필요하고, 나머지는 실시간 조회로 충분합니다.

### 에디터 리비전 히스토리: `revisions`

Posts/Works 에디터의 자동저장 시 폼 전체를 JSONB snapshot으로 영구 저장하는 다형적 테이블입니다.

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **별도 DB 테이블** (현재 구조) | 기기·탭·세션 간 영속, 엔티티별 자동 정리, diff 비교 가능 | 자동저장마다 DB 쓰기 발생 |
| **sessionStorage** (이전 구조) | 즉시 접근, DB 부하 없음 | 탭 닫으면 소멸, 기기 간 공유 불가 |

**선택 근거:** 포트폴리오 관리자(1인)가 사용하므로 DB 쓰기 비용은 무시 가능합니다. 기기·탭·세션 간 리비전 공유와 diff 기반 상세 비교가 더 중요합니다. `entity_type` CHECK 컬럼으로 posts/works를 단일 테이블에서 구분하고, 목록 조회 시 snapshot을 제외하여 경량 로딩합니다. JSON.stringify 해시 비교로 동일 snapshot 중복 저장을 방지하며, 상세 뷰에서 카테고리·태그·시리즈 등 메타 항목도 diff로 표시합니다.

**자동저장 주기 결정:** 초기에는 5초 debounce로 구현했으나, Google Docs(OT/diff 방식)·Notion(즉시 저장이지만 서버엔 patch)·WordPress(60초)와 비교했을 때 **전체 스냅샷 방식에서 5초는 너무 잦아** 리비전이 무의미하게 누적되는 문제가 있었습니다. diff 방식은 단일 사용자 환경과 스냅샷 50개 제한(~2.5MB) 규모에서 복잡도 대비 이득이 없어 채택하지 않았습니다. **30초 debounce + 페이지 이탈 시 강제 저장**으로 변경했습니다. 이탈 저장은 두 경로로 처리합니다: 브라우저 닫기·새로고침은 `navigator.sendBeacon`(비동기 보장), Next.js SPA 라우팅은 컴포넌트 언마운트 cleanup에서 `fetch({ keepalive: true })`를 사용합니다.

### 익명 댓글 이중 인증

로그인 없는 댓글 시스템에서 수정/삭제 권한을 **2개 경로**로 검증합니다.

| 인증 경로 | 저장 위치 | 지속성 | 용도 |
|-----------|----------|--------|------|
| `commenter_hash` | 브라우저 localStorage UUID → SHA-256 | 같은 브라우저에서 영구 | 자동 인증 (비밀번호 입력 불필요) |
| `password_hash` | bcrypt (salt round 10) | 사용자가 기억하는 한 영구 | 다른 기기/브라우저에서 인증 |

**왜 둘 다 필요한가:** `commenter_hash`만 있으면 브라우저 변경 시 수정 불가. `password`만 있으면 매번 입력 필요. 병행하면 같은 브라우저에서는 자동 인증, 다른 환경에서는 비밀번호 fallback으로 UX와 보안을 모두 확보합니다.

### 댓글 시스템 기능

| 기능 | 설명 |
|------|------|
| **닉네임 셔플** | 랜덤 이모지+이름 조합, 셔플 버튼으로 변경 가능 |
| **답글 이메일 알림** | 댓글 작성 시 이메일(선택) 입력하면 답글 알림 발송 (`notify_email` 컬럼) |
| **관리자 댓글** | 로그인 상태에서 비밀번호 없이 Admin 뱃지로 댓글 작성, 서버 측 Supabase Auth 재검증 |
| **마크다운 본문** | `marked`(gfm + breaks) → `isomorphic-dompurify` sanitize, 태그·속성 화이트리스트 |
| **이모지 반응** | giscus 식 고정 8종 (아래 `comment_reactions`) |

### 댓글 이모지 반응: `comment_reactions`

댓글의 단일 "좋아요" 를 giscus 식 고정 8종 이모지 반응(👍 👎 😄 🎉 😕 ❤️ 🚀 👀 — `src/utils/commentReactions.ts` 의 `REACTION_EMOJIS`)으로 대체한 테이블입니다.

| 컬럼 | 설명 |
|------|------|
| `id` | uuid PK |
| `comment_id` | uuid NOT NULL, **FK 없음** — `comment_type` 에 따라 `comments` 또는 `work_comments` 를 가리키는 다형 참조 |
| `comment_type` | text CHECK (`post` / `work`) |
| `emoji` | text — 고정 8종 중 하나 (서버가 `isReactionEmoji` 로 검증) |
| `reactor_hash` | text DEFAULT `''` — 반응자 식별자 (아래) |
| `created_at` | timestamptz |

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **전용 테이블** (현재 구조) | 이모지 축이 스키마에 명시, 집계가 단순 | `likes` 와 개념이 겹치는 테이블이 하나 더 |
| **`likes` 재사용** (`target_type='post_comment'` + emoji 컬럼) | 테이블 수 유지 | `UNIQUE(target_type, target_id, ip)` 가 이모지 축을 모름 — 한 사람이 여러 이모지를 못 남김. 제약 재설계가 필요해 "재사용" 의 이득이 사라짐 |

**선택 근거:** 좋아요는 `(대상, 사람)` 2축이지만 반응은 `(대상, 사람, 이모지)` 3축이라 `likes` 의 UNIQUE 제약과 축이 맞지 않습니다. 별도 테이블에서 4컬럼 unique 로 토글 단위를 정확히 표현합니다.

중복 방지는 테이블 제약이 아니라 **unique index** `idx_comment_reactions_unique(comment_id, comment_type, emoji, reactor_hash)` 입니다 — `ON CONFLICT` 에는 4컬럼 추론 목록이 필요하고, 이름으로 지정할 named constraint 는 없습니다. 조회용 인덱스는 `(comment_id, comment_type)` 별도.

`comment_id` 에 FK 를 두지 않은 것은 참조 대상 테이블이 `comment_type` 에 따라 갈리는 다형 참조라 단일 FK 로 표현할 수 없기 때문입니다. 따라서 ON DELETE CASCADE 도 없고, 댓글이 완전 삭제돼도 반응 행은 남습니다 (조회가 클라이언트가 보유한 `comment_ids` 기준이라 노출되지는 않음).

**반응자 식별 (`reactor_hash`):** 좋아요의 IP 방식과 같은 취지지만, 원문 IP 를 저장하지 않고 `sha256(IP + ":" + UA)` 의 앞 32자만 보관합니다. IP 단독보다 공용 IP(회사·카페) 뒤 사용자들이 서로를 덮어쓸 확률이 낮고, 저장값 자체가 개인 식별정보가 아닙니다. 로그인 없는 반응이므로 완벽한 식별이 아니라 **일상적 중복 차단**이 목표입니다.

RLS 는 조회 공개(`FOR SELECT USING (true)`) + 쓰기 service_role. 집계·토글은 admin client 로 처리합니다.

### 투표 블록 집계: `poll_votes`

본문 에디터의 투표(poll) 블록 응답을 집계하는 테이블입니다. 투표의 **구조(질문·옵션)는 별도 테이블이 없고**, 에디터 블록의 저장 HTML/JSON 안에 들어 있습니다.

| 컬럼 | 설명 |
|------|------|
| `id` | uuid PK |
| `poll_id` | 에디터가 블록 생성 시 부여하는 고정 text id (저장 HTML `data-poll-id`) |
| `option_id` | 투표 옵션 고정 text id (`data-option-id`) |
| `ip` | 투표자 IP (DEFAULT `''`), 중복 방지용 |
| `created_at` | timestamptz |

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **단일 집계 테이블** (현재 구조) | 투표 구조를 에디터 콘텐츠와 함께 저장, 스키마 단순 | poll_id/option_id 가 FK 가 아닌 text |
| **`polls` + `poll_options` 정규화** | 참조 무결성 | 본문 블록을 저장할 때마다 별도 테이블 동기화 필요, 테이블 증가 |

**선택 근거:** 투표 블록의 질문·옵션은 본문 콘텐츠의 일부이므로 게시물 HTML 안에 함께 저장하고, `poll_votes` 는 **순수 집계**만 담당합니다. 그래서 `poll_id` / `option_id` 는 FK 가 아닌 에디터가 부여한 text id입니다. `UNIQUE(poll_id, option_id, ip)` 로 같은 IP 의 같은 옵션 중복 투표를 DB 레벨에서 차단하고, `poll_id` 인덱스로 집계 조회를 최적화합니다. 단일 선택 투표는 API 가 `(poll_id, ip)` 행을 지우고 다시 넣어 교체하고, 복수 선택은 옵션별 토글(insert/delete)로 처리합니다. RLS 는 public SELECT + service_role ALL (집계/투표는 admin client 로 처리).

### 시리즈↔프로젝트 연결: `series_work_relations`

프로젝트(work)에 관련 시리즈를 연결하는 다대다 테이블로, 기존 `post_work_relations` 와 동일한 패턴입니다.

| 컬럼 | 설명 |
|------|------|
| `series_id` | uuid FK → `series(id)` ON DELETE CASCADE |
| `work_id` | uuid FK → `works(id)` ON DELETE CASCADE |
| `created_at` | timestamptz |

PRIMARY KEY 는 `(series_id, work_id)` 복합키이고, `series_id` / `work_id` 각각에 인덱스가 있습니다. RLS 는 public SELECT + service_role ALL.

**선택 근거:** posts↔works 양방향 연결(`post_work_relations`)이 이미 검증된 다대다 패턴이므로 시리즈↔프로젝트 연결도 동일 구조로 통일했습니다. 양쪽 FK 에 ON DELETE CASCADE 를 걸어 시리즈나 작품 삭제 시 연결 행이 자동 정리되고, 복합 PK 로 같은 쌍의 중복 연결을 차단합니다.

### 캘린더 블록 연결형 저장: `calendars`

에디터의 캘린더 블록이 참조하는 공유 달력 테이블입니다. 블록은 `calendarId` 만 갖고, 실제 이벤트 데이터는 이 테이블에 있습니다.

| 컬럼 | 설명 |
|------|------|
| `id` | uuid PK |
| `title` | text NOT NULL DEFAULT `''` |
| `data` | jsonb NOT NULL DEFAULT `'{}'` — 월/이벤트 등 달력 전체 상태 |
| `created_at` / `updated_at` | timestamptz |
| `deleted_at` | timestamptz — soft delete |
| `purge_after` | timestamptz — 휴지통 TTL (30일) |

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **연결형 저장** (현재 구조) | 여러 글이 같은 달력 공유, 한 곳만 고치면 전부 반영, admin 에서 일괄 관리 | 블록 렌더에 fetch 1회 추가, 글 삭제해도 달력은 남음 |
| **블록 내장 저장** (투표 블록 방식) | fetch 없음, 글과 수명 동일 | 같은 달력을 여러 글에 넣으면 사본이 갈라짐 |

**선택 근거:** 투표 블록은 "이 글의 투표" 라 콘텐츠에 내장하는 게 맞지만, 달력은 **여러 글이 같은 일정을 참조**하는 성격이라 사본이 갈라지면 곧바로 오답이 됩니다. 그래서 투표와 반대로 연결형을 택했습니다. 대신 글과 수명이 분리되므로 posts/works 와 같은 soft delete + `purge_after` 휴지통을 두고, `/api/cron/purge-trash` 가 posts·works 와 함께 `purge_after < NOW()` 인 달력도 hard delete 합니다.

인덱스는 `calendars_purge_after_idx (purge_after) WHERE deleted_at IS NOT NULL` — 휴지통 행만 담는 partial index 로 posts/works 와 동일 패턴입니다. RLS 는 조회 공개 + 쓰기 service_role (달력 블록은 공개 글에서 읽히지만 편집은 admin 전용).

### 커스텀 이모지: `custom_emojis`

EmojiPicker 에 업로드한 커스텀 이미지 아이콘 기록입니다. 값 형식은 `img:<url>`.

| 컬럼 | 설명 |
|------|------|
| `id` | uuid PK |
| `name` | text NOT NULL DEFAULT `''` (서버에서 120자 slice) |
| `src` | text NOT NULL — 업로드된 이미지 URL |
| `created_at` | timestamptz |

**선택 근거:** 원래 `localStorage` 에만 있어 기기·브라우저를 옮기면 업로드한 이모지가 사라졌습니다. DB 로 올려 기기 간 공유되게 하고, `localStorage` 는 **오프라인 캐시 + 첫 페인트용**으로 남겼습니다. picker 를 열면 서버 목록을 fetch 하되, 실패(로그아웃·오프라인) 시 로컬 캐시를 지우지 않고 그대로 유지합니다. 로컬에만 있고 서버에 없는 항목은 POST 로 백필 후 `src` 기준 dedup 병합 — 서버 목록으로 통째 replace 하면 백필 실패 시 그 항목들이 삭제 불가 상태로 남기 때문입니다.

RLS 는 `FOR ALL` service_role 정책 **하나뿐**이라 공개 읽기 정책이 없습니다 (admin 전용, anon 조회는 0행). 조회는 `created_at DESC` 인덱스 + `limit(200)`.

> **주의:** 이 테이블은 `supabase/setup.sql` 에만 있고 `supabase/migrations/` 에 대응 파일이 없습니다. 마이그레이션만 순서대로 적용한 DB 에는 생성되지 않습니다.

### 게시물 낙관적 동시성 제어: `posts.version`

여러 탭·기기에서 같은 글을 편집할 때 마지막 저장이 앞선 저장을 조용히 덮어쓰는 것(lost update)을 막습니다.

| 방식 | 장점 | 단점 |
|------|------|------|
| **낙관적 잠금** (현재 구조 — `version` 컬럼) | 락 없음, 실패 시점에만 사용자에게 물어봄, 컬럼 1개 | 충돌 시 사용자가 해소해야 함 |
| **비관적 잠금** (편집 중 row lock) | 충돌 자체가 없음 | 탭 강제종료 시 락 해제 문제, 1인 admin 에 과함 |
| **CRDT / OT 실시간 병합** | 동시 편집 가능 | 에디터 전체 재설계, 단일 작성자에 이득 없음 |

**선택 근거:** 작성자가 1인이라 실제 충돌은 "내가 두 탭에서 열어둔" 경우가 대부분입니다. 이 빈도에 실시간 병합은 과하고, 그렇다고 조용한 덮어쓰기는 데이터 유실입니다. 로드 시점 버전을 `baseVersion` 으로 보내고 서버가 `UPDATE ... WHERE id = ? AND version = baseVersion` 로 갱신 — 0행이면 그 사이 누가 저장한 것이므로 `409 { error: "version_conflict", currentVersion }` 를 돌려주고, `SaveConflictDialog` 가 **취소 / 최신 불러오기 / 덮어쓰기** 3선택지를 띄웁니다.

보조로 `usePostPresence` 가 Supabase Realtime presence 채널(`post-edit:{postId}`)로 다른 세션을 감지해 **저장 전에** 비차단 경고 배너를 띄웁니다. presence 는 DB 테이블 없이 Realtime 채널 상태만 사용하므로 스키마 영향이 없습니다.

### 그 밖의 컬럼 추가

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `posts.cover_position` | `real NOT NULL DEFAULT 50` | 커버 이미지 세로 초점(%) — 에디터에서 드래그한 위치 영속화 |
| `posts.cover_zoom` | `real NOT NULL DEFAULT 1` | 커버 이미지 확대 배율 |
| `posts.icon` | `text NOT NULL DEFAULT ''` | 글 아이콘 (EmojiPicker 값 — native / `img:url` / `icon:id`) |
| `posts.author_ids` | `text[] NOT NULL DEFAULT '{}'` | 글별 작성자 연결 — 멤버 프로필 id 배열 (멤버/역할은 Supabase `app_metadata` + `author_invites` 로 관리, 아래 참고) |
| `works.icon` | `text NOT NULL DEFAULT ''` | `posts.icon` 미러 |
| `works.title_en` | `text NOT NULL DEFAULT ''` | 작품 제목 영문 (`title`=국문/기본, 빈 값이면 반대 언어로 fallback) |

`cover_position` 은 0–100, `cover_zoom` 은 1–2.5 를 의도하지만 **CHECK 제약은 없고 주석상의 범위**입니다 (검증은 에디터 UI 담당).

`author_ids` 를 별도 `authors` 테이블 + 조인 테이블로 정규화하지 않은 이유: 작성자(멤버) 신원과 권한은 이미 Supabase Auth 에 삽니다 — 역할은 `auth.users.app_metadata`, 초대는 `author_invites` 테이블이 관리합니다 (더 이상 `site.config.ts` 의 정적 `authors[]` 가 아님). `posts.author_ids` 는 그 멤버들을 글에 연결하는 얇은 id 배열일 뿐이라 글 조회마다 조인을 추가할 만큼의 쿼리 요구가 없고, `text[]` 만으로 목록 렌더에 충분합니다.

> 목록 카드 레이아웃(`magazine` / `grid` / `list` / `compact` / `masonry` / `featured`)은 **DB 컬럼이 아니라 사이트 설정** `siteConfig.posts.layout` 입니다 — 글마다가 아니라 사이트 전역으로 적용됩니다.

### 저자 초대 + 역할: `app_metadata` / `author_invites`

멤버(소유자/편집자/저자)와 권한을 별도 `members` 테이블로 두지 않고 **Supabase Auth 에 위임**합니다.

| 저장소 | 무엇 | 이유 |
|--------|------|------|
| `auth.users.app_metadata` | 역할 (`owner` / `editor` / `author`) + `permission_level` (편집자 2 / 저자 1) | **service_role 만 쓰기 가능** — 사용자가 스스로 편집할 수 있는 `user_metadata` 에 넣으면 권한 상승이 가능해짐 |
| `author_invites` 테이블 | 초대 대기열 (`email` PK, `author_id` text — site_settings.profile 프로필 id 참조, `permission_level` int, `invited_by` text, `created_at`, `consumed_at`) | 초대는 아직 계정이 없을 수 있어 user row 로 표현 불가 — 이메일을 PK 로 미리 예약. RLS 는 service_role 전용 |

- **이메일이 PK**: OAuth 로그인 시점에 인증된 이메일로 초대를 조회해 역할을 부여하므로, 이메일이 자연 키입니다.
- **`consumed_at`**: 초대 소비 시각 — 로그인으로 역할이 부여되면 채워지며, 재사용을 막고 대기/완료 초대를 구분합니다.
- **소유자는 env 로 부트스트랩**: 소유자는 초대 테이블에 없고 `OWNER_EMAIL` 환경변수로 지정합니다 — "첫 소유자를 초대할 사람이 없는" 닭과 달걀 문제를 회피.
- **인가는 `/auth/callback` 에서 강제**: OAuth 는 인증만 하므로, 이메일이 `OWNER_EMAIL` 이거나 이미 역할이 있거나 `author_invites` 에 있어야 통과하고, 아니면 계정을 삭제합니다.

### 제목 길이 CHECK 제약

| 제약 | 대상 | 상한 | 비고 |
|------|------|------|------|
| `series_title_maxlen` / `series_title_en_maxlen` | `series.title` / `title_en` | 80자 | `NOT VALID` — 기존 행은 검사 안 함 |
| `posts_title_len` / `posts_title_en_len` | `posts.title` / `title_en` | 120자 | 즉시 검증 (기존 행이 길면 마이그레이션 실패) |

**선택 근거:** 서버 코드에도 검증이 있지만(`SERIES_TITLE_MAX = 80`), API 가 여러 경로(에디터·`.md` 싱크·수동 SQL)로 열려 있어 DB 제약을 최종 방어선으로 둡니다. 시리즈 쪽은 이미 배포된 데이터가 있어 `NOT VALID` 로 신규·수정 행만 검사하게 했습니다.

> **주의:** `posts_title_len` / `posts_title_en_len` 은 마이그레이션 파일에만 있고 `setup.sql` 에는 없습니다. `setup.sql` 로만 세팅한 DB 에는 제목 길이 제약이 걸리지 않습니다.

### About Studio ERD 설정 검증: about_erd_valid

About 페이지의 ERD 는 관리자 설정의 **About Studio** 에서 편집하며, 그 결과는 `site_settings.config` JSONB 안에 `about.erdTables` / `about.erdRelations` 로 저장됩니다. JSONB 라 스키마가 자유롭지만, 공개 About 패널이 `col.type` 을 그대로 SVG 에 그리기 때문에 값이 비면 배포된 다이어그램에 빈 칸이 남습니다. 그래서 **UI · API · DB 3중 검증**을 둡니다 ([제목 길이 CHECK 제약](#제목-길이-check-제약)과 같은 관례).

| 계층 | 위치 | 역할 |
|------|------|------|
| UI | `ErdTableModal` | 편집 중 즉시 막고 사유 표시 |
| API | `checkAboutErd` (`src/lib/api/validateAboutErd.ts`) | `/api/admin/settings` PATCH 에서 검사 — 클라이언트 우회 방어 |
| DB | `about_erd_valid(cfg jsonb)` + `site_settings_about_erd_valid` CHECK | 수동 SQL 등 API 도 우회한 경우의 최종 방어선 |

**검사 규칙** (세 계층 동일):
- 테이블 이름 필수 · 테이블 간 중복 금지 (대소문자 무시)
- 테이블당 컬럼 1개 이상
- 컬럼 이름 · **타입** 필수 · 테이블 내 컬럼 이름 중복 금지
- (API 추가) 관계(`erdRelations`)의 `from`/`to` 는 실재하는 테이블만 가리킬 것

**구현 노트:**
- `config` 는 `{ delta, savedDefaults }` wrapper 구조라, DB 함수도 읽기 경로(`getSiteConfig.ts` 의 `config.delta ?? config`)와 똑같이 `cfg #> '{delta,about,erdTables}'` → `cfg #> '{about,erdTables}'` 순으로 언랩합니다.
- ERD 를 건드리지 않는 대부분의 설정 저장은 `erdTables` 가 없으므로 `RETURN true` 로 그냥 통과합니다 — ERD 를 실제로 바꾼 저장에만 규칙이 걸립니다.
- 함수는 `IMMUTABLE`, 제약은 `NOT VALID` 로 추가합니다. 이미 저장된 config 에 빈 타입이 있으면 `ADD CONSTRAINT` 가 즉시 실패해 배포가 막히기 때문입니다. 기존 행까지 확정하려면 먼저 위반 행을 확인한 뒤 `VALIDATE` 합니다:
  ```sql
  SELECT id FROM site_settings WHERE NOT public.about_erd_valid(config);
  ALTER TABLE site_settings VALIDATE CONSTRAINT site_settings_about_erd_valid;
  ```

**컬럼이 담는 것** — SQL 가져오기가 채우는 선택 필드입니다. 전부 optional 이라 기존에 저장된 ERD 는 그대로 유효하고 마이그레이션이 필요 없습니다.

| 필드 | 출처 SQL | 표시 |
|------|----------|------|
| `required` | `NOT NULL` (PK 는 정의상 참) | 컬럼 이름 뒤 `*` |
| `unique` | 컬럼/테이블 `UNIQUE`, `CREATE UNIQUE INDEX` | `U` 배지 |
| `indexed` | `CREATE INDEX` | `IX` 배지 |
| `defaultValue` | `DEFAULT …`, `serial`, `GENERATED … IDENTITY/STORED` | 타입 뒤 `=값` |
| `comment` | `COMMENT ON COLUMN` | 호버 |
| `enumValues` | `CREATE TYPE … AS ENUM`, `ALTER TYPE … ADD VALUE` | 호버 |
| (테이블) `kind` | `CREATE [MATERIALIZED] VIEW` | 머리글 `VIEW` 배지 |
| (테이블) `comment` | `COMMENT ON TABLE` | 호버 |

DB 함수도 같은 규칙을 검사합니다 — 있으면 타입이 맞아야 하고(`required`/`unique`/`indexed` 는 boolean, `defaultValue`/`comment` 는 문자열, `enumValues` 는 문자열 배열), 테이블 `kind` 는 `'view'` 외의 값을 받지 않습니다. 없으면 그냥 통과합니다.

**병합의 의미론** — 가져오기는 **병합(기본)** 과 **교체** 두 모드가 있고, 되돌리기가 없어 규칙을 코드가 아니라 테스트로 고정해 둡니다(`src/__tests__/mergeErd.test.ts`).

1. 같은 이름 테이블은 **컬럼 병합** — ERD 에만 있던 컬럼은 지우지 않는다
2. 같은 컬럼이 양쪽에 있으면 **SQL 값으로 갱신** — 타입·PK·FK 는 SQL 이 정답
3. 컬럼 순서는 **SQL 정의 순서**, SQL 에 없는 기존 전용 컬럼은 그 뒤에
4. SQL 에 없는 테이블은 손대지 않는다

단 `DROP TABLE` · `DROP COLUMN` · `RENAME` 은 예외입니다. **"SQL 에 없음"과 "SQL 이 지웠음"은 다르므로** 파서가 삭제를 따로 보고하고(`removedTables` / `removedColumns`), 병합이 그것만 실제로 지웁니다. 구별하지 않으면 규칙 1·4 가 삭제를 조용히 되살립니다.

> 이 함수·제약은 `setup.sql` 에도 포함되어, 처음부터 `setup.sql` 로 세팅한 DB 에서도 동일하게 적용됩니다.

### 사이트 설정 필수값 검증: settings_required_valid

관리자 설정(General·Appearance·Services 탭)에는 비워두면 사이트 렌더나 기능이 깨지는 필수 값이 있습니다. 예전엔 전역 "저장" 버튼에만 부분 검증이 있었고 **섹션별 저장 버튼이 그 검증을 우회**해서, 사이트 제목·테마 색상 등을 빈 값으로 저장할 수 있었습니다. 그래서 ERD 검증과 같은 **UI · API · DB 3중 검증**으로 막습니다.

| 계층 | 위치 | 역할 |
|------|------|------|
| UI | `validationError` (`settings/page.tsx`) + `SectionHeader` 저장 가드 | 빈 값이면 전역·섹션 저장 버튼 모두 비활성 + 사유 표시 |
| API | `checkRequiredSettings` (`src/lib/api/validateRequiredSettings.ts`) | `/api/admin/settings` PATCH 에서 검사 — 위반 시 400 |
| DB | `settings_required_valid(cfg jsonb)` + `site_settings_required_valid` CHECK | 수동 SQL 등 API 도 우회한 경우의 최종 방어선 |

**검사 규칙** (세 계층 동일):
- **사이트 제목**(`metadata.title`) · **이름**(`personal.name`) · **테마 색상 5종**(`theme.accentColor`/`lightBg`/`lightText`/`darkBg`/`darkText`) — 비울 수 없음
- **이메일**(`contact.email`) — 입력했다면 형식이 맞아야 함 (빈 값은 허용)
- 댓글 provider 가 `giscus` 면 `repo`·`repoId`·`category`·`categoryId` 필수
- **멤버**(`authors`) 각 항목의 이름 필수

**구현 노트:**
- `about_erd_valid` 와 같이 `config` 의 `{ delta, savedDefaults }` wrapper 를 언랩합니다. 기본값이 비어있지 않은 필드(제목·이름·테마색)는 "delta 에 있으면서 빈 값"일 때만 위반으로 봅니다 — 건드리지 않은 저장은 그냥 통과합니다. giscus 필드는 기본값이 `""` 라 provider 가 `giscus` 일 때 실효값으로 검사합니다.
- 함수는 `IMMUTABLE`, 제약은 `NOT VALID` 로 추가합니다(기존 행 미검사). `setup.sql` 에도 포함되어 처음부터 세팅한 DB 에서도 동일하게 적용됩니다. 마이그레이션 파일: `2026_08_02_settings_required.sql`.



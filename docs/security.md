# Security

모든 공개 API 엔드포인트에 다층 보안 검증을 적용합니다.

| 보안 레이어 | 구현 방식 | 적용 범위 |
|------------|-----------|----------|
| **SQL Injection 방지** | Supabase 파라미터화 쿼리 (prepared statements) | 모든 DB 쿼리 |
| **XSS 방지** | React JSX 자동 이스케이프 + 서버 측 HTML 태그 스트리핑(`<[^>]*>` 제거) + 제어문자 제거 | 모든 사용자 입력 |
| **댓글 마크다운 sanitize** | `marked` → `isomorphic-dompurify` 태그·속성 화이트리스트 + URL 스킴 제한 (아래) | 댓글 본문 |
| **입력 검증** | UUID 포맷 검증, 길이 제한, 이메일 포맷 검증, enum 타입 검증, 카테고리 화이트리스트 검증 | 모든 공개 API |
| **인증** | 댓글 이중 인증 (commenter_hash + bcrypt password), 관리자 댓글 서버 측 Supabase Auth 재검증 | 댓글 수정/삭제, 관리자 |
| **RLS** | Supabase Row Level Security 정책 | 모든 테이블 |
| **경로 보호** | Layout 레벨 Supabase Auth 세션 확인 + 접근 거부 페이지 | `/admin/*` |
| **역할 기반 인가** | 소유자/편집자/저자 역할 + `permission_level` — `requireOwner()` / `requireRole()` / `requireAuth()` 가 매 요청 `app_metadata` 재조회. 사이트 설정 탭은 소유자 전용(비소유자는 `/api/admin/settings` PATCH 가 본인 author 항목 외 쓰기 거부), 클라이언트도 Account 탭만 노출 | 멤버 관리, Settings, admin API |
| **OAuth 인가 게이트** | `/auth/callback` 에서 세션 교환 후 이메일이 `OWNER_EMAIL` / 역할 보유 / `author_invites` 초대 중 하나여야 통과 — 아니면 `signOut()` + service-role `deleteUser()` 로 미초대 계정 차단. 단 `OWNER_EMAIL` 미설정 시엔 삭제하지 않고 설정 에러만 표시(부트스트랩 락아웃 방지) | GitHub OAuth 로그인 |
| **중복 방지** | IP 기반 UNIQUE 제약조건 (투표는 `poll_votes(poll_id, option_id, ip)` UNIQUE), 댓글 반응은 `reactor_hash` (아래) | 좋아요, 방문자 통계, 투표, 댓글 반응 |
| **service_role 쓰기** | `/api/polls` 투표 + related-series 쓰기는 service_role admin client 로 처리 | 투표, 관련 시리즈 편집 |
| **비밀번호 보안** | bcrypt (salt round 10), 72바이트 제한, 최소 2자 | 댓글 비밀번호 |
| **카테고리 검증** | 서버 측 화이트리스트 검증 — 사이트 설정에 등록된 카테고리만 허용 | Posts, Works, Series |
| **시크릿 관리** | API 키 DB 저장, `SUPABASE_SERVICE_ROLE_KEY` 서버 사이드 전용, `NEXT_PUBLIC_` 접두사만 클라이언트 노출 | 환경변수, API 키 |

**서버 측 입력 정제 (`commentValidation.ts`):**

| 함수 | 검증 항목 |
|------|----------|
| `isValidUUID()` | UUID v4 정규식 포맷 검증 |
| `sanitizeContent()` | HTML 태그 스트리핑 + 제어문자 제거 + 2000자 길이 제한 |
| `validatePassword()` | 최소 2자, bcrypt 72바이트 상한 |
| `validateEmail()` | RFC 포맷 검증, 254자 제한, 소문자 정규화 |
| `validateNickname()` | HTML 태그 스트리핑 + 제어문자 제거 + 50자 제한 |

**검증 대상 API:**

| 엔드포인트 | 검증 항목 |
|-----------|----------|
| `POST/PATCH /api/comments` | UUID, content (2000자, HTML strip), nickname (50자), password (72B), email (254자) |
| `POST/PATCH /api/work-comments` | UUID, content (2000자, HTML strip), nickname (50자), password (72B), email (254자) |
| `DELETE /api/comments/[id]` | UUID 포맷 검증 |
| `DELETE /api/work-comments/[id]` | UUID 포맷 검증 |
| `GET/POST /api/comment-reactions` | UUID, comment_type enum (`post`/`work`), emoji 화이트리스트(`isReactionEmoji`) |
| `GET/POST /api/posts/[id]/like` | UUID 포맷 검증 |
| `GET/POST /api/works/[id]/like` | UUID 포맷 검증 |
| `POST/PATCH /api/posts` | 카테고리 화이트리스트 검증 |
| `POST/PATCH /api/works` | 카테고리 쌍(ko/en) 화이트리스트 검증 |
| `POST/PATCH /api/series` | 카테고리 화이트리스트 검증 |
| `POST /api/contact` | 이름 (100자), 이메일 포맷/길이, 메시지 (5000자) |
| `POST /api/translate` | 텍스트 (2000자), targetLang enum |
| `POST /api/posts/reassign-category` | `requireAuth()` — admin client 로 `posts.category` 를 대량 변경하므로 인증 필수 |
| `PATCH /api/admin/settings` | About ERD 형태(`checkAboutErd`) + **필수값(`checkRequiredSettings`)** — 제목·이름·테마색·멤버이름 빈값, giscus 필수 필드, 이메일 형식. 위반 시 400. 클라이언트(섹션 저장 포함) 우회 방어 + DB CHECK(`settings_required_valid`) 최종선 |

**댓글 마크다운 sanitize (`CommentMarkdown.tsx`):**

댓글은 마크다운을 허용하므로 태그 스트리핑이 아니라 **화이트리스트 sanitize** 를 씁니다. 전역 인스턴스가 아닌 독립 `new Marked({ gfm: true, breaks: true })` 로 파싱한 뒤 `isomorphic-dompurify` 로 정제합니다.

| 항목 | 값 |
|------|-----|
| `ALLOWED_TAGS` | `p` `br` `strong` `em` `b` `i` `del` `s` `code` `pre` `blockquote` `ul` `ol` `li` `a` `hr` `img` `input` `h1`~`h6` `table` `thead` `tbody` `tr` `th` `td` `span` |
| `ALLOWED_ATTR` | `href` `title` `src` `alt` `type` `checked` `disabled` `class` `align` |
| `ALLOWED_URI_REGEXP` | `/^(?:https?:\|mailto:)/i` — `data:` 등 차단 |
| `ADD_URI_SAFE_ATTR` | `type` `checked` `disabled` `align` |

`afterSanitizeAttributes` 훅이 추가로 강제하는 것:

- `<a>` → `target="_blank"` + `rel="noopener noreferrer nofollow"`
- `<img>` → `loading="lazy"`
- `<input>` → `type="checkbox"` 가 아니면 **제거**, 체크박스면 `disabled` 강제 (읽기 전용 task list)

> **`ADD_URI_SAFE_ATTR` 가 왜 필요한가:** DOMPurify 는 "URI-safe 로 알려진 속성" 이 아니면 그 **값**을 `ALLOWED_URI_REGEXP` 로 검사합니다. 기본 URI-safe 목록에 `type` 이 없어 `type="checkbox"` 의 값이 URL 정규식에 걸려 조용히 제거됐고, 그 결과 훅이 "체크박스 아님" 으로 판정해 `<input>` 을 지워 체크박스가 불릿으로만 렌더됐습니다. 표의 `align` 도 같은 이유로 죽어 있었습니다. `ALLOWED_ATTR` 에 넣는 것만으로는 해결되지 않습니다 — URL 이 아닌 inert 속성임을 `ADD_URI_SAFE_ATTR` 로 별도 선언해야 URI 검사에서 제외됩니다.

**댓글 이미지 — 외부 URL 전용:**

댓글의 이미지는 **업로드 경로가 없고 외부 호스팅 URL 만** 받습니다 (툴바의 이미지 버튼은 `![alt](url)` 텍스트를 삽입할 뿐, `CommentEditor` 에 파일 input · 드롭 · 붙여넣기 핸들러가 없음). 스킴은 sanitize 단계의 http(s) 정규식이 최종 게이트입니다.

| 방식 | 장점 | 단점 |
|------|------|------|
| **외부 URL 만** (현재 구조) | 익명 사용자에게 Storage 쓰기 권한을 주지 않음 — 용량 남용·악성 파일·업로드 rate limit 문제 자체가 없음 | 원본 호스트가 죽으면 이미지도 깨짐, 뷰어 IP 가 외부 호스트에 노출 |
| **업로드 허용** | 이미지 영속, IP 노출 없음 | 익명 쓰기 = 남용 표면. 용량·검증·정리 정책이 전부 필요 |
| **camo 식 이미지 프록시** | IP 노출 차단 + 영속 | 프록시 자체가 SSRF 표면 + 대역폭 비용, 1인 포트폴리오에 과함 |

**선택 근거:** 로그인 없는 댓글에 Storage 쓰기를 여는 것이 가장 큰 위험이라 **업로드를 아예 두지 않았습니다** (GitHub 초기 방식과 동일). 대신 독자 IP 가 외부 이미지 호스트에 노출되는 tradeoff 를 받아들였습니다 — GitHub 은 camo 프록시로 이걸 가리지만, 프록시는 SSRF 표면과 대역폭을 새로 만드는 반면 이 사이트의 댓글 이미지 사용량은 그 비용을 정당화하지 못합니다.

**댓글 반응 식별자 (`reactor_hash`):**

`comment_reactions` 는 원문 IP 를 저장하지 않고 `sha256(IP + ":" + UA)` 의 앞 32자만 보관합니다. IP 는 `x-forwarded-for` 첫 세그먼트 → `x-real-ip` → `"unknown"` 순으로 해석합니다. 로그인 없는 반응이므로 완벽한 식별이 아니라 **일상적 중복 차단**이 목표이고, 저장값 자체는 개인 식별정보가 아닙니다.

**역할 · 인가 신뢰 경계 (`app_metadata` vs `user_metadata`):**

멤버 역할(`owner` / `editor` / `author` + `permission_level`)은 `auth.users.app_metadata` 에만 저장합니다 — **service_role 만 쓸 수 있는** 필드입니다. 사용자가 직접 편집할 수 있는 `user_metadata` 에 넣으면 클라이언트가 자기 역할을 바꿔 권한 상승이 가능하므로 신뢰 경계가 여기서 갈립니다. 서버 헬퍼(`src/lib/api/requireRole.ts` 의 `requireOwner` / `requireRole` / `requireAuth`)는 매 요청 세션의 `app_metadata` 를 재조회하고, 클라이언트가 보낸 role/level 값은 절대 신뢰하지 않습니다.

**OAuth 인가 게이트:**

GitHub OAuth 는 **인증만** 합니다 — 아무 GitHub 계정이나 로그인 자체는 통과합니다. 실제 인가는 `/auth/callback` 이 `exchangeCodeForSession` 직후 수행: 이메일이 `OWNER_EMAIL` 이거나 이미 역할이 있거나 `author_invites` 초대 행이 있어야 하고, 셋 다 아니면 `signOut()` + service-role `deleteUser()` 로 계정을 삭제한 뒤 에러와 함께 로그인으로 되돌립니다. 초대받지 않은 사용자는 세션도 계정도 남지 않습니다. 비밀번호 로그인(`signInWithPassword`)은 소유자 폴백으로 유지됩니다.

**소유자 부트스트랩 (claim-and-close):** `OWNER_EMAIL` 로 인정된 소유자가 **처음 로그인**하면 그 시점에 `app_metadata.role="owner"` 를 DB 에 1회 못박습니다(`src/lib/api/ownerBootstrap.ts`). 이후엔 env 판정에 의존하지 않고 저장된 역할로 소유권이 유지되므로, `OWNER_EMAIL` 이 바뀌거나 비어도 소유자가 락아웃되지 않습니다. 한편 `OWNER_EMAIL` 자체가 **미설정**이면 소유자를 판정할 수 없는 상태이므로, 미인가 처리에서 계정을 삭제하지 않고(그 계정이 곧 소유자가 돼야 할 수 있으므로) "OWNER_EMAIL 미설정" 설정 에러만 표시합니다 — env 를 지정하고 다시 로그인하면 소유자로 확정됩니다(배포 초기 자기 자신 삭제/락아웃 방지).

**크로스탭 로그아웃 / 세션 전파:**

`AdminAuthSync` 가 Supabase `onAuthStateChange` 를 구독해 `SIGNED_OUT` 이벤트에 `/admin/login` 으로 보냅니다. Supabase 가 auth 상태를 탭 간 브로드캐스트하므로 한 탭에서 로그아웃하거나 전기기 로그아웃(`signOut({ scope: "global" })`)하면 열린 모든 탭이 즉시 로그인 화면으로 떨어집니다 — 이전엔 무효화된 세션이 다른 탭에 수동 새로고침 전까지 남아 있었습니다.



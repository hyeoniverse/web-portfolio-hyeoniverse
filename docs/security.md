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



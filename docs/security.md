# Security

모든 공개 API 엔드포인트에 다층 보안 검증을 적용합니다.

| 보안 레이어 | 구현 방식 | 적용 범위 |
|------------|-----------|----------|
| **SQL Injection 방지** | Supabase 파라미터화 쿼리 (prepared statements) | 모든 DB 쿼리 |
| **XSS 방지** | React JSX 자동 이스케이프 + 서버 측 HTML 태그 스트리핑(`<[^>]*>` 제거) + 제어문자 제거 | 모든 사용자 입력 |
| **입력 검증** | UUID 포맷 검증, 길이 제한, 이메일 포맷 검증, enum 타입 검증, 카테고리 화이트리스트 검증 | 모든 공개 API |
| **인증** | 댓글 이중 인증 (commenter_hash + bcrypt password), 관리자 댓글 서버 측 Supabase Auth 재검증 | 댓글 수정/삭제, 관리자 |
| **RLS** | Supabase Row Level Security 정책 | 모든 테이블 |
| **경로 보호** | Layout 레벨 Supabase Auth 세션 확인 + 접근 거부 페이지 | `/admin/*` |
| **중복 방지** | IP 기반 UNIQUE 제약조건 (투표는 `poll_votes(poll_id, option_id, ip)` UNIQUE) | 좋아요, 방문자 통계, 투표 |
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
| `POST /api/comment-likes` | UUID, comment_type enum 검증 |
| `GET/POST /api/posts/[id]/like` | UUID 포맷 검증 |
| `GET/POST /api/works/[id]/like` | UUID 포맷 검증 |
| `POST/PATCH /api/posts` | 카테고리 화이트리스트 검증 |
| `POST/PATCH /api/works` | 카테고리 쌍(ko/en) 화이트리스트 검증 |
| `POST/PATCH /api/series` | 카테고리 화이트리스트 검증 |
| `POST /api/contact` | 이름 (100자), 이메일 포맷/길이, 메시지 (5000자) |
| `POST /api/translate` | 텍스트 (2000자), targetLang enum |



# Supabase 세팅 가이드

글 · 작업물 · 댓글 · 관리자 화면은 Supabase 프로젝트가 있어야 동작한다.

### 1. 환경변수 설정

[`.env.example`](../.env.example) 을 `.env.local` 로 복사해 채운다. Supabase 와 로그인에 필요한 값은 다음과 같다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# 부트스트랩 소유자 이메일. 이 계정은 초대 없이 소유자 권한을 받는다
OWNER_EMAIL=you@example.com

# 사이트 주소. proxy(src/proxy.ts)의 CSRF Origin 검사 기준이자 메일 발신 도메인
# 배포 환경에서 비어 있으면 /api/* 의 쓰기 요청이 모두 403 이다. 로컬은 검사를 건너뛴다
SITE_URL=https://your-domain.com

# 커버 이미지 검색 (선택)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
PEXELS_API_KEY=your_pexels_api_key

# AI 커버 생성 (선택). 쓰는 공급자의 키만 있으면 된다
HUGGINGFACE_API_KEY=hf_...
NANOBANANA_API_KEY=your_key

# 번역 · AI 요약 (선택). 쓰는 공급자의 키만 있으면 된다
DEEPL_API_KEY=your_deepl_key
GOOGLE_TRANSLATE_API_KEY=your_google_key
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key

# GitHub API 토큰 (선택). 프로필 · 홈의 GitHub 연동과 giscus Discussion 카테고리 조회
GITHUB_TOKEN=ghp_...
```

나머지 선택 키(문의 폼, reCAPTCHA, Resend, TTS, 주기 작업, e2e 계정)와 각 키의 용도는 [deploy.md](./deploy.md#2-환경변수) 에 있다.

어느 공급자를 먼저 쓸지는 환경변수가 아니라 관리자 **설정 › 서비스** 에서 고른다. 기본 공급자와 실패 시 넘어갈 순서(fallback 우선순위)를 그 화면이 `site_settings` 에 저장한다. `src/config/site.config.ts` 의 `aiCover` · `translation` · `aiSummary` · `tts` 값은 저장값이 없을 때의 기본값이다.

API 키도 같은 화면(설정 › 서비스 › 환경 변수)에 저장할 수 있다. 서버는 DB 에 저장된 키를 먼저 쓰고, 없으면 환경변수를 쓴다(`src/lib/getSecret.ts`). Supabase 키 · `SITE_URL` · `OWNER_EMAIL` · `CRON_SECRET` 처럼 그 화면에서 편집할 수 없는 값은 `.env.local` 과 Vercel 환경변수에서만 정한다.

`OWNER_EMAIL` 은 첫 로그인 전에 지정한다. 소유자가 처음 로그인하면 `owner` 역할이 `app_metadata` 에 한 번 저장된다(claim-and-close). 그 뒤로는 이 값이 바뀌거나 비어도 소유권이 유지된다. GitHub OAuth 의 Client ID · Secret 은 `.env.local` 이 아니라 Supabase 대시보드의 **Authentication → Providers → GitHub** 에서 설정한다(4번 참고).

**값 확인 방법:**

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Settings** → **API** 탭
3. `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

> **주의**: `service_role` 키는 RLS를 우회하므로 절대 클라이언트에 노출하면 안 됩니다. `SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 접두사 없이 서버 사이드에서만 사용됩니다.

### 2. 데이터베이스 테이블 생성

[`supabase/setup.sql`](../supabase/setup.sql) 에 테이블 · RLS 정책 · 함수 · 예약 작업 · Storage 버킷 생성이 모두 들어 있다. Supabase Dashboard → **SQL Editor** 에 파일 내용을 붙여 넣고 한 번에 실행한다.

**생성되는 테이블 (26개):**

| 테이블 | 용도 |
|--------|------|
| `site_settings` | 사이트 설정 · 프로필 · 시크릿(API 키). `id` 가 `default` · `profile` · `secrets` 인 세 행에 JSONB 로 담는다 |
| `series` | 블로그 시리즈 (`sort_order`, `auto_cover_url` Unsplash 캐시, 제목 80자 CHECK) |
| `posts` | 블로그 글 (`post_number` 시퀀스, `scheduled_at` 예약 발행, `purge_after` 휴지통 기한, `version` 낙관적 잠금, `author_ids`) |
| `comments` | 글 댓글 (대댓글, 이중 인증: `commenter_hash` + 비밀번호) |
| `work_comments` | 작업물 댓글 (`comments` 와 같은 구조) |
| `comment_reactions` | 댓글 이모지 반응 (고정 8종, `comment_type` 으로 post/work 구분) |
| `comment_reports` | 댓글 신고 (사유 + 처리 상태) |
| `likes` | 좋아요 (글 · 작업물 · 댓글을 `target_type` 으로 구분, IP 중복 방지) |
| `works` | 작업물 (slug, 한/영 제목, `categories_ko/en text[]`, `nature_ko/en`, `contributions_ko/en`, `tech_notes`, `team_members`, `gallery_notes`, `is_pinned` · `view_count` · `like_count`) |
| `page_views` | 사이트의 조회 기록. 방문 · 방문자 · 유입 · 기기 · 국가 · UTM · 머문 시간 · 글/작업물 조회수가 모두 여기서 나온다 |
| `traffic_excluded_ips` | 운영자가 '내 IP' 로 지정한 IP. 이 IP 의 방문은 기록하지 않고 집계에서도 뺀다 |
| `admin_notifications` | 관리자 알림 기록 |
| `revisions` | 편집기 리비전 기록 (posts/works 공용, JSONB snapshot) |
| `post_work_relations` | 글 ↔ 작업물 다대다 |
| `series_work_relations` | 시리즈 ↔ 작업물 다대다 |
| `poll_votes` | 본문 투표 블록 집계 (`poll_id` + `option_id`, IP 중복 방지) |
| `calendars` | 편집기 캘린더 블록이 가리키는 공유 달력 (휴지통 30일) |
| `custom_emojis` | 이모지 선택기에 올린 커스텀 아이콘 |
| `cover_image_history` | 커버 이미지 선택 이력 (사용자별, RLS) |
| `admin_login_attempts` | 관리자 로그인 실패 횟수 (5회 실패 → 15분 잠금) |
| `admin_known_devices` | 관리자가 로그인한 기기 지문 기록 (처음 보는 기기는 알림 메일 · 관리자 알림, 막지는 않음) |
| `security_settings` | 한 줄짜리 보안 설정 (`mfa_required` — 2단계 인증 강제, 기본 true). `mfa_required()` 로만 읽는다 |
| `applied_migrations` | 적용된 마이그레이션 기록 (처음 적용될 때 알림) |
| `author_invites` | 이메일 저자 초대 (`email` PK, `author_id`, `permission_level` 1=저자 / 2=편집자, `consumed_at`) |
| `service_logs` | AI · 외부 서비스 · 메일 · GitHub · 예약 작업의 성공/실패 기록 (90일 보관) |
| `content_translations` | ko · en 밖의 언어로 읽을 때 쓰는 번역 캐시 (원문 해시가 바뀌면 다시 번역) |
| `demo_usage` | About 라이브 데모(번역 · 요약 · 커버 · 음성)의 하루 사용 횟수 (7일 보관) |

예전의 `site_visits` · `post_views` · `work_views` 는 2026-10-17 마이그레이션(`2026_10_17_drop_legacy_views.sql`)에서 `page_views` 로 합쳐지고 삭제됐다.

> `IF NOT EXISTS`를 사용하므로 이미 존재하는 테이블은 건너뜁니다. 기존 배포 DB에 누락된 컬럼(commenter_hash, updated_at 등)은 파일 하단의 마이그레이션 섹션에서 `ALTER TABLE ADD COLUMN IF NOT EXISTS`로 안전하게 추가됩니다.

**setup.sql 과 migrations 의 차이**: `custom_emojis` 는 `setup.sql` 에서만 만들어지고, 이 테이블을 만드는 마이그레이션 파일은 없다. 글 제목 길이 CHECK(`posts_title_len` / `posts_title_en_len`, 120자)는 두 곳에 다 있지만 `setup.sql` 은 `NOT VALID` 로 걸어 기존 행을 검사하지 않고, `2026_07_13_posts_title_len.sql` 은 기존 행까지 바로 검사한다. 새로 세팅할 때는 `setup.sql` 한 번이면 된다.

**2단계 인증 마이그레이션 (기존 DB):** `2026_10_22_rls_require_aal2.sql` 은 RLS 의 역할 판정을 aal2(인증 앱 확인) 세션으로 좁히고 `security_settings` · `mfa_required()` 를 만든다. 새로 세팅하면 `setup.sql` 에 이미 들어 있다. 기존 DB 는 순서를 지킨다: 코드 배포 → 관리하는 모든 계정이 `/admin/mfa` 에서 인증 앱 등록 → SQL Editor 에서 이 파일 실행. 등록 전에 실행하면 aal1 세션은 역할을 잃어 관리 데이터가 보이지 않는다. 자세한 동작은 [security.md](./security.md#2단계-인증을-강제하는-세-겹).

**수동 실행 마이그레이션 (선택):** 아래 두 파일은 데이터를 다시 쓰는 스크립트라 자동으로 적용되지 않는다. 필요할 때만 SQL Editor 에서 직접 실행한다.

| 파일 | 하는 일 |
|------|---------|
| `2026_07_13_category_reset.sql` | `site_settings` 의 카테고리 override 를 제거하고 `posts.category` / `series.category` 를 새 택소노미로 remap. **WHERE 절 없이 전 행을 갱신하고, 매핑에 없는 값은 `ELSE '기타'` 로 흡수**되므로 실행 전 [0] 단계의 분포 출력을 반드시 확인 |
| `2026_07_13_tag_descriptions_reset.sql` | `site_settings` 의 `tagDescriptions` override 를 제거해 `site.config.ts` 의 기본 사전이 보이게 함 (`posts.tags` / `tag_notes` 는 건드리지 않음) |

> **Supabase 없이도 동작**: 환경변수가 설정되지 않으면 Works(`data/projects.ts`), Profile(`data/profile.ts`), Settings(`config/site.config.ts`)의 정적 데이터로 자동 fallback됩니다.

**API 라우트 목록**은 문서에 따로 적지 않는다. `src/app/api` · `src/app/auth` 의 `route.ts` 에서 빌드 전에 만드는 [`src/data/generated/apiMap.ts`](../src/data/generated/apiMap.ts) 가 라우트마다 메서드 · 접근 등급 · 쓰는 테이블 · 외부 서비스를 담는다. 직접 다시 만들려면 `npm run gen-api-map` 을 실행한다. About 페이지의 구조 장도 이 파일을 그린다.

### 3. Storage 버킷

`setup.sql` 이 공개 버킷 두 개를 만든다.

| 버킷 | 공개 | 쓰는 곳 |
|------|------|---------|
| `uploads` | 공개 | `/api/admin/upload` 의 일반 첨부 (로고 · 이력서 · BGM 등) |
| `posts` | 공개 | 게시물 이미지와 커버(`/api/upload`, AI 생성 · Unsplash 내려받기) |

두 버킷에는 누구나 읽는 SELECT 정책만 있고 업로드 정책은 없다. 브라우저 업로드는 서버가 발급한 서명 URL(`/api/upload/signed-url`)로만 이뤄지고, 서버 업로드는 service_role 로 한다. `authenticated` 에 INSERT 를 열면 멤버가 서버의 확장자 · 크기 검증을 건너뛸 수 있으므로 정책을 두지 않는다.

문의 폼 첨부 버킷 `contact-attachments` 는 마이그레이션 `2026_10_19_contact_attachments_bucket.sql` 이 만든다. 비공개 버킷이고 크기 상한은 25MB 다. 정책은 없다. 방문자 브라우저는 `/api/contact/upload` 가 발급한 서명 URL 로 올리고, 메일 본문에는 서버가 만든 7일짜리 내려받기 링크가 붙는다.

### 4. Admin 계정 생성

Supabase Dashboard → **Authentication** → **Users** → **Add user**:

- Email과 Password 입력
- **Auto Confirm User** 체크 (이메일 인증 건너뛰기)

**소유자 계정 (`OWNER_EMAIL`)**: 위에서 만든 이메일을 `OWNER_EMAIL` 에 지정하면 그 계정이 부트스트랩 소유자가 된다. 첫 로그인 전에 지정해야 한다. 지정하지 않고 로그인하면 소유자를 판정할 수 없어 진입이 막힌다. 이때는 계정을 지우지 않고 설정 안내만 보여 주므로, 값을 지정한 뒤 다시 로그인하면 된다. 나머지 멤버는 이메일 초대로 추가한다(5번 참고).

**GitHub OAuth 로그인 설정** — 멤버는 GitHub OAuth 로 로그인합니다:

1. **GitHub OAuth App 생성**: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Authorization callback URL 에 `https://<PROJECT_REF>.supabase.co/auth/v1/callback` 입력
2. Supabase Dashboard → **Authentication → Providers → GitHub** 를 활성화하고 위 OAuth App 의 Client ID + Secret 붙여넣기
3. Supabase **Authentication → URL Configuration → Redirect URLs** 에 사이트의 `/auth/callback` 추가

### 5. Admin 로그인 방법

로그인 화면은 `/admin/login` 이다. 푸터의 **Login** 링크가 이 주소(`/admin/login?next=/admin`)로 간다.

**GitHub OAuth 로그인** (멤버 표준 경로):

1. `/admin/login` 에서 **GitHub 로 로그인** → `supabase.auth.signInWithOAuth` → GitHub 인증 → `/auth/callback` 으로 돌아온다.
2. `/auth/callback` 이 이메일이 `OWNER_EMAIL` 이거나, 이미 역할이 있거나, `author_invites` 에 초대가 있는지 확인한다. 통과하면 초대를 소비하고 역할을 `app_metadata` 에 넣는다. 소유자의 첫 로그인이면 `owner` 역할을 한 번 저장한다. 셋 다 아니면 계정을 지우고 오류와 함께 로그인 화면으로 돌려보낸다. 단 `OWNER_EMAIL` 이 비어 있으면 지우지 않고 설정 안내 오류만 보여 준다.
3. 성공하면 `next` 주소로 간다. `next` 가 없으면 `/admin`(대시보드)이다.

**비밀번호 로그인** (소유자 폴백):

1. `/admin/login` 접속
2. Supabase에서 생성한 이메일/비밀번호 입력
3. 성공하면 `next` 주소로, `next` 가 없으면 `/admin/settings` 로 간다. 처음 보는 기기면 알림 메일만 보내고 막지는 않는다.

**2단계 인증** (모든 역할 필수): 비밀번호나 GitHub 로그인 뒤의 세션은 aal1 이라, proxy 가 `/admin/mfa` 로 보낸다. 처음이면 QR 코드로 인증 앱(TOTP)을 등록하고, 그다음부터는 6자리 코드만 넣는다. 확인되면 aal2 세션이 되어 원래 가려던 주소로 간다. Supabase 의 TOTP MFA 는 모든 플랜에서 무료이고 기본으로 켜져 있어 대시보드에서 따로 설정할 것이 없다(유료인 전화 · SMS MFA 는 쓰지 않는다).

**멤버 추가 (이메일 초대)**: 소유자가 설정 › **계정** 탭에서 이메일로 멤버를 초대하면 `author_invites` 행이 생기고 Resend 안내 메일이 나간다. 초대받은 사람이 같은 이메일의 GitHub 로 로그인하면 저자 또는 편집자 권한을 얻는다. 소유자가 같은 탭에서 멤버 목록 · 역할 · 권한을 관리한다.

**로그인 후 쓰는 화면:**

- `/admin`: 대시보드. 아래에 트래픽 · 알림 · 신고 · 댓글 · 서비스 기록 화면이 있다.
- `/admin/posts`: 글 목록. 위쪽 시리즈 패널에서 시리즈 순서 바꾸기 · 삭제 · 내보내기를 한다.
- `/admin/posts/new` · `/admin/posts/[id]/edit`: 글 편집기 (Markdown ↔ Rich Text, 자동 번역, 자동 저장 + 리비전 기록 + diff 비교)
- `/admin/works`: 작업물 목록 (발행 전환, 정렬 순서, `.md` 업로드)
- `/admin/works/new` · `/admin/works/[id]/edit`: 작업물 편집기 (한/영, 기술 스택, 갤러리)
- `/admin/settings`: 사이트 설정. 탭은 여섯 개다.

| 탭 | 내용 |
|----|------|
| 일반 | 개인 정보 · 연락처, SEO 메타데이터(기본 콘텐츠 언어 포함), BGM |
| 콘텐츠 | 홈 · 프로필 · 작업물 · 글 하위 탭 |
| 라이브러리 | 캘린더 · 투표 · 커스텀 이모지 · 커버 이력 · 파일 · 댓글 이미지 |
| 외관 | 테마 · 글꼴 · 날짜 선택기 모양 · 브랜드(로고 · 파비콘) |
| 서비스 | 이메일 서비스, AI 커버 · 요약 · 모델, reCAPTCHA, 번역, TTS, 댓글 알림 메일, 댓글 공급자, 미디어 제한, API 키 |
| 계정 | 관리자 이메일 · 비밀번호, 보안, 멤버 관리(소유자 전용) |

계정 탭을 뺀 다섯 탭은 소유자만 연다. 소유자가 아닌 멤버에게는 계정 탭만 보인다(`src/lib/adminAccess.ts` 의 `canOpenSettingsTab`).

기본 콘텐츠 언어(`metadata.defaultLanguage`)는 관리자 작성 폼에서 어느 언어를 필수 입력으로 둘지와 편집기의 첫 언어 탭을 정한다. 방문자에게 보이는 언어와는 관계없다.

### 6. Cover Image Picker 사용법

글 · 시리즈 · 작업물 편집기의 커버 이미지 영역에서 **Upload**(직접 업로드)와 **Choose cover**(선택기) 중 하나를 고른다. **Choose cover** 를 누르면 탭 여섯 개가 나온다. 모바일에서는 바텀 시트로 열린다.

| 탭 | 설명 | 필요한 환경변수 |
|----|------|----------------|
| **Presets** | 그라데이션 프리셋 16종과 그라데이션 편집기. 고르면 Canvas API 로 이미지를 만들어 Supabase 에 올린다. `public/cover/videos/` 의 로컬 영상도 같은 탭에 나온다(`/api/admin/cover`) | 없음 |
| **Project** | 저장소에 커밋된 `public/images/screenshots/` 이미지를 폴더별로 고른다(`/api/admin/project-images`) | 없음 |
| **Unsplash** | 키워드로 Unsplash 사진 검색 → 고르면 다운로드 기록 + Supabase 업로드 | `UNSPLASH_ACCESS_KEY` |
| **Pexels** | 키워드로 Pexels 사진 검색 → 고르면 Supabase 업로드 | `PEXELS_API_KEY` |
| **AI Generate** | 프롬프트 + 스타일 → AI 이미지 생성 → Supabase 업로드. 설정 › 서비스에서 AI 커버를 켰을 때만 보인다 | 공급자별 API key (아래 참고) |
| **History** | 지금까지 고른 커버 기록(`cover_image_history`). 다시 고르기 · 다운로드 · 키워드와 색상표 복사 | 없음 |

---

#### AI Generate — 공급자 설정

공급자는 관리자 **설정 › 서비스** 의 AI 커버 항목에서 고른다. 기본 공급자와 실패 시 넘어갈 순서를 함께 정한다. `site.config.ts` 의 `aiCover.provider` 는 저장값이 없을 때의 기본값이다.

| Provider | 모델 | 환경변수 | 가격 | 발급 방법 |
|----------|------|----------|------|-----------|
| **huggingface** | 설정 › 서비스에서 고름. 기본 `latest` = Hub 에서 지금 돌릴 수 있는 text-to-image 인기 1위(Inference Providers 자동 라우팅) | `HUGGINGFACE_API_KEY` | 공급자별 과금(월 무료 크레딧) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → New token → `Inference Providers` 권한 체크 |
| **nanobanana** | 설정 › 서비스에서 고름. `nanobanana-2`(기본·최신) · `nanobanana-pro` · `nanobanana` | `NANOBANANA_API_KEY` | ~$0.02/장 (가입 시 무료 크레딧) | [nanobananaapi.ai/api-key](https://nanobananaapi.ai/api-key) → 회원가입 → API Key 복사 |

**설정 예시 (.env.local):**

```env
# Hugging Face 사용 시 (권장 — 무료)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 또는 NanoBanana 사용 시
# NANOBANANA_API_KEY=nb_xxxxxxxxxxxxxxxx

```

쓰는 공급자의 키만 넣으면 된다. 쓰지 않는 공급자의 키는 비워 둔다.

---

#### Hugging Face API Key 발급 (권장)

1. [huggingface.co](https://huggingface.co/join) 회원가입
2. [Settings → Access Tokens](https://huggingface.co/settings/tokens) 이동
3. **Create new token** 클릭
4. Token type: **Fine-grained** 선택
5. Token name: 아무 이름 (예: `portfolio-cover`)
6. Permissions 설정:
   - **Inference Providers** → **Make calls to Inference Providers** 체크 (필수)
   - 나머지 권한은 모두 체크 해제해도 됨
7. **Create token** → `hf_...` 형식의 토큰 복사
8. `.env.local`에 `HUGGINGFACE_API_KEY=hf_...` 입력

> 무료 계정 기준 시간당 수백 건 호출 가능. 커버 이미지 생성 용도로는 충분합니다.

#### NanoBanana API Key 발급

1. [nanobananaapi.ai](https://nanobananaapi.ai) 회원가입
2. [API Key 관리 페이지](https://nanobananaapi.ai/api-key) 이동
3. API Key 복사 (별도 권한 설정 없음 — 키 하나로 전체 API 접근)
4. `.env.local`에 `NANOBANANA_API_KEY=...` 입력

> 가입 시 무료 크레딧 제공. 이후 ~$0.02/장. 비동기 방식(생성 요청 → 폴링)이라 응답까지 수~십 초 걸릴 수 있습니다.

---

#### Unsplash API Key 발급

1. [Unsplash Developers](https://unsplash.com/developers) 가입
2. **Your apps** → **New Application** 클릭
3. 가이드라인 동의 체크 후 앱 이름/설명 입력 → **Create application**
4. 생성된 앱 페이지에서 **Access Key** 복사 (Secret Key 아님)
5. `.env.local`에 `UNSPLASH_ACCESS_KEY=...` 입력

> Demo 앱 기준 시간당 50건 제한. Production 승인 시 5,000건/시간.

#### Pexels API Key 발급

1. [Pexels API](https://www.pexels.com/api/) 가입
2. **Your API Key** 페이지에서 Key 복사 (별도 신청 없이 즉시 발급)
3. `.env.local`에 `PEXELS_API_KEY=...` 입력

> 무료 — 시간당 200건, 월 20,000건. Unsplash 정책 변경 / rate limit 시 대안으로 활용.

#### GitHub Token 발급

프로필·홈의 GitHub 연동(저장소 목록·조직 저장소·활동 잔디)과, 댓글을 giscus 로 쓸 때 admin 설정에서 저장소의 Discussion 카테고리를 자동으로 불러오는 데 사용합니다.

1. [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) 이동
2. 토큰 생성 — **공개 데이터만 읽으므로 별도 스코프 체크 불필요**
3. `.env.local` 에 `GITHUB_TOKEN=...` 입력하거나, admin **Services** 탭에 저장 (DB 시크릿이 환경변수보다 우선)

> 토큰이 없어도 공개 저장소 목록은 익명으로 조회하지만, IP당 시간 60회 제한이라 소진되면 조직 저장소가 간헐적으로 빠집니다. `/profile` 의 활동 잔디는 GraphQL 전용이라 토큰이 꼭 필요합니다.
>
> **조직 저장소가 안 잡히면**: 조직은 만료 기한이 366일을 넘는 fine-grained(`github_pat_`) 토큰을 거부할 수 있습니다. 기한을 1년 이하로 줄여 다시 발급하거나 classic(`ghp_`) 토큰을 쓰세요.

**인증 플로우:**

아래는 로그인 경로와 관리자 화면 진입 경로를 순서대로 적은 것이다.

```
/admin/login (GitHub 로 로그인)
  → supabase.auth.signInWithOAuth({ provider: "github" })
    → GitHub 인증 → GET /auth/callback?next=…
      → exchangeCodeForSession (인증만 수행)
      → 인가 게이트: 이메일이 OWNER_EMAIL || 역할 보유 || author_invites 초대?
        → 통과 → app_metadata 에 역할 부여 + 초대 소비(consumed_at)
                 (소유자 첫 로그인이면 owner 역할을 app_metadata 에 1회 저장)
        → 실패 & OWNER_EMAIL 설정됨 → signOut() + service-role deleteUser() → 오류와 함께 /admin/login
        → 실패 & OWNER_EMAIL 미설정 → 삭제 없이 "OWNER_EMAIL 미설정" 오류
  → next 주소로 (기본 /admin)

/admin/login (폼 제출 — 소유자 폴백)
  → POST /api/admin/auth
    → IP 제한(10분 20회) → 잠금 확인(admin_login_attempts, 소문자 이메일) → signInWithPassword()
    → 기기 기록 (처음 보는 기기면 알림 메일 · 관리자 알림)
    → 세션 쿠키 설정 (aal1)
  → next 주소로 (기본 /admin/settings), 전체 페이지 이동(window.location.assign)

/admin/* 접속 시
  → proxy: 로그인한 사용자가 없으면 /admin/login, aal1 세션이면 /admin/mfa?next=…, 권한이 모자란 화면이면 /admin/posts
  → Dashboard layout: getUser() 가 없으면 /admin/denied
  → 서버 헬퍼가 app_metadata 역할을 다시 확인
  → AdminAuthSync 가 onAuthStateChange 구독 → 다른 탭에서 SIGNED_OUT 시 /admin/login

/admin/login 접속 시
  → Auth layout 에서 세션 확인
  → 이미 로그인 → /admin
```

테스트 실행 방법은 [testing.md](./testing.md), 토큰과 컴포넌트는 [design-system.md](./design-system.md)와 `/design-system` 페이지에서 볼 수 있다.

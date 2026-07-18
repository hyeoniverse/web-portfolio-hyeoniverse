# Supabase 세팅 가이드

Posts 기능을 사용하려면 Supabase 프로젝트 세팅이 필요합니다.

### 1. 환경변수 설정

`.env.local` 파일을 프로젝트 루트에 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# 부트스트랩 소유자 이메일 — 이 계정은 초대 없이 자동으로 소유자 권한 (GitHub OAuth 로그인 / 멤버 관리)
OWNER_EMAIL=you@example.com

# production 도메인 — middleware 의 CSRF Origin 체크 기준
# production 에 미설정 시 admin mutation 이 모두 403 (fail-closed). dev 는 비워둬도 통과
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Cover Image Picker — Unsplash (선택사항)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Cover Image Picker — Pexels (선택사항, Unsplash 대안)
PEXELS_API_KEY=your_pexels_api_key

# Cover Image Picker — AI Generate (provider에 맞는 키 하나만 설정)
# site.config.ts의 aiCover.provider 값에 따라 해당 키 사용
HUGGINGFACE_API_KEY=hf_...          # provider: "huggingface"
NANOBANANA_API_KEY=your_key         # provider: "nanobanana"

# Translation — 선택한 provider에 맞는 키만 설정
# site.config.ts의 translation.provider 값에 따라 해당 키 사용 (기본: deepl)
DEEPL_API_KEY=your_deepl_key                   # provider: "deepl" (기본)
GOOGLE_TRANSLATE_API_KEY=your_google_key        # provider: "google"
GEMINI_API_KEY=your_gemini_key                  # provider: "gemini"
ANTHROPIC_API_KEY=your_anthropic_key            # provider: "claude" (번역 + AI 요약)

# giscus 댓글 (선택) — admin 설정에서 저장소의 Discussion 카테고리를 불러올 때만 사용
# 공개 저장소 읽기용 GitHub PAT (별도 권한 없이도 공개 데이터 조회 가능)
GITHUB_TOKEN=ghp_...
```

> `GITHUB_TOKEN` 은 admin Services 탭에 저장한 시크릿이 우선이고, 없으면 환경변수를 씁니다 (`getSecret("GITHUB_TOKEN")`).

> `OWNER_EMAIL` 은 부트스트랩 소유자를 지정합니다 (초대 테이블 없이 자동으로 전체 권한). GitHub OAuth 자체(Client ID/Secret)는 `.env.local` 이 아니라 Supabase 대시보드의 **Authentication → Providers → GitHub** 에서 설정합니다 (4번 참고). 멤버 초대 메일은 Resend (인증된 도메인) 를 사용합니다.

**값 확인 방법:**

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Settings** → **API** 탭
3. `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

> **주의**: `service_role` 키는 RLS를 우회하므로 절대 클라이언트에 노출하면 안 됩니다. `SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 접두사 없이 서버 사이드에서만 사용됩니다.

### 2. 데이터베이스 테이블 생성

[`supabase/setup.sql`](supabase/setup.sql) 파일에 전체 테이블 생성 + RLS 정책이 포함되어 있습니다.

Supabase Dashboard → **SQL Editor**에서 파일 내용을 복사하여 한 번에 실행하면 됩니다.

**생성되는 테이블 (23개):**

| 테이블 | 용도 |
|--------|------|
| `site_settings` | 사이트 설정 + 프로필 데이터 + secrets/API 키 (JSONB) |
| `series` | 블로그 시리즈 (sort_order — admin 정렬, auto_cover_url — Unsplash 캐시, 제목 80자 CHECK) |
| `posts` | 블로그 포스트 (post_number 시퀀스 + `scheduled_at` 예약 발행 + `purge_after` 휴지통 TTL + `version` 낙관적 잠금 + `icon` / `cover_position` / `cover_zoom` / `author_ids`) |
| `comments` | 포스트 댓글 (대댓글, 이중 인증: commenter_hash + password) |
| `comment_reactions` | 댓글 이모지 반응 (고정 8종, `comment_type` 으로 post/work 구분, `reactor_hash` 중복 방지) |
| `comment_reports` | 댓글 신고 (사유 + resolve/dismiss 상태) |
| `likes` | 좋아요 (포스트/작업물/댓글 통합, target_type으로 구분, IP 중복 방지) |
| `works` | 포트폴리오 작업물 (slug, `title`/`title_en` (이중언어 제목), `categories_ko/en text[]` + GIN, `nature_ko/en`, `contributions_ko/en jsonb`, `tech_notes jsonb`, team_members jsonb, `icon`, `scheduled_at`, `purge_after`) |
| `site_visits` | 방문자 통계 (IP+날짜 1회) |
| `post_views` | 게시물별 시계열 조회 기록 (대시보드 일별 추세 차트) |
| `work_comments` | Works 댓글 (대댓글, 이중 인증) |
| `admin_notifications` | 관리자 알림 로그 |
| `revisions` | 에디터 리비전 히스토리 (posts/works 공용, JSONB snapshot) |
| `post_work_relations` | posts ↔ works 양방향 다대다 (Notion Relation 스타일) |
| `series_work_relations` | series ↔ works 다대다 (프로젝트에 관련 시리즈 연결, post_work_relations 와 동일 패턴) |
| `poll_votes` | 본문 투표 블록 집계 (poll_id + option_id — 에디터 부여 text id, IP 기반 중복 방지) |
| `calendars` | 에디터 캘린더 블록의 공유 달력 (`data jsonb`, soft delete + `purge_after` 30일 TTL) |
| `custom_emojis` | EmojiPicker 커스텀 업로드 아이콘 (admin 전용 RLS) |
| `cover_image_history` | Cover Image Picker 통합 이력 (admin user 별, ai/unsplash/preset 구분, RLS) |
| `admin_login_attempts` | 관리자 로그인 실패 카운터 (5회 실패 → 15분 잠금) |
| `admin_known_devices` | 승인된 관리자 기기 UA 지문 (SHA-256, 미등록 기기는 이메일 승인 24h TTL) |
| `applied_migrations` | 적용된 schema migration 추적 (최초 적용 시 알림 발생) |
| `author_invites` | 이메일 저자 초대 (email PK, author_id — site_settings.profile 의 프로필 id 참조, permission_level 1=저자/2=편집자, invited_by, created_at, consumed_at, RLS service_role 전용). OAuth 로그인 시 역할이 app_metadata 에 부여되고 초대 소비 |

> `IF NOT EXISTS`를 사용하므로 이미 존재하는 테이블은 건너뜁니다. 기존 배포 DB에 누락된 컬럼(commenter_hash, updated_at 등)은 파일 하단의 마이그레이션 섹션에서 `ALTER TABLE ADD COLUMN IF NOT EXISTS`로 안전하게 추가됩니다.

> **setup.sql ↔ migrations 차이**: `custom_emojis` 는 `setup.sql` 에만 있고 대응 마이그레이션 파일이 없습니다. 반대로 `posts` 제목 길이 CHECK(`posts_title_len` / `posts_title_en_len`, 120자)는 `2026_07_13_posts_title_len.sql` 에만 있고 `setup.sql` 에는 없습니다. 신규 세팅은 `setup.sql` 한 번으로 충분하지만, 두 경로를 섞어 쓴다면 이 두 항목을 확인하세요.

**수동 실행 마이그레이션 (선택):** 아래 두 파일은 데이터 재작성 스크립트라 자동 적용되지 않습니다. 필요할 때만 SQL Editor 에서 직접 실행하세요.

| 파일 | 하는 일 |
|------|---------|
| `2026_07_13_category_reset.sql` | `site_settings` 의 카테고리 override 를 제거하고 `posts.category` / `series.category` 를 새 택소노미로 remap. **WHERE 절 없이 전 행을 갱신하고, 매핑에 없는 값은 `ELSE '기타'` 로 흡수**되므로 실행 전 [0] 단계의 분포 출력을 반드시 확인 |
| `2026_07_13_tag_descriptions_reset.sql` | `site_settings` 의 `tagDescriptions` override 를 제거해 `site.config.ts` 의 기본 사전이 보이게 함 (`posts.tags` / `tag_notes` 는 건드리지 않음) |

> **Supabase 없이도 동작**: 환경변수가 설정되지 않으면 Works(`data/projects.ts`), Profile(`data/profile.ts`), Settings(`config/site.config.ts`)의 정적 데이터로 자동 fallback됩니다.

**주요 API 엔드포인트:**

> **Posts API**: `GET/POST /api/posts`, `GET/PATCH/DELETE /api/posts/[id]`, `POST /api/posts/[id]/view`, `GET/POST /api/posts/[id]/like`, `GET /api/posts/export` (단일/전체/시리즈 .md 내보내기)
>
> **Series API**: `GET/POST /api/series`, `GET/PATCH/DELETE /api/series/[id]`
>
> **Works API**: `GET/POST /api/works`, `GET/PATCH/DELETE /api/works/[id]`, `GET/POST /api/works/[id]/like`, `GET /api/works/export` (단일/전체 .md 내보내기)
>
> **Comments API**: `GET /api/comments?post_id=`, `POST /api/comments`, `PATCH /api/comments` (수정), `DELETE /api/comments/[id]`
>
> **Work Comments API**: `GET /api/work-comments?work_id=`, `POST /api/work-comments`, `PATCH /api/work-comments` (수정), `DELETE /api/work-comments/[id]`
>
> **Comment Reactions API**: `GET /api/comment-reactions?comment_type=&comment_ids=` (반응 집계 + 내 반응 일괄 조회), `POST /api/comment-reactions` (이모지 반응 토글)
>
> **Calendars API**: `GET/POST /api/calendars` (목록 — `?trash=true` 면 휴지통 / 생성), `GET/PUT/DELETE /api/calendars/[calendarId]`, `POST /api/calendars/[calendarId]/restore`, `DELETE /api/calendars/[calendarId]/purge` — 모두 admin 전용
>
> **Custom Emojis API**: `GET/POST /api/custom-emojis`, `DELETE /api/custom-emojis/[id]` — EmojiPicker 커스텀 아이콘, admin 전용
>
> **Upload API**: `POST /api/upload` (서버 경유 업로드, MIME 별 크기 제한 + 절대 상한 200MB), `POST /api/upload/signed-url` (Storage 직접 업로드용 signed URL 발급 — 파일명·타입만 전송해 요청 본문 크기 제한 회피)
>
> **Admin API**: `POST /api/admin/auth`, `GET/PATCH /api/admin/settings`, `GET/PATCH /api/admin/profile`, `GET/PATCH /api/admin/account`, `GET/PUT /api/admin/secrets`, `POST /api/admin/upload`, `POST /api/admin/translate`, `GET /api/admin/giscus-repo?repo=owner/name` (GitHub GraphQL 로 repoId + Discussion 카테고리 조회, `GITHUB_TOKEN` 필요)
>
> **Auth & Members API**: `GET /auth/callback` (OAuth 콜백 + 인가 게이트 — 미초대 계정 삭제), `GET /api/admin/me` (현재 사용자 email/role/level/isOwner — settings 탭 게이팅), `GET|PATCH|DELETE /api/admin/authors/members` (소유자 전용 — 멤버 + 대기 초대 목록 / 권한 변경·저자 프로필 연결 / 계정 삭제), `GET /api/admin/authors/context` (requireAuth, 비소유자 접근 가능 — ownerEmail + 멤버 author-id/email 반환), `POST /api/admin/authors/invite` (소유자 전용 — author_invites insert + Resend 메일)
>
> **Revisions API**: `GET /api/revisions?entity_type=&entity_id=` (목록, snapshot 제외), `POST /api/revisions` (저장 + 50개 초과 정리), `GET /api/revisions/[id]` (snapshot 포함 단건), `DELETE /api/revisions/[id]`
>
> **Categories API**: `GET /api/categories` (Posts 이중언어 카테고리 목록), `GET /api/works-categories` (Works 이중언어 카테고리 목록)
>
> **Polls API**: `GET/POST /api/polls/[pollId]` (본문 투표 블록 집계 조회 / 투표)
>
> **Related Series API**: `GET /api/works/[id]/related-series` (공개 관련 시리즈), `GET/PUT /api/admin/works/[id]/related-series` (관리자 관련 시리즈 편집)
>
> **Utility API**: `POST /api/translate` (공개, Gemini 단일 텍스트), `POST /api/posts/reassign-category` (카테고리 일괄 재할당), `GET /api/fonts/search?q=` (Google Fonts 자동완성 검색), `POST /api/highlight` (서버사이드 코드 하이라이팅)

### 3. Storage 버킷 생성

이미지·이력서·BGM 업로드용:

1. Supabase Dashboard → **Storage**
2. **New bucket** 클릭
3. 버킷 이름: `uploads`
4. **Public bucket** 체크 (파일을 공개 URL로 접근 가능하게)
5. **Create bucket**

> 업로드 API가 폴더별로 파일을 구분합니다: `logos/`, `resume/`, `bgm/`, `covers/`, `images/` 등

**Storage 정책 설정:**

```sql
-- 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- 누구나 읽기 가능 (public bucket)
CREATE POLICY "Anyone can view uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');
```

### 4. Admin 계정 생성

Supabase Dashboard → **Authentication** → **Users** → **Add user**:

- Email과 Password 입력
- **Auto Confirm User** 체크 (이메일 인증 건너뛰기)

**소유자 계정 (`OWNER_EMAIL`)**: 위에서 만든 이메일을 환경변수 `OWNER_EMAIL` 에 지정하면 그 계정이 부트스트랩 소유자가 됩니다 (초대 테이블 없이 자동으로 전체 권한). 나머지 멤버는 이메일 초대로 추가합니다 (5번 참고).

**GitHub OAuth 로그인 설정** — 멤버는 GitHub OAuth 로 로그인합니다:

1. **GitHub OAuth App 생성** — GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Authorization callback URL 에 `https://<PROJECT_REF>.supabase.co/auth/v1/callback` 입력
2. Supabase Dashboard → **Authentication → Providers → GitHub** 를 활성화하고 위 OAuth App 의 Client ID + Secret 붙여넣기
3. Supabase **Authentication → URL Configuration → Redirect URLs** 에 사이트의 `/auth/callback` 추가

### 5. Admin 로그인 방법

사이트에 별도 로그인 버튼은 없습니다. 관리자만 URL을 직접 입력하여 접속합니다.

**GitHub OAuth 로그인** (멤버 표준 경로):

1. `/admin/login` 에서 **GitHub 로 로그인** → `supabase.auth.signInWithOAuth` → GitHub 인증 → `/auth/callback` 으로 리다이렉트
2. `/auth/callback` 인가 게이트가 이메일이 `OWNER_EMAIL` 이거나 역할을 보유했거나 `author_invites` 초대가 있는지 확인 — 통과 시 역할이 app_metadata 에 부여되고 초대는 소비됨. 미초대면 계정을 삭제하고 에러와 함께 로그인으로 복귀
3. 성공 → `/admin/settings` 리다이렉트

**비밀번호 로그인** (소유자 폴백):

1. `/admin/login` 접속
2. Supabase에서 생성한 이메일/비밀번호 입력
3. 로그인 성공 → `/admin/settings` (설정)으로 리다이렉트

**멤버 추가 (이메일 초대)**: 소유자가 Settings → **Account 탭**에서 이메일로 멤버를 초대하면 `author_invites` 행 + Resend 안내 메일이 발송됩니다. 초대받은 사람이 같은 이메일의 GitHub 로 OAuth 로그인하면 자동으로 저자/편집자 권한을 얻습니다. Account 탭에서 소유자가 멤버 목록·역할·권한을 관리합니다 (비소유자는 Account 탭만 접근).

**로그인 후 사용 가능한 기능:**

- `/admin/posts` — 포스트 목록 (발행/비공개 상태 확인, 호버 미리보기, 행 번호, 썸네일)
- `/admin/posts/new` — 새 포스트 작성 (Markdown ↔ Rich Text 전환, 자동 번역, 재번역, 자동 저장 + DB 리비전 히스토리 + diff 비교 + Revert)
- `/admin/posts/[id]/edit` — 기존 포스트 수정 (PlateEditor 로딩 스켈레톤)
- `/admin/posts/series/new` — 새 시리즈 생성
- `/admin/posts/series/[id]/edit` — 시리즈 편집
- `/admin/works` — 작업물 목록 (테이블 뷰, 발행/비공개 토글, 정렬 순서, 썸네일, .md 업로드)
- `/admin/works/new` — 새 작업물 생성 (단일 콘텐츠 에디터 + 템플릿, 한/영 이중 언어, 기술 스택, 갤러리)
- `/admin/works/[id]/edit` — 기존 작업물 수정
- `/admin/settings` — 사이트 설정 (General, Content, Appearance, Services, Account 5개 탭). General 탭에서 브랜드·SEO(기본 콘텐츠 언어 `defaultLanguage` ko/en Select — admin 저작 폼에서 어느 언어를 필수 입력으로 둘지[제목/부제목/nature/카테고리]와 에디터 초기 언어 탭을 결정, 방문자 표시 언어와는 무관)·푸터 저작권·BGM 파일 업로드·음원 출처(곡명/아티스트/URL) 관리. Content 탭은 Home/Profile/About/Posts/Works 서브 네비게이션으로 분리. Services 탭에서 이메일 서비스, AI 커버, reCAPTCHA 설정 및 API 키 편집. Account 탭에서 관리자 이메일/비밀번호 변경 + 멤버 관리(소유자 전용 — 멤버 목록·역할[소유자/편집자/저자]·이메일 초대·권한 변경, 비소유자는 Account 탭만 노출)

### 6. Cover Image Picker 사용법

포스트·시리즈·작업물 에디터의 Cover Image / Main Image 영역에서 **Upload**(직접 업로드)과 **Choose cover**(피커) 중 선택할 수 있습니다.

**Choose cover** 클릭 시 5개 탭 + 로컬 파일 영역이 표시됩니다 (모바일에서는 bottom sheet 으로 자동 전환):

| 탭 | 설명 | 필요한 환경변수 |
|----|------|----------------|
| **Presets** | 16종 그라데이션/패턴 — 클릭 시 Canvas API 로 1200×630 이미지를 생성하여 Supabase 에 업로드. `public/cover/images/` · `public/cover/videos/` 의 로컬 미디어도 같은 패널에서 노출 (공용 `/api/admin/cover`) | 없음 |
| **Unsplash** | 키워드로 Unsplash 사진 검색 → 클릭 시 다운로드 트래킹 + Supabase 업로드 | `UNSPLASH_ACCESS_KEY` |
| **Pexels** | 키워드로 Pexels 사진 검색 → 클릭 시 다운로드 + Supabase 업로드. Unsplash 보완 대안 (API 정책 변경 시 fail-safe) | `PEXELS_API_KEY` |
| **AI Generate** | 프롬프트 + 스타일 선택 → AI로 이미지 생성 → Supabase 업로드 | provider별 API key (아래 참고) |
| **History** | 과거 선택한 cover 영구 보관 (`cover_image_history` 테이블, RLS) — preset / Unsplash / Pexels / AI 통합. 키워드·색상표 복사 · 다운로드 · 재선택 인라인 | 없음 |

> **참고**: Unsplash · Pexels · AI Generate 탭은 각각 API key 가 필요합니다. Presets 탭과 History 탭은 환경변수 없이 사용 가능합니다.

---

#### AI Generate — Provider 설정

`src/config/site.config.ts`의 `aiCover.provider`에서 사용할 서비스를 선택합니다:

```ts
aiCover: {
  provider: "huggingface",  // "nanobanana" | "huggingface"
},
```

| Provider | 모델 | 환경변수 | 가격 | 발급 방법 |
|----------|------|----------|------|-----------|
| **huggingface** | FLUX.1-schnell | `HUGGINGFACE_API_KEY` | 무료 (rate limit 있음) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → New token → `Inference Providers` 권한 체크 |
| **nanobanana** | Gemini 2.5 Flash | `NANOBANANA_API_KEY` | ~$0.02/장 (가입 시 무료 크레딧) | [nanobananaapi.ai/api-key](https://nanobananaapi.ai/api-key) → 회원가입 → API Key 복사 |

**설정 예시 (.env.local):**

```env
# Hugging Face 사용 시 (권장 — 무료)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 또는 NanoBanana 사용 시
# NANOBANANA_API_KEY=nb_xxxxxxxxxxxxxxxx

```

> provider를 변경한 후 `.env.local`에 해당 키만 설정하면 됩니다. 사용하지 않는 provider의 키는 비워두어도 무방합니다.

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

#### GitHub Token 발급 (giscus 사용 시)

댓글을 giscus 로 쓸 때, admin 설정에서 저장소의 Discussion 카테고리를 자동으로 불러오는 데만 사용합니다.

1. [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) 이동
2. 토큰 생성 — **공개 저장소의 Discussion 카테고리만 읽으므로 별도 스코프 체크 불필요**
3. `.env.local` 에 `GITHUB_TOKEN=...` 입력하거나, admin **Services** 탭에 저장 (DB 시크릿이 환경변수보다 우선)

> giscus 위젯 자체는 토큰 없이 동작합니다 — 토큰은 admin 설정 화면의 카테고리 자동 조회 편의 기능 전용입니다.

**인증 플로우:**

```
/admin/login (GitHub 로 로그인)
  → supabase.auth.signInWithOAuth({ provider: "github" })
    → GitHub 인증 → GET /auth/callback
      → exchangeCodeForSession (인증만 수행)
      → 인가 게이트: 이메일이 OWNER_EMAIL || 역할 보유 || author_invites 초대?
        → 통과 → app_metadata 에 역할 부여 + 초대 소비(consumed_at)
        → 실패 → signOut() + service-role deleteUser() → 에러와 함께 /admin/login
  → /admin/settings 로 리다이렉트

/admin/login (폼 제출 — 소유자 폴백)
  → POST /api/admin/auth
    → supabase.auth.signInWithPassword()
    → 세션 쿠키 설정
  → /admin/settings로 리다이렉트

/admin/* 접속 시
  → Dashboard layout에서 세션 확인
  → 세션 없으면 → /admin/denied (접근 거부 페이지)
  → 세션 있으면 → 정상 접근 (서버 헬퍼가 app_metadata 역할 재확인)
  → AdminAuthSync 가 onAuthStateChange 구독 → 다른 탭에서 SIGNED_OUT 시 /admin/login (크로스탭 로그아웃)

/admin/login 접속 시
  → Auth layout에서 세션 확인
  → 이미 로그인 → /admin/settings로 리다이렉트
```

> **포인트**: 일반 방문자는 `/posts`에서 글 읽기 + 댓글만 가능하고, 관리자(본인)만 `/admin/login`을 직접 입력해서 접속합니다. 포트폴리오 사이트이므로 로그인 UI를 노출하지 않습니다.


</details>

<details>
<summary><strong>테스트</strong></summary>


**스택**: Vitest + React Testing Library + jsdom

```bash
# 전체 테스트 실행
npm test

# 워치 모드 (파일 변경 시 자동 재실행)
npm run test:watch
```

**테스트 대상**:

**유틸 · 렌더** (`src/__tests__/`)

| 파일 | 수 | 설명 |
| --- | --- | --- |
| `cn.test.ts` | 6 | 클래스명 조합 유틸 (`cn`) |
| `mobileCheck.test.ts` | 6 | 모바일 레이아웃 판별 (`checkMobileLayout`) |
| `renderHighlight.test.tsx` | 4 | 하이라이트 마크업 변환 (`renderHighlight`) |
| `koSearch.test.ts` | 10 | 한글 초성/자모 검색 매칭 |
| `codeBlockBar.test.tsx` | 3 | 코드블록 상단 바 (언어 라벨 · 복사 · 줄바꿈 토글) |
| `cssTokens.test.ts` | 1 | **정의되지 않은 CSS 토큰 가드** — `var()` fallback 이 없으면 선언 전체가 무효가 되는데 CSS 는 조용히 넘어간다. 실제로 13종 · 57곳이 죽어 있었다 |

**에디터 (Plate)** (`src/components/posts/plate/__tests__/`)

| 파일 | 수 | 설명 |
| --- | --- | --- |
| `browserSafeGrammar.test.ts` | 15 | hljs 문법의 브라우저 안전성 — 등록된 정규식이 hljs 의 flag 없는 재파싱을 견디는지 (트러블슈팅 75번). node 는 원본을 쓰므로 **번들된 형태를 합성**해서 검증 |
| `fitColumnsForInsert.test.ts` | 10 | 열 블록 폭 배분 — 블록 상한 유지, 최소 폭 하한, 내림 잔여 배분 |
| `columnHasContent.test.ts` | 9 | 열 삭제 전 내용 판정 — 텍스트가 없어도 이미지/구분선은 내용 |
| `codePaste.test.ts` | 7 | 코드블록 **밖**에 코드 붙여넣기 — markdown 파서가 들여쓰기로 코드를 찢지 않는지 |
| `codeBlockClear.test.ts` | 5 | "내용 제거" 후 커서가 블록 안에 남는지 (밖으로 새면 붙여넣기가 유출) |
| `codeBlockStructure.test.ts` | 4 | `code_block` 자식이 항상 `code_line` 인지 (raw 텍스트면 아무도 못 고치는 상태가 된다) |
| `tableRowHeight.test.ts` | 4 | 표 행 높이 HTML 왕복 |

설정: `vitest.config.ts` (jsdom, `@platejs/*` inline — 전체 EditorKit 로드용)

---


</details>

<details>
<summary><strong>Components</strong></summary>

<p align="center">
  <img src="public/images/screenshots/pc/design-system-dark.png" width="100%" alt="Design System — Components Preview" />
  <br />
  <sub><code>/design-system</code> 페이지에서 모든 토큰과 컴포넌트를 확인할 수 있습니다</sub>
</p>

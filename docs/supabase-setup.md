# Supabase 세팅 가이드

Posts 기능을 사용하려면 Supabase 프로젝트 세팅이 필요합니다.

### 1. 환경변수 설정

`.env.local` 파일을 프로젝트 루트에 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Cover Image Picker — Unsplash (선택사항)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

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
```

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

**생성되는 테이블 (10개):**

| 테이블 | 용도 |
|--------|------|
| `site_settings` | 사이트 설정 + 프로필 데이터 + secrets/API 키 (JSONB) |
| `series` | 블로그 시리즈 (sort_order — admin 정렬, auto_cover_url — Unsplash 캐시) |
| `posts` | 블로그 포스트 (post_number 시퀀스 컬럼으로 고유 번호 부여) |
| `comments` | 포스트 댓글 (대댓글, 이중 인증: commenter_hash + password) |
| `likes` | 좋아요 (포스트/작업물/댓글 통합, target_type으로 구분, IP 중복 방지) |
| `works` | 포트폴리오 작업물 (team_members jsonb 포함) |
| `site_visits` | 방문자 통계 (IP+날짜 1회) |
| `work_comments` | Works 댓글 (대댓글, 이중 인증) |
| `admin_notifications` | 관리자 알림 로그 |
| `revisions` | 에디터 리비전 히스토리 (posts/works 공용, JSONB snapshot) |

> `IF NOT EXISTS`를 사용하므로 이미 존재하는 테이블은 건너뜁니다. 기존 배포 DB에 누락된 컬럼(commenter_hash, updated_at 등)은 파일 하단의 마이그레이션 섹션에서 `ALTER TABLE ADD COLUMN IF NOT EXISTS`로 안전하게 추가됩니다.

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
> **Comment Likes API**: `GET /api/comment-likes?comment_type=&comment_ids=` (좋아요 상태 일괄 조회), `POST /api/comment-likes` (댓글 좋아요 토글)
>
> **Admin API**: `POST /api/admin/auth`, `GET/PATCH /api/admin/settings`, `GET/PATCH /api/admin/profile`, `GET/PATCH /api/admin/account`, `GET/PUT /api/admin/secrets`, `POST /api/admin/upload`, `POST /api/admin/translate`
>
> **Revisions API**: `GET /api/revisions?entity_type=&entity_id=` (목록, snapshot 제외), `POST /api/revisions` (저장 + 50개 초과 정리), `GET /api/revisions/[id]` (snapshot 포함 단건), `DELETE /api/revisions/[id]`
>
> **Categories API**: `GET /api/categories` (Posts 이중언어 카테고리 목록), `GET /api/works-categories` (Works 이중언어 카테고리 목록)
>
> **Utility API**: `POST /api/translate` (공개, Gemini 단일 텍스트), `POST /api/posts/reassign-category` (카테고리 일괄 재할당), `GET /api/fonts/search?q=` (Google Fonts 자동완성 검색)

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

### 5. Admin 로그인 방법

사이트에 별도 로그인 버튼은 없습니다. 관리자만 URL을 직접 입력하여 접속합니다.

**로그인:**

1. `/admin/login` 접속
2. Supabase에서 생성한 이메일/비밀번호 입력
3. 로그인 성공 → `/admin/settings` (설정)으로 리다이렉트

**로그인 후 사용 가능한 기능:**

- `/admin/posts` — 포스트 목록 (발행/비공개 상태 확인, 호버 미리보기, 행 번호, 썸네일)
- `/admin/posts/new` — 새 포스트 작성 (Markdown ↔ Rich Text 전환, 자동 번역, 재번역, 자동 저장 + DB 리비전 히스토리 + diff 비교 + Revert)
- `/admin/posts/[id]/edit` — 기존 포스트 수정 (PlateEditor 로딩 스켈레톤)
- `/admin/posts/series/new` — 새 시리즈 생성
- `/admin/posts/series/[id]/edit` — 시리즈 편집
- `/admin/works` — 작업물 목록 (테이블 뷰, 발행/비공개 토글, 정렬 순서, 썸네일, .md 업로드)
- `/admin/works/new` — 새 작업물 생성 (단일 콘텐츠 에디터 + 템플릿, 한/영 이중 언어, 기술 스택, 갤러리)
- `/admin/works/[id]/edit` — 기존 작업물 수정
- `/admin/settings` — 사이트 설정 (General, Content, Appearance, Services, Account 5개 탭). General 탭에서 브랜드·SEO·푸터 저작권·BGM 파일 업로드·음원 출처(곡명/아티스트/URL) 관리. Content 탭은 Home/Profile/About/Posts/Works 서브 네비게이션으로 분리. Services 탭에서 이메일 서비스, AI 커버, reCAPTCHA 설정 및 API 키 편집. Account 탭에서 관리자 이메일/비밀번호 변경

### 6. Cover Image Picker 사용법

포스트·시리즈·작업물 에디터의 Cover Image / Main Image 영역에서 **Upload**(직접 업로드)과 **Choose cover**(피커) 중 선택할 수 있습니다.

**Choose cover** 클릭 시 3개 탭이 표시됩니다:

| 탭 | 설명 | 필요한 환경변수 |
|----|------|----------------|
| **Presets** | 16종 그라데이션/패턴 중 클릭하면 Canvas API로 1200×630 이미지를 생성하여 Supabase에 업로드 | 없음 |
| **Unsplash** | 키워드로 Unsplash 사진 검색 → 클릭 시 다운로드 트래킹 + Supabase 업로드 | `UNSPLASH_ACCESS_KEY` |
| **AI Generate** | 프롬프트 + 스타일 선택 → AI로 이미지 생성 → Supabase 업로드 | provider별 API key (아래 참고) |

> **참고**: Unsplash와 AI Generate 탭은 각각 API key가 필요합니다. Presets 탭은 환경변수 없이 사용 가능합니다.

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

**인증 플로우:**

```
/admin/login (폼 제출)
  → POST /api/admin/auth
    → supabase.auth.signInWithPassword()
    → 세션 쿠키 설정
  → /admin/settings로 리다이렉트

/admin/* 접속 시
  → Dashboard layout에서 세션 확인
  → 세션 없으면 → /admin/denied (접근 거부 페이지)
  → 세션 있으면 → 정상 접근

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

| 파일                       | 테스트 수 | 설명                                                                |
| -------------------------- | --------- | ------------------------------------------------------------------- |
| `cn.test.ts`               | 6         | 클래스명 조합 유틸 (`cn`)                                           |
| `date.test.ts`             | 6         | 날짜 포맷 유틸 (`formatDate`, `getYear`)                            |
| `random.test.ts`           | 8         | 랜덤 요소 생성 (`generateRandomElements`, `generateRandomDroplets`) |
| `mobileCheck.test.ts`      | 6         | 모바일 레이아웃 판별 (`checkMobileLayout`)                          |
| `renderHighlight.test.tsx` | 4         | 하이라이트 마크업 변환 (`renderHighlight`)                          |

설정 파일: `vitest.config.ts`, 테스트 위치: `src/__tests__/`

---


</details>

<details>
<summary><strong>Components</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/design-system-dark.png" width="100%" alt="Design System — Components Preview" />
  <br />
  <sub><code>/design-system</code> 페이지에서 모든 토큰과 컴포넌트를 확인할 수 있습니다</sub>
</p>

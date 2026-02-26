import type { BackendItem } from "./types";

export const backendItems: BackendItem[] = [
  /* ── API Groups ── */
  {
    name: "Posts API",
    kind: "api",
    description: {
      ko: "블로그 포스트 CRUD + 좋아요/조회수 API. 목록 조회 시 태그·검색·정렬·시리즈 필터를 지원하며, 좋아요는 IP 기반 토글 방식입니다.",
      en: "Blog post CRUD + like/view APIs. List queries support tag, search, sort, and series filters. Likes use IP-based toggling.",
    },
    endpoints: [
      { method: "GET", path: "/api/posts", description: { ko: "포스트 목록 (페이지네이션, 태그/검색/정렬 필터)", en: "List posts (pagination, tag/search/sort filters)" } },
      { method: "GET", path: "/api/posts/[id]", description: { ko: "포스트 단건 조회", en: "Get single post" } },
      { method: "PATCH", path: "/api/posts/[id]", description: { ko: "포스트 수정 (admin)", en: "Update post (admin)" } },
      { method: "POST", path: "/api/posts/[id]/view", description: { ko: "조회수 증가", en: "Increment view count" } },
      { method: "GET", path: "/api/posts/[id]/like", description: { ko: "좋아요 수 + IP liked 여부", en: "Like count + IP liked status" } },
      { method: "POST", path: "/api/posts/[id]/like", description: { ko: "좋아요 토글 (IP 기반 삽입/삭제)", en: "Toggle like (IP-based insert/delete)" } },
    ],
    exampleQuery: {
      title: "Like Toggle Flow",
      code: `// GET: 좋아요 수 + liked 여부 동시 조회
const [{ count }, { data: myLike }] = await Promise.all([
  admin.from("likes").select("*", { count: "exact", head: true })
    .eq("target_type", "post").eq("target_id", id),
  admin.from("likes").select("id")
    .eq("target_type", "post").eq("target_id", id)
    .eq("ip", ip).maybeSingle(),
]);

// POST: 토글 — 있으면 삭제, 없으면 삽입
if (existing) {
  await admin.from("likes").delete().eq("id", existing.id);
} else {
  await admin.from("likes")
    .insert({ target_type: "post", target_id: id, ip });
}
// posts.like_count 동기화
await admin.from("posts")
  .update({ like_count: newCount }).eq("id", id);`,
      language: "javascript",
    },
  },
  {
    name: "Comments API",
    kind: "api",
    description: {
      ko: "게스트 댓글 시스템 API. 닉네임+비밀번호로 작성하며, 삭제 시 비밀번호 검증 또는 어드민 인증이 필요합니다.",
      en: "Guest comment system API. Create with nickname + password. Deletion requires password verification or admin auth.",
    },
    endpoints: [
      { method: "GET", path: "/api/comments?post_id=", description: { ko: "포스트의 전체 댓글 조회", en: "Get all comments for a post" } },
      { method: "POST", path: "/api/comments", description: { ko: "댓글 작성 (비밀번호 bcrypt 해시 저장)", en: "Create comment (password stored as bcrypt hash)" } },
      { method: "DELETE", path: "/api/comments/[id]", description: { ko: "댓글 삭제 (비밀번호 검증 or admin)", en: "Delete comment (password verify or admin)" } },
    ],
    exampleQuery: {
      title: "Threaded Comments",
      code: `// 댓글 조회 — 대댓글은 클라이언트에서 그룹핑
const { data } = await admin.from("comments")
  .select("id, post_id, parent_id, nickname, content, is_admin, created_at")
  .eq("post_id", postId)
  .order("created_at", { ascending: true });

// parent_id === null → 최상위 댓글
// parent_id !== null → 해당 댓글의 replies[]에 매핑`,
      language: "javascript",
    },
  },
  {
    name: "Admin API",
    kind: "api",
    description: {
      ko: "어드민 인증 및 관리 API. Supabase Auth 기반 로그인, 계정 관리(이메일/비밀번호 변경), 파일 업로드(Storage), 사이트 설정 관리를 처리합니다.",
      en: "Admin auth and management APIs. Handles Supabase Auth login, account management (email/password change), file upload (Storage), and site settings management.",
    },
    endpoints: [
      { method: "POST", path: "/api/admin/auth", description: { ko: "어드민 로그인 (Supabase Auth)", en: "Admin login (Supabase Auth)" } },
      { method: "GET", path: "/api/admin/settings", description: { ko: "사이트 설정 조회 (public)", en: "Get site settings (public)" } },
      { method: "GET", path: "/api/admin/account", description: { ko: "관리자 계정 정보 조회", en: "Get admin account info" } },
      { method: "PATCH", path: "/api/admin/account", description: { ko: "관리자 이메일/비밀번호 변경", en: "Update admin email/password" } },
      { method: "POST", path: "/api/admin/upload", description: { ko: "파일 업로드 (인증 필요)", en: "File upload (auth required)" } },
    ],
  },
  {
    name: "Cover Image API",
    kind: "api",
    description: {
      ko: "포스트 커버 이미지 생성 API. Unsplash 검색과 AI 이미지 생성(NanoBanana/Hugging Face 선택)을 지원합니다.",
      en: "Post cover image APIs. Supports Unsplash search and AI image generation (NanoBanana/Hugging Face selectable).",
    },
    endpoints: [
      { method: "GET", path: "/api/cover/unsplash", description: { ko: "Unsplash 이미지 검색", en: "Search Unsplash images" } },
      { method: "POST", path: "/api/cover/unsplash/download", description: { ko: "Unsplash 이미지 → Storage 저장", en: "Save Unsplash image to Storage" } },
      { method: "POST", path: "/api/cover/ai-generate", description: { ko: "AI 커버 이미지 생성 (스타일 프리셋)", en: "Generate AI cover image (style presets)" } },
    ],
  },

  {
    name: "Series API",
    kind: "api",
    description: {
      ko: "시리즈 CRUD API. 시리즈는 카테고리의 하위 요소로, 카테고리별 필터링을 지원합니다. 포스트를 시리즈로 묶어 순서대로 발행할 수 있습니다.",
      en: "Series CRUD API. Series are sub-elements of categories, with category-based filtering. Group posts into series for sequential publishing.",
    },
    endpoints: [
      { method: "GET", path: "/api/series", description: { ko: "시리즈 목록 (포스트 수 포함, ?category= 필터)", en: "List series (with post counts, ?category= filter)" } },
      { method: "POST", path: "/api/series", description: { ko: "시리즈 생성 (admin, 자동 slug)", en: "Create series (admin, auto slug)" } },
      { method: "GET", path: "/api/series/[id]", description: { ko: "단일 시리즈 + 소속 포스트", en: "Single series + posts" } },
      { method: "PATCH", path: "/api/series/[id]", description: { ko: "시리즈 수정 (admin)", en: "Update series (admin)" } },
      { method: "DELETE", path: "/api/series/[id]", description: { ko: "시리즈 삭제 (admin)", en: "Delete series (admin)" } },
    ],
  },
  {
    name: "Works API",
    kind: "api",
    description: {
      ko: "포트폴리오 작업물 CRUD API. 한/영 이중 언어 필드, 기술 스택, 갤러리 이미지를 지원합니다. DB 미연결 시 정적 데이터로 자동 fallback.",
      en: "Portfolio works CRUD API. Supports bilingual fields, tech stack, and gallery images. Auto-falls back to static data when DB is unavailable.",
    },
    endpoints: [
      { method: "GET", path: "/api/works", description: { ko: "작업물 목록 (?all=true: 비공개 포함)", en: "List works (?all=true: include unpublished)" } },
      { method: "POST", path: "/api/works", description: { ko: "작업물 생성 (admin)", en: "Create work (admin)" } },
      { method: "GET", path: "/api/works/[id]", description: { ko: "작업물 단건 조회", en: "Get single work" } },
      { method: "PATCH", path: "/api/works/[id]", description: { ko: "작업물 수정 (admin)", en: "Update work (admin)" } },
      { method: "DELETE", path: "/api/works/[id]", description: { ko: "작업물 삭제 (admin)", en: "Delete work (admin)" } },
      { method: "GET", path: "/api/works/[id]/like", description: { ko: "좋아요 수 + IP liked 여부", en: "Like count + IP liked status" } },
      { method: "POST", path: "/api/works/[id]/like", description: { ko: "좋아요 토글 (IP 기반)", en: "Toggle like (IP-based)" } },
    ],
    exampleQuery: {
      title: "Static Fallback Pattern",
      code: `// getWorks.ts — DB 미연결 시 정적 데이터 fallback
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  // 환경변수 없으면 정적 데이터 반환
  return projects; // from @/data/projects
}

const { data } = await admin.from("works")
  .select("*")
  .eq("published", true)
  .order("sort_order");

// DB 비어있으면 정적 데이터 fallback
return data?.length ? data.map(workToProject) : projects;`,
      language: "javascript",
    },
  },
  {
    name: "Profile API",
    kind: "api",
    description: {
      ko: "프로필 데이터 조회/수정 API. site_settings 테이블에 JSONB로 저장하며, 경력/스킬/철학/접근법/자격증/수상 섹션을 관리합니다.",
      en: "Profile data read/update API. Stored as JSONB in site_settings table, managing experiences/skills/philosophy/approach/certifications/awards.",
    },
    endpoints: [
      { method: "GET", path: "/api/admin/profile", description: { ko: "프로필 데이터 조회", en: "Get profile data" } },
      { method: "PATCH", path: "/api/admin/profile", description: { ko: "프로필 데이터 수정 (admin, upsert)", en: "Update profile data (admin, upsert)" } },
    ],
  },

  /* ── Database Tables ── */
  {
    name: "posts",
    kind: "table",
    description: {
      ko: "블로그 포스트 테이블. Markdown/Rich Text 에디터 지원, 한/영 이중 언어 콘텐츠를 하나의 row에 저장합니다.",
      en: "Blog posts table. Supports Markdown/Rich Text editors, stores bilingual (KO/EN) content in a single row.",
    },
    designNote: {
      ko: "**선택적 like_count 캐싱**: Posts만 목록에서 좋아요 수를 표시하므로 `posts.like_count` 캐시 컬럼에 동기화합니다. Works와 댓글은 상세 페이지에서만 표시하므로 실시간 COUNT 쿼리로 처리합니다.",
      en: "**Selective like_count caching**: Only Posts display like counts in list views, so `posts.like_count` is synced. Works and comments only show on detail pages, handled via real-time COUNT queries.",
    },
    columns: [
      { name: "id", type: "UUID", constraint: "PK", description: { ko: "고유 식별자", en: "Primary key" } },
      { name: "title / title_en", type: "TEXT", description: { ko: "제목 (한국어/영어)", en: "Title (KO/EN)" } },
      { name: "slug", type: "TEXT", constraint: "UNIQUE", description: { ko: "URL 슬러그", en: "URL slug" } },
      { name: "content / content_en", type: "TEXT", description: { ko: "본문 (한국어/영어)", en: "Content body (KO/EN)" } },
      { name: "content_type", type: "TEXT", constraint: "CHECK", description: { ko: "'markdown' | 'richtext'", en: "'markdown' | 'richtext'" } },
      { name: "cover_image", type: "TEXT", description: { ko: "커버 이미지 URL", en: "Cover image URL" } },
      { name: "tags", type: "TEXT[]", description: { ko: "태그 배열", en: "Tag array" } },
      { name: "category", type: "TEXT", description: { ko: "카테고리 (프리셋 + 커스텀)", en: "Category (preset + custom)" } },
      { name: "is_pinned", type: "BOOLEAN", description: { ko: "상단 고정 여부", en: "Pinned to top flag" } },
      { name: "published", type: "BOOLEAN", description: { ko: "공개 여부", en: "Published flag" } },
      { name: "view_count", type: "INTEGER", description: { ko: "조회수", en: "View count" } },
      { name: "like_count", type: "INTEGER", description: { ko: "좋아요 수 (likes 동기화)", en: "Like count (synced)" } },
      { name: "series_id", type: "UUID", constraint: "FK → series", description: { ko: "소속 시리즈 (NULL = 미소속)", en: "Parent series (NULL = none)" } },
      { name: "series_order", type: "INTEGER", description: { ko: "시리즈 내 순서", en: "Order within series" } },
    ],
  },
  {
    name: "comments",
    kind: "table",
    description: {
      ko: "게스트 대댓글 테이블. parent_id로 1-depth 대댓글, 비밀번호(bcrypt) 기반 삭제를 구현합니다.",
      en: "Guest threaded comments. 1-depth replies via parent_id, password-based (bcrypt) deletion.",
    },
    designNote: {
      ko: "**비밀번호 기반 삭제**: 로그인 없는 포트폴리오에서 작성 시 비밀번호를 받아 삭제 권한을 부여합니다. **bcrypt 해시** 저장으로 평문 노출을 방지합니다.",
      en: "**Password-based deletion**: Collects password on creation for delete auth. Stored as **bcrypt hash** to prevent plaintext exposure.",
    },
    columns: [
      { name: "id", type: "UUID", constraint: "PK", description: { ko: "고유 식별자", en: "Primary key" } },
      { name: "post_id", type: "UUID", constraint: "FK → posts", description: { ko: "소속 포스트", en: "Parent post" } },
      { name: "parent_id", type: "UUID", constraint: "NULLABLE", description: { ko: "부모 댓글 (NULL = 최상위)", en: "Parent comment (NULL = top-level)" } },
      { name: "nickname", type: "TEXT", description: { ko: "작성자 닉네임", en: "Author nickname" } },
      { name: "password", type: "TEXT", description: { ko: "bcrypt 해시", en: "Bcrypt hash" } },
      { name: "content", type: "TEXT", description: { ko: "댓글 내용", en: "Comment content" } },
      { name: "is_admin", type: "BOOLEAN", description: { ko: "관리자 여부", en: "Admin flag" } },
    ],
  },
  {
    name: "likes",
    kind: "table",
    description: {
      ko: "통합 좋아요 테이블. Posts, Works, 댓글(post/work)을 target_type으로 구분, 단일 UNIQUE 제약으로 전체 중복 방지.",
      en: "Unified likes table. Posts, Works, and comments (post/work) distinguished by target_type, single UNIQUE constraint prevents all duplicates.",
    },
    designNote: {
      ko: "**통합 설계**: 모든 좋아요를 하나의 테이블에서 관리합니다. `target_type`은 'post'|'work'|'post_comment'|'work_comment' 4가지. `UNIQUE(target_type, target_id, ip)`로 **DB 레벨 중복 차단**. 새 엔티티 추가 시 CHECK 값 하나만 추가하면 됩니다.",
      en: "**Unified design**: All likes in one table. `target_type` covers 'post'|'work'|'post_comment'|'work_comment'. `UNIQUE(target_type, target_id, ip)` for **DB-level dedup**. Adding new entities only requires a CHECK value.",
    },
    columns: [
      { name: "id", type: "UUID", constraint: "PK", description: { ko: "고유 식별자", en: "Primary key" } },
      { name: "target_type", type: "TEXT", constraint: "CHECK", description: { ko: "'post' | 'work' | 'post_comment' | 'work_comment'", en: "'post' | 'work' | 'post_comment' | 'work_comment'" } },
      { name: "target_id", type: "TEXT", description: { ko: "대상 ID", en: "Target ID" } },
      { name: "ip", type: "TEXT", description: { ko: "IP 주소", en: "IP address" } },
    ],
  },
  {
    name: "series",
    kind: "table",
    description: {
      ko: "시리즈 테이블. 카테고리의 하위 요소로, 포스트를 순서대로 묶어 발행하기 위한 그룹 단위입니다. 한/영 이중 언어 제목·설명을 지원합니다.",
      en: "Series table. A sub-element of categories, grouping posts for sequential publishing. Supports bilingual (KO/EN) titles and descriptions.",
    },
    designNote: {
      ko: "**카테고리 하위 요소**: 각 시리즈는 하나의 카테고리에 소속됩니다. 포스트 목록에서 카테고리를 선택하면 해당 카테고리의 시리즈만 표시되며, 시리즈 생성 시 카테고리가 자동으로 지정됩니다. 에디터에서 시리즈를 선택하면 포스트의 카테고리가 자동 동기화됩니다.",
      en: "**Category sub-element**: Each series belongs to one category. Selecting a category on the posts page shows only its series. Category is auto-assigned on series creation, and selecting a series in the editor auto-syncs the post's category.",
    },
    columns: [
      { name: "id", type: "UUID", constraint: "PK", description: { ko: "고유 식별자", en: "Primary key" } },
      { name: "title / title_en", type: "TEXT", description: { ko: "시리즈 제목 (한국어/영어)", en: "Series title (KO/EN)" } },
      { name: "slug", type: "TEXT", constraint: "UNIQUE", description: { ko: "URL 슬러그", en: "URL slug" } },
      { name: "description / description_en", type: "TEXT", description: { ko: "시리즈 설명 (한국어/영어)", en: "Series description (KO/EN)" } },
      { name: "category", type: "TEXT", constraint: "NOT NULL", description: { ko: "소속 카테고리", en: "Parent category" } },
      { name: "published", type: "BOOLEAN", description: { ko: "공개 여부", en: "Published flag" } },
    ],
  },
  {
    name: "works",
    kind: "table",
    description: {
      ko: "포트폴리오 작업물 테이블. 한/영 이중 언어 필드를 flat column으로 저장하며, 앱에서 LocalizedText 객체로 변환합니다.",
      en: "Portfolio works table. Bilingual fields stored as flat columns, converted to LocalizedText objects in the app.",
    },
    designNote: {
      ko: "**정적 fallback 패턴**: DB 미연결(환경변수 미설정) 시 `data/projects.ts`의 정적 데이터를 반환합니다. `workToProject()` 함수가 flat DB 컬럼을 `{ ko, en }` 형태의 프론트엔드 타입으로 변환합니다.",
      en: "**Static fallback pattern**: Returns static data from `data/projects.ts` when DB is unavailable. `workToProject()` converts flat DB columns to `{ ko, en }` frontend types.",
    },
    columns: [
      { name: "id", type: "UUID", constraint: "PK", description: { ko: "고유 식별자", en: "Primary key" } },
      { name: "title", type: "TEXT", description: { ko: "작업물 제목", en: "Work title" } },
      { name: "subtitle_ko / _en", type: "TEXT", description: { ko: "부제목 (한국어/영어)", en: "Subtitle (KO/EN)" } },
      { name: "category_ko / _en", type: "TEXT", description: { ko: "카테고리 (한국어/영어)", en: "Category (KO/EN)" } },
      { name: "tech", type: "TEXT[]", description: { ko: "기술 스택 배열", en: "Tech stack array" } },
      { name: "image", type: "TEXT", description: { ko: "메인 이미지 URL", en: "Main image URL" } },
      { name: "size", type: "TEXT", constraint: "CHECK", description: { ko: "'large' | 'small' | 'medium' | 'tall' | 'wide'", en: "'large' | 'small' | 'medium' | 'tall' | 'wide'" } },
      { name: "gallery", type: "TEXT[]", description: { ko: "갤러리 이미지 URL 배열", en: "Gallery image URL array" } },
      { name: "published", type: "BOOLEAN", description: { ko: "공개 여부", en: "Published flag" } },
      { name: "sort_order", type: "INTEGER", description: { ko: "정렬 순서", en: "Sort order" } },
    ],
  },
  {
    name: "site_settings",
    kind: "table",
    description: {
      ko: "사이트 설정 + 프로필 데이터 테이블. id 컬럼으로 용도 구분: 'default'(사이트 설정), 'profile'(프로필 데이터). JSONB로 유연한 스키마.",
      en: "Site settings + profile data table. Purpose distinguished by id column: 'default' (site settings), 'profile' (profile data). Flexible schema via JSONB.",
    },
    designNote: {
      ko: "**JSONB 블롭 저장**: 프로필 데이터(경력, 스킬 등)는 깊이 중첩된 이중 언어 구조여서 개별 컬럼보다 **JSONB로 통째로 저장**하는 것이 유연합니다. site_settings 테이블을 재활용하여 `id='profile'` 행에 저장합니다.",
      en: "**JSONB blob storage**: Profile data (experiences, skills, etc.) has deeply nested bilingual structures, making **JSONB storage** more flexible than individual columns. Reuses site_settings table with `id='profile'` row.",
    },
    columns: [
      { name: "id", type: "TEXT", constraint: "PK", description: { ko: "'default' | 'profile'", en: "'default' | 'profile'" } },
      { name: "config", type: "JSONB", description: { ko: "설정/데이터 JSON", en: "Settings/data JSON" } },
      { name: "updated_at", type: "TIMESTAMPTZ", description: { ko: "마지막 수정 시각", en: "Last modified timestamp" } },
    ],
  },
];

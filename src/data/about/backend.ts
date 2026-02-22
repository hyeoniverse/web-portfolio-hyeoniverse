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
      ko: "어드민 인증 및 관리 API. Supabase Auth 기반 로그인, 파일 업로드(Storage), 사이트 설정 관리를 처리합니다.",
      en: "Admin auth and management APIs. Handles Supabase Auth login, file upload (Storage), and site settings management.",
    },
    endpoints: [
      { method: "POST", path: "/api/admin/auth", description: { ko: "어드민 로그인 (Supabase Auth)", en: "Admin login (Supabase Auth)" } },
      { method: "GET", path: "/api/admin/settings", description: { ko: "사이트 설정 조회 (public)", en: "Get site settings (public)" } },
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
      ko: "시리즈 CRUD API. 포스트를 시리즈로 묶어 순서대로 발행할 수 있으며, 시리즈별 포스트 목록 조회를 지원합니다.",
      en: "Series CRUD API. Group posts into series for sequential publishing, with series-filtered post listing support.",
    },
    endpoints: [
      { method: "GET", path: "/api/series", description: { ko: "시리즈 목록 (포스트 수 포함)", en: "List series (with post counts)" } },
      { method: "POST", path: "/api/series", description: { ko: "시리즈 생성 (admin, 자동 slug)", en: "Create series (admin, auto slug)" } },
      { method: "GET", path: "/api/series/[id]", description: { ko: "단일 시리즈 + 소속 포스트", en: "Single series + posts" } },
      { method: "PATCH", path: "/api/series/[id]", description: { ko: "시리즈 수정 (admin)", en: "Update series (admin)" } },
      { method: "DELETE", path: "/api/series/[id]", description: { ko: "시리즈 삭제 (admin)", en: "Delete series (admin)" } },
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
      ko: "**like_count 동기화 컬럼**: likes 테이블에서 `COUNT(*)`로 집계 가능하지만, 목록 조회 시 JOIN/서브쿼리를 피하기 위해 별도 컬럼에 동기화합니다. 좋아요 토글 시 즉시 업데이트하여 **정합성을 보장**합니다.",
      en: "**Synced like_count column**: While `COUNT(*)` on likes works, a synced column avoids JOINs when listing. Updated immediately on toggle for **consistency**.",
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
      ko: "IP 기반 좋아요 테이블. Posts와 Works를 target_type으로 구분, UNIQUE 제약으로 중복 방지.",
      en: "IP-based likes table. Posts/Works distinguished by target_type, UNIQUE constraint prevents duplicates.",
    },
    designNote: {
      ko: "**row 기반 설계**: 좋아요 수 = `COUNT(*)`, 좋아요 여부 = IP row 존재 확인. `UNIQUE(target_type, target_id, ip)`로 **DB 레벨 중복 차단**. `x-forwarded-for` 헤더에서 IP 추출.",
      en: "**Row-based design**: Count = `COUNT(*)`, liked = IP row exists. `UNIQUE(target_type, target_id, ip)` for **DB-level dedup**. IP from `x-forwarded-for` header.",
    },
    columns: [
      { name: "id", type: "UUID", constraint: "PK", description: { ko: "고유 식별자", en: "Primary key" } },
      { name: "target_type", type: "TEXT", description: { ko: "'post' | 'work'", en: "'post' | 'work'" } },
      { name: "target_id", type: "TEXT", description: { ko: "대상 ID", en: "Target ID" } },
      { name: "ip", type: "TEXT", description: { ko: "IP 주소", en: "IP address" } },
    ],
  },
  {
    name: "series",
    kind: "table",
    description: {
      ko: "시리즈 테이블. 포스트를 묶어 순서대로 발행하기 위한 그룹 단위입니다. 한/영 이중 언어 제목·설명을 지원합니다.",
      en: "Series table. Groups posts for sequential publishing. Supports bilingual (KO/EN) titles and descriptions.",
    },
    designNote: {
      ko: "**카테고리와 별개**: 카테고리는 단일 분류(General, Tech 등)이고, 시리즈는 포스트를 **순서대로 묶는 컬렉션**입니다. 하나의 포스트는 하나의 카테고리와 하나의 시리즈에 동시 소속 가능합니다.",
      en: "**Separate from categories**: Categories are single classifications (General, Tech, etc.), while series are **ordered collections**. A post can belong to one category and one series simultaneously.",
    },
    columns: [
      { name: "id", type: "UUID", constraint: "PK", description: { ko: "고유 식별자", en: "Primary key" } },
      { name: "title / title_en", type: "TEXT", description: { ko: "시리즈 제목 (한국어/영어)", en: "Series title (KO/EN)" } },
      { name: "slug", type: "TEXT", constraint: "UNIQUE", description: { ko: "URL 슬러그", en: "URL slug" } },
      { name: "description / description_en", type: "TEXT", description: { ko: "시리즈 설명 (한국어/영어)", en: "Series description (KO/EN)" } },
      { name: "published", type: "BOOLEAN", description: { ko: "공개 여부", en: "Published flag" } },
    ],
  },
];

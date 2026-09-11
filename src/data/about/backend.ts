import type { BackendItem } from "./types";

/* API 만 둔다. 테이블은 Database Design 패널이 설계 메모와 함께 보여 주므로,
   여기에도 두면 같은 설명이 두 번 나온다(#811). */
export const backendItems: BackendItem[] = [
  {
    name: "Posts API",
    kind: "api",
    description: {
      ko: "블로그 포스트 CRUD + 좋아요/조회수 API. 목록 조회 시 태그·검색·정렬·시리즈 필터를 지원하며, 좋아요는 IP 기반 토글 방식입니다. 삭제는 soft delete(deleted_at) 방식으로, 30일 후 자동 영구 삭제됩니다. 수정은 posts.version 기반 낙관적 동시성 제어로 덮어쓰기를 막습니다.",
      en: "Blog post CRUD + like/view APIs. List queries support tag, search, sort, and series filters. Likes use IP-based toggling. Deletion uses soft delete (deleted_at), with auto-purge after 30 days. Updates guard against clobbering via posts.version-based optimistic concurrency.",
    },
    designNote: {
      ko: "**낙관적 동시성 제어**: 여러 탭·기기에서 같은 글을 편집할 때 나중 저장이 앞선 저장을 조용히 덮어쓰지 않도록, PATCH 는 불러온 시점의 `baseVersion` 을 함께 받습니다. `UPDATE … WHERE id = ? AND version = baseVersion` 로 조건부 갱신하고 0행이면 그사이 누가 저장한 것이므로 **409 `version_conflict` + 현재 version** 을 돌려줍니다. 락을 걸지 않으므로 충돌이 없을 때는 비용이 0입니다.",
      en: "**Optimistic concurrency control**: so a later save can't silently clobber an earlier one across tabs or devices, PATCH also takes the `baseVersion` the editor loaded. The update is conditional — `UPDATE … WHERE id = ? AND version = baseVersion` — and zero affected rows means someone saved in between, so it returns **409 `version_conflict` plus the current version**. No locks are taken, so the uncontended path costs nothing.",
    },
    endpoints: [
      { method: "GET", path: "/api/posts", description: { ko: "포스트 목록 (페이지네이션, 태그/검색/정렬 필터, 카테고리 다중선택 ?category=a,b, ?trash=true: 휴지통)", en: "List posts (pagination, tag/search/sort filters, multi-select ?category=a,b, ?trash=true: trash)" } },
      { method: "GET", path: "/api/posts/[id]", description: { ko: "포스트 단건 조회", en: "Get single post" } },
      { method: "PATCH", path: "/api/posts/[id]", description: { ko: "포스트 수정 (admin, baseVersion 동봉 시 409 version_conflict 로 충돌 감지)", en: "Update post (admin, sends baseVersion → 409 version_conflict on clash)" } },
      { method: "DELETE", path: "/api/posts/[id]", description: { ko: "soft delete — deleted_at 마킹 (admin)", en: "Soft delete — mark deleted_at (admin)" } },
      { method: "POST", path: "/api/posts/[id]/restore", description: { ko: "삭제된 포스트 복원 (admin)", en: "Restore soft-deleted post (admin)" } },
      { method: "DELETE", path: "/api/posts/[id]/purge", description: { ko: "영구 삭제 (admin)", en: "Permanent delete (admin)" } },
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
      ko: "게스트 댓글 시스템 API. 닉네임+비밀번호로 작성하며, 삭제 시 비밀번호 검증 또는 어드민 세션 인증이 필요합니다. 관리자는 비밀번호 없이 편집/삭제가 가능합니다. 삭제는 답글이 있거나 관리자 삭제면 내용 보존형 tombstone 으로 남아 관리자가 복구할 수 있고(공개 API 엔 내용이 안 보임), 답글 없는 익명 self 삭제는 하드 삭제됩니다. 본문은 마크다운으로 작성하고, 댓글마다 giscus 식 고정 8종 이모지 반응을 달 수 있습니다.",
      en: "Guest comment system API. Create with nickname + password. Deletion requires password verification or admin session. Admins can edit/delete without password. A delete leaves a content-preserving tombstone — restorable by admins (content hidden from the public API) — when the comment has replies or is admin-deleted, while a reply-less anonymous self-delete is hard-deleted. Bodies are written in markdown, and each comment accepts a fixed giscus-style set of 8 emoji reactions.",
    },
    designNote: {
      ko: "**반응이 좋아요를 대체**: 댓글의 단일 좋아요를 giscus 식 고정 8종(👍👎😄🎉😕❤️🚀👀) 반응으로 교체했습니다. 반응자는 IP+UA 의 SHA-256(`reactor_hash`)으로 식별하고, `UNIQUE(comment_id, comment_type, emoji, reactor_hash)` 로 **같은 이모지 중복만** 막습니다 — 서로 다른 이모지는 여러 개 달 수 있습니다. 토글은 낙관적 업데이트로 즉시 반영하고 실패 시 롤백합니다.",
      en: "**Reactions replaced likes**: the single like per comment became a fixed giscus-style set of 8 reactions (👍👎😄🎉😕❤️🚀👀). A reactor is identified by a SHA-256 of IP+UA (`reactor_hash`), and `UNIQUE(comment_id, comment_type, emoji, reactor_hash)` blocks **only repeats of the same emoji** — different emojis can stack. Toggling applies optimistically and rolls back on failure.",
    },
    endpoints: [
      { method: "GET", path: "/api/comments?post_id=", description: { ko: "포스트의 전체 댓글 조회", en: "Get all comments for a post" } },
      { method: "POST", path: "/api/comments", description: { ko: "댓글 작성 (비밀번호 bcrypt 해시 저장)", en: "Create comment (password stored as bcrypt hash)" } },
      { method: "PATCH", path: "/api/comments/[id]", description: { ko: "댓글 수정 (비밀번호 검증 or admin 세션)", en: "Edit comment (password verify or admin session)" } },
      { method: "DELETE", path: "/api/comments/[id]", description: { ko: "댓글 삭제 (비밀번호 검증 or admin 세션)", en: "Delete comment (password verify or admin session)" } },
      { method: "POST", path: "/api/comments/[id]/restore", description: { ko: "삭제(tombstone)된 댓글 복구 (admin)", en: "Restore a soft-deleted (tombstoned) comment (admin)" } },
      { method: "GET", path: "/api/comment-reactions?comment_type=&comment_ids=", description: { ko: "여러 댓글의 반응 집계 + 내가 누른 반응 (한 번에 조회)", en: "Reaction aggregates for many comments + my own reactions (single round-trip)" } },
      { method: "POST", path: "/api/comment-reactions", description: { ko: "반응 토글 (reactor_hash = IP+UA SHA-256)", en: "Toggle a reaction (reactor_hash = SHA-256 of IP+UA)" } },
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
      ko: "어드민 인증 및 관리 API. Supabase Auth 기반 로그인, 계정 관리(이메일/비밀번호 변경), 파일 업로드(Storage), 사이트 설정 관리, API 키 관리를 처리합니다.",
      en: "Admin auth and management APIs. Handles Supabase Auth login, account management (email/password change), file upload (Storage), site settings management, and API key management.",
    },
    endpoints: [
      { method: "POST", path: "/api/admin/auth", description: { ko: "어드민 로그인 (Supabase Auth)", en: "Admin login (Supabase Auth)" } },
      { method: "GET", path: "/api/admin/settings", description: { ko: "사이트 설정 조회 (public)", en: "Get site settings (public)" } },
      { method: "PATCH", path: "/api/admin/settings", description: { ko: "사이트 설정 저장 (admin) — About ERD 는 checkAboutErd 로 형태 검증 후 통과", en: "Save site settings (admin) — About ERD passes through checkAboutErd shape validation" } },
      { method: "GET", path: "/api/admin/account", description: { ko: "관리자 계정 정보 조회", en: "Get admin account info" } },
      { method: "PATCH", path: "/api/admin/account", description: { ko: "관리자 이메일/비밀번호 변경", en: "Update admin email/password" } },
      { method: "POST", path: "/api/admin/upload", description: { ko: "파일 업로드 (인증 필요)", en: "File upload (auth required)" } },
      { method: "GET", path: "/api/admin/secrets", description: { ko: "API 키 목록 조회 (마스킹)", en: "List API keys (masked)" } },
      { method: "PUT", path: "/api/admin/secrets", description: { ko: "API 키 저장/갱신", en: "Save/update API key" } },
      { method: "DELETE", path: "/api/admin/secrets", description: { ko: "API 키 삭제", en: "Delete API key" } },
      { method: "GET", path: "/api/admin/cover", description: { ko: "public/cover/{images,videos} 안 로컬 미디어 목록 (CoverImagePicker 의 Presets / Local files 탭 공용)", en: "List local media under public/cover/{images,videos} (shared by CoverImagePicker Presets / Local files tab)" } },
      { method: "GET", path: "/api/admin/categories", description: { ko: "포스트 카테고리 목록 + CRUD (siteConfig.posts.categories 동기화)", en: "Post category list + CRUD (syncs siteConfig.posts.categories)" } },
      { method: "GET", path: "/api/admin/works-categories", description: { ko: "Works 카테고리 목록 + CRUD (siteConfig.works.categories 동기화)", en: "Works category list + CRUD (syncs siteConfig.works.categories)" } },
      { method: "DELETE", path: "/api/admin/tags/remove", description: { ko: "전체 게시물에서 특정 태그 일괄 제거 (tagMeta + posts.tags + tag_notes 동기화)", en: "Bulk-remove a tag from all posts (syncs tagMeta + posts.tags + tag_notes)" } },
      { method: "GET", path: "/api/admin/giscus-repo", description: { ko: "giscus 저장소 조회 — GitHub GraphQL 로 repoId + Discussion 카테고리 자동 확인 (GITHUB_TOKEN)", en: "Look up a giscus repo — resolves repoId + Discussion categories via GitHub GraphQL (GITHUB_TOKEN)" } },
      { method: "POST", path: "/api/upload/signed-url", description: { ko: "Storage 직접 업로드용 signed URL 발급 — 서버리스 요청 본문 크기 제한 우회", en: "Issue a signed URL for direct-to-Storage upload — bypasses the serverless request body limit" } },
      { method: "GET", path: "/api/custom-emojis", description: { ko: "커스텀 이모지 목록 (에디터·댓글 picker 공용)", en: "List custom emojis (shared by the editor and comment pickers)" } },
      { method: "POST", path: "/api/custom-emojis", description: { ko: "커스텀 이모지 추가 (admin)", en: "Add a custom emoji (admin)" } },
      { method: "DELETE", path: "/api/custom-emojis/[id]", description: { ko: "커스텀 이모지 삭제 (admin)", en: "Delete a custom emoji (admin)" } },
    ],
    exampleQuery: {
      title: "Admin Auth Flow",
      code: `// Supabase Auth 로그인 + 세션 쿠키 설정
const { data, error } = await supabase.auth
  .signInWithPassword({ email, password });

if (error) return NextResponse.json(
  { error: "Invalid credentials" }, { status: 401 }
);

// 서버 쿠키에 세션 저장
const res = NextResponse.json({ user: data.user });
res.cookies.set("sb-token", data.session.access_token, {
  httpOnly: true, secure: true, sameSite: "lax",
  maxAge: 60 * 60 * 24 * 7, // 7 days
});`,
      language: "javascript",
    },
  },
  {
    name: "Cover Image API",
    kind: "api",
    description: {
      ko: "포스트·시리즈·작업물 커버 이미지 생성 API. Unsplash + Pexels 검색, AI 이미지 생성 (NanoBanana / Hugging Face 선택), 게시물 키워드 기반 자동 매칭까지 지원합니다.",
      en: "Cover image APIs for posts, series, and works. Supports Unsplash + Pexels search, AI image generation (NanoBanana / Hugging Face selectable), and keyword-based automatic matching from post content.",
    },
    endpoints: [
      { method: "GET", path: "/api/cover/unsplash", description: { ko: "Unsplash 이미지 검색", en: "Search Unsplash images" } },
      { method: "POST", path: "/api/cover/unsplash/download", description: { ko: "Unsplash 이미지 → Storage 저장", en: "Save Unsplash image to Storage" } },
      { method: "GET", path: "/api/cover/pexels", description: { ko: "Pexels 이미지 검색 (Unsplash 대안, rate limit / 정책 변경 fail-safe)", en: "Search Pexels images (Unsplash alternative, fail-safe against rate limits / policy changes)" } },
      { method: "POST", path: "/api/cover/ai-generate", description: { ko: "AI 커버 이미지 생성 (스타일 프리셋)", en: "Generate AI cover image (style presets)" } },
      { method: "POST", path: "/api/posts/auto-cover", description: { ko: "게시물 title / tags / excerpt 키워드로 Unsplash · Pexels 검색해 cover 자동 매칭 — 발행 시 cover 비어있으면 자동 호출", en: "Match cover from Unsplash · Pexels using post title / tags / excerpt keywords — auto-invoked on publish when cover is empty" } },
    ],
    exampleQuery: {
      title: "AI Image Generation",
      code: `// provider 선택 → 이미지 생성 → Storage 업로드
const provider = settings.ai_image_provider || "nanobanana";
const imageUrl = await generateImage(provider, {
  prompt: \`\${style.prefix} \${userPrompt}\`,
  negative_prompt: style.negative,
  width: 1024, height: 576,
});

// Supabase Storage에 업로드
const fileName = \`covers/\${Date.now()}.webp\`;
const { data } = await admin.storage
  .from("images").upload(fileName, buffer, {
    contentType: "image/webp",
  });`,
      language: "javascript",
    },
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
    exampleQuery: {
      title: "Series with Post Count",
      code: `// 시리즈 목록 + 각 시리즈의 포스트 수 조회
const { data } = await admin.from("series")
  .select("*, posts!inner(count)")
  .eq("published", true)
  .order("created_at", { ascending: false });

// ?category= 필터 적용
if (category) {
  query = query.eq("category", category);
}`,
      language: "javascript",
    },
  },
  {
    name: "Polls API",
    kind: "api",
    description: {
      ko: "본문 투표 블록 API. 에디터로 삽입한 투표 블록의 집계를 조회하고 투표를 처리합니다. 투표 질문/옵션은 본문 HTML에 저장되고, poll_votes 테이블은 집계만 담당하며 IP 기반으로 중복 투표를 방지합니다.",
      en: "In-content poll block API. Reads aggregates for poll blocks inserted via the editor and records votes. Poll questions/options live in the content HTML while the poll_votes table only handles aggregation, preventing duplicate votes by IP.",
    },
    endpoints: [
      { method: "GET", path: "/api/polls/[pollId]", description: { ko: "투표 블록 집계 조회 (옵션별 득표 + IP voted 여부)", en: "Get poll block aggregates (per-option counts + IP voted status)" } },
      { method: "POST", path: "/api/polls/[pollId]", description: { ko: "투표 (IP 기반 중복 방지)", en: "Cast a vote (IP-based duplicate prevention)" } },
    ],
  },
  {
    name: "Calendars API",
    kind: "api",
    description: {
      ko: "본문 캘린더 블록의 공유 달력 API. 투표와 달리 실데이터를 본문이 아니라 calendars 테이블에 두고, 블록은 calendarId만 참조합니다. 삭제는 posts/works와 같은 휴지통 규약(deleted_at + purge_after)을 따릅니다.",
      en: "Shared-calendar API behind the in-content calendar block. Unlike polls, the real data lives in the calendars table rather than the content body — a block only references calendarId. Deletion follows the same trash convention as posts/works (deleted_at + purge_after).",
    },
    designNote: {
      ko: "**연결형 저장**: 달력을 본문에 인라인으로 넣으면 같은 달력을 쓰는 글마다 사본이 생기고 서로 어긋납니다. 그래서 실데이터는 테이블 한 곳에 두고 본문 블록은 `calendarId` 만 참조합니다 — **여러 글이 같은 달력을 공유**하고 한 번 고치면 전부 반영됩니다. 대신 참조 무결성이 문제라, 달력이 휴지통에 들어가면 단건 조회가 `{ deleted: true }` 를 돌려주고 블록은 **\"연결 끊김\"** 으로 표시합니다.",
      en: "**Reference-based storage**: inlining a calendar into content would fork a copy per post and let them drift. So the real data lives once in the table and the content block only references `calendarId` — **multiple posts share one calendar** and a single edit propagates. The tradeoff is referential integrity: when a calendar is trashed, the single-item GET returns `{ deleted: true }` and the block renders as **\"link broken\"**.",
    },
    endpoints: [
      { method: "GET", path: "/api/calendars", description: { ko: "공유 달력 목록 (admin, ?trash=true: 휴지통)", en: "List shared calendars (admin, ?trash=true: trash)" } },
      { method: "POST", path: "/api/calendars", description: { ko: "공유 달력 생성 (admin)", en: "Create shared calendar (admin)" } },
      { method: "GET", path: "/api/calendars/[calendarId]", description: { ko: "달력 단건 조회 (휴지통 상태면 deleted 플래그 반환)", en: "Get single calendar (returns a deleted flag when trashed)" } },
      { method: "PUT", path: "/api/calendars/[calendarId]", description: { ko: "달력 수정 (admin)", en: "Update calendar (admin)" } },
      { method: "DELETE", path: "/api/calendars/[calendarId]", description: { ko: "휴지통 이동 — deleted_at + purge_after(30일) 세팅 (admin)", en: "Move to trash — sets deleted_at + purge_after (30 days) (admin)" } },
      { method: "POST", path: "/api/calendars/[calendarId]/restore", description: { ko: "휴지통에서 복구 (admin)", en: "Restore from trash (admin)" } },
      { method: "DELETE", path: "/api/calendars/[calendarId]/purge", description: { ko: "영구 삭제 (admin)", en: "Permanent delete (admin)" } },
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
      { method: "GET", path: "/api/works/[id]/related-series", description: { ko: "작업물에 연결된 시리즈 목록 (공개, series_work_relations 조인)", en: "Related series for a work (public, series_work_relations join)" } },
      { method: "GET", path: "/api/admin/works/[id]/related-series", description: { ko: "연결된 시리즈 관리 — 조회 (admin)", en: "Manage related series — read (admin)" } },
      { method: "PUT", path: "/api/admin/works/[id]/related-series", description: { ko: "연결된 시리즈 일괄 갱신 (admin, series_work_relations 동기화)", en: "Bulk-update related series (admin, syncs series_work_relations)" } },
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
    name: "Translation / AI Summary API",
    kind: "api",
    description: {
      ko: "번역 및 AI 요약 API. 복수 provider를 우선순위대로 시도하는 fallback 체인을 지원합니다. 기본 provider 실패 시 자동으로 다음 provider로 전환됩니다.",
      en: "Translation and AI summary APIs. Supports a fallback provider chain that tries providers in priority order. Automatically switches to the next provider on failure.",
    },
    endpoints: [
      { method: "POST", path: "/api/translate", description: { ko: "댓글 번역 — 본문이 아니라 댓글 id 를 받아 서버가 조회 (fallback provider 체인)", en: "Translate a comment — takes a comment id, not text, and reads it server-side (fallback provider chain)" } },
      { method: "POST", path: "/api/admin/translate", description: { ko: "관리자 번역 (긴 콘텐츠, fallback 지원)", en: "Admin translate (long content, fallback)" } },
      { method: "POST", path: "/api/posts/[id]/ai-summary", description: { ko: "포스트 AI 요약 생성 — 그 글의 편집 권한 필요 (fallback provider 체인)", en: "Generate post AI summary — requires edit access to that post (fallback provider chain)" } },
      { method: "POST", path: "/api/works/[id]/ai-summary", description: { ko: "작업물 AI 요약 생성 — admin 이상 (fallback provider 체인)", en: "Generate work AI summary — admin tier or above (fallback provider chain)" } },
      { method: "GET", path: "/api/service-status", description: { ko: "서비스 상태 조회 (기능 토글 + API 키 유무)", en: "Service status (feature toggles + API key availability)" } },
      { method: "POST", path: "/api/highlight", description: { ko: "서버사이드 코드 하이라이팅 (코드 블록을 서버에서 토큰화해 반환)", en: "Server-side code highlighting (tokenizes code blocks on the server)" } },
    ],
    exampleQuery: {
      title: "Fallback Provider Chain",
      code: `// provider 우선순위대로 시도, 실패 시 다음으로
for (const name of providerOrder) {
  try {
    const result = await callProvider(name, text, targetLang);
    return NextResponse.json({ result, provider: name });
  } catch (e) {
    lastError = e;
    continue;
  }
}
// 모든 provider 실패
return NextResponse.json({ error: lastError.message }, { status: 502 });`,
      language: "javascript",
    },
  },
  {
    name: "Revisions API",
    kind: "api",
    description: {
      ko: "에디터 자동저장 리비전 API. 포스트/작업물의 편집 스냅샷을 저장하고 복원할 수 있습니다. 엔티티당 최대 50개 리비전, 초과 시 오래된 것부터 삭제됩니다.",
      en: "Editor auto-save revisions API. Saves and restores edit snapshots for posts/works. Max 50 revisions per entity, oldest pruned on overflow.",
    },
    designNote: {
      ko: "**새 글도 리비전을 남긴다**: `entity_id` 를 uuid 가 아니라 **text** 로 둬, 아직 id 가 없는 새 글은 draft sentinel 을 키로 저장합니다. 편집 중 **3초 debounce** 로 스냅샷을 쌓고, 복원 프롬프트를 닫으면 `dismissed` 플래그로 다시 뜨지 않게 합니다. 새 글 작성 중 이탈해도 draft 로 남아 다음에 이어 쓸 수 있습니다.",
      en: "**New posts get revisions too**: `entity_id` is **text**, not uuid, so a new post with no id yet is saved under a draft sentinel key. Edits accrue on a **3-second debounce**, and dismissing the restore prompt sets a `dismissed` flag so it won't resurface. Leaving mid-draft still keeps it, so you can resume later.",
    },
    endpoints: [
      { method: "GET", path: "/api/revisions?entity_type=&entity_id=", description: { ko: "리비전 목록 조회 (최신순)", en: "List revisions (newest first)" } },
      { method: "POST", path: "/api/revisions", description: { ko: "리비전 저장 (스냅샷)", en: "Save revision (snapshot)" } },
      { method: "DELETE", path: "/api/revisions?entity_type=&entity_id=", description: { ko: "엔티티의 전체 리비전 삭제", en: "Purge all revisions for entity" } },
    ],
    exampleQuery: {
      title: "Auto-save with Pruning",
      code: `// 리비전 저장 + 50개 초과 시 오래된 것 삭제
await admin.from("revisions").insert({
  entity_type, entity_id,
  snapshot: { title, content, tags },
});

// 엔티티당 최대 50개 유지
const { data: old } = await admin.from("revisions")
  .select("id")
  .eq("entity_type", entity_type)
  .eq("entity_id", entity_id)
  .order("created_at", { ascending: false })
  .range(50, 999);

if (old?.length) {
  await admin.from("revisions")
    .delete().in("id", old.map(r => r.id));
}`,
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
    exampleQuery: {
      title: "JSONB Upsert Pattern",
      code: `// site_settings 테이블에 profile JSONB upsert
const { error } = await admin.from("site_settings")
  .upsert({
    id: "profile",
    config: profileData, // { experiences, skills, ... }
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });`,
      language: "javascript",
    },
  },
  {
    name: "Members / Auth API",
    kind: "api",
    description: {
      ko: "멀티 저자 인증·멤버 관리 API. GitHub OAuth 로그인, 이메일 초대, 역할 기반 접근 제어를 처리합니다. 역할(소유자/편집자/저자)은 auth.users.app_metadata 에 저장되며 서버에서만 갱신됩니다. 초대받지 않은 OAuth 로그인은 콜백에서 차단하고, 로그아웃은 모든 탭에 전파됩니다.",
      en: "Multi-author auth + member management APIs. Handles GitHub OAuth login, email invites, and role-based access control. Roles (owner/editor/author) live in auth.users.app_metadata and are updated server-side only. Un-invited OAuth logins are blocked at the callback, and logout propagates across all tabs.",
    },
    designNote: {
      ko: "**인증 ≠ 인가**: OAuth 는 신원만 확인하므로, 콜백(`/auth/callback`)에서 세션 교환 직후 이메일이 `OWNER_EMAIL`·기존 역할·`author_invites` 초대 중 하나에 해당하는지 서버에서 재검사합니다. 아니면 `signOut()` + service_role `deleteUser()` 로 계정을 즉시 제거합니다. **역할은 `app_metadata`(service_role 전용)** 에만 저장해 클라이언트 조작을 원천 차단하고, 소유자는 `OWNER_EMAIL` env 로 부트스트랩합니다. **소유자 확정은 claim-and-close** — `OWNER_EMAIL` 소유자가 처음 로그인하면 `role=owner` 를 `app_metadata` 에 1회 못박아 이후 env 가 바뀌어도 소유권이 유지되고, `OWNER_EMAIL` 이 미설정이면 소유자를 판정할 수 없으므로 계정을 삭제하지 않고 설정 에러만 표시해 배포 초기 자기 삭제를 막습니다. 비소유자는 계정 탭만 접근 가능하며 설정 변경은 서버에서도 막습니다.",
      en: "**AuthN ≠ AuthZ**: OAuth only verifies identity, so the callback (`/auth/callback`) re-checks server-side, right after the session exchange, whether the email is `OWNER_EMAIL`, already has a role, or has an `author_invites` row. Otherwise it `signOut()`s and `deleteUser()`s the account immediately. **Roles live only in `app_metadata` (service_role only)** to block client tampering, and the owner is bootstrapped from `OWNER_EMAIL`. **Owner confirmation is claim-and-close** — on the `OWNER_EMAIL` owner's first login, `role=owner` is persisted into `app_metadata` once so ownership survives later env changes, and when `OWNER_EMAIL` is unset the owner can't be resolved so the account is kept (only a config error is shown) to avoid self-deletion during initial deployment. Non-owners can reach only the account tab, and settings writes are refused server-side too.",
    },
    endpoints: [
      { method: "GET", path: "/auth/callback", description: { ko: "OAuth 콜백 — 세션 교환 후 허용 검사(owner/역할/초대), 소유자 첫 로그인 시 owner 역할 영속화, 미허용 시 계정 삭제(단 OWNER_EMAIL 미설정이면 설정 에러) + 실패 리다이렉트", en: "OAuth callback — exchange session, allow-check (owner/role/invite), persist owner role on first login, delete account if not allowed (config error instead when OWNER_EMAIL unset) + fail-redirect" } },
      { method: "GET", path: "/api/admin/me", description: { ko: "현재 로그인 사용자의 이메일·역할·레벨·소유자 여부 (설정 탭 게이팅)", en: "Current user's email/role/level/owner flag (settings tab gating)" } },
      { method: "GET", path: "/api/admin/authors/members", description: { ko: "OAuth 인증 멤버 + 대기중 초대 목록 (owner 전용)", en: "OAuth-authed members + pending invites (owner only)" } },
      { method: "PATCH", path: "/api/admin/authors/members", description: { ko: "멤버 권한 변경 / 저자 프로필 연결 (owner 전용)", en: "Change member permission / link author profile (owner only)" } },
      { method: "DELETE", path: "/api/admin/authors/members", description: { ko: "멤버 계정 삭제 (owner/본인 가드)", en: "Delete member account (owner/self guards)" } },
      { method: "GET", path: "/api/admin/authors/context", description: { ko: "비소유자용 컨텍스트 — ownerEmail·멤버 저자ID/이메일 (403 없이 목록 표시)", en: "Non-owner context — ownerEmail + member author IDs/emails (list without 403)" } },
      { method: "POST", path: "/api/admin/authors/invite", description: { ko: "저자 이메일 초대 — author_invites 등록 + Resend 안내 메일 (owner 전용)", en: "Invite author by email — insert author_invites + Resend notice (owner only)" } },
    ],
    exampleQuery: {
      title: "OAuth Callback — AuthZ Gate + Owner Bootstrap",
      code: `// 콜백: 인증(OAuth)은 끝났지만 인가는 우리가 판정한다
const { data: { session } } = await supabase.auth
  .exchangeCodeForSession(code);
const role = getUserRole(session.user); // OWNER_EMAIL + app_metadata

const allowed =
  role.isOwner || role.role !== null ||
  (await admin.from("author_invites")
    .select("email").eq("email", email).maybeSingle()).data;

if (!allowed) {
  await supabase.auth.signOut();
  // OWNER_EMAIL 미설정 → 이 계정이 곧 소유자일 수 있으니 삭제 금지
  if (!process.env.OWNER_EMAIL?.trim())
    return redirect("/admin/login?error=owner_email_unset");
  await admin.auth.admin.deleteUser(session.user.id); // 미초대
  return redirect("/admin/login?error=not_invited");
}

// claim-and-close: 소유자 첫 로그인 → role=owner 를 DB 에 1회 못박음
if (role.isOwner) await ensureOwnerRole(admin, session.user);`,
      language: "javascript",
    },
  },
];

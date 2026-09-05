/**
 * API 라우트 안전망의 대상 표.
 *
 * #696(API 슬라이스)에서 104개 라우트의 응답 만드는 방식을 통일한다. 지금은 라우트를
 * 직접 호출하는 테스트가 하나도 없어서, 상태 코드나 본문 모양이 바뀌어도 아무도 모른다.
 * 그래서 손대기 전에 **지금 무엇을 돌려주는지** 를 여기에 박아 둔다.
 *
 * 두 가지 원칙으로 만들었다.
 *
 * 1. **GET 만 부른다.** 이 테스트는 사용자의 실제 Supabase 를 상대로 돈다. POST·DELETE 를
 *    부르면 진짜 데이터가 바뀐다. 쓰기 라우트는 비로그인 거부(401)만 확인한다 — 그건
 *    데이터에 닿기 전에 끊기므로 안전하다.
 * 2. **동적 세그먼트(`[id]`)는 뺐다.** 실제 id 가 필요한데, 그러면 테스트가 특정 데이터에
 *    묶여 데이터가 지워지면 같이 깨진다.
 *
 * 표의 값은 추측이 아니라 2026-09-05 에 실제로 호출해 받은 응답이다.
 */

/** 응답 본문에서 무엇을 확인할지. */
export type BodyShape =
  | { kind: "array" }
  | { kind: "object"; keys: string[] }
  | { kind: "error" }
  /** 이미지 등 JSON 이 아닌 응답 — 상태 코드만 본다. */
  | { kind: "raw" };

export type ApiRoute = { path: string; shape: BodyShape };

/** 로그인 없이 200 을 주는 라우트. */
export const PUBLIC_OK: ApiRoute[] = [
  { path: "/api/categories", shape: { kind: "array" } },
  { path: "/api/comments/recent", shape: { kind: "array" } },
  { path: "/api/favicon", shape: { kind: "raw" } },
  { path: "/api/fonts/search", shape: { kind: "object", keys: ["fonts"] } },
  { path: "/api/posts", shape: { kind: "object", keys: ["posts", "total", "page", "totalPages"] } },
  { path: "/api/posts/popular-ids", shape: { kind: "object", keys: ["ids"] } },
  { path: "/api/series", shape: { kind: "array" } },
  { path: "/api/service-status", shape: { kind: "object", keys: ["translation", "aiSummary", "aiCover"] } },
  { path: "/api/visits", shape: { kind: "object", keys: ["today", "total"] } },
  { path: "/api/work-comments/recent", shape: { kind: "array" } },
  { path: "/api/works", shape: { kind: "object", keys: ["works", "total", "page", "totalPages"] } },
  { path: "/api/works-categories", shape: { kind: "array" } },
];

/** 공개지만 필수 파라미터가 없으면 400 을 주는 라우트. */
export const PUBLIC_NEEDS_PARAM: string[] = [
  "/api/admin/auth/approve-device",
  "/api/comment-reactions",
  "/api/comments",
  "/api/work-comments",
];

/** 로그인해야 하는 GET 라우트. 비로그인이면 401 `{ error: "Unauthorized" }`. */
export const PROTECTED_GET: string[] = [
  "/api/admin/account",
  "/api/admin/auth/devices",
  "/api/admin/authors/context",
  "/api/admin/authors/github-profile",
  "/api/admin/authors/invite",
  "/api/admin/authors/members",
  "/api/admin/categories",
  "/api/admin/comments",
  "/api/admin/cover",
  "/api/admin/cover-history",
  "/api/admin/dashboard",
  "/api/admin/giscus-repo",
  "/api/admin/me",
  "/api/admin/notifications",
  "/api/admin/profile",
  "/api/admin/profile/github-repos",
  "/api/admin/project-images",
  "/api/admin/reports",
  "/api/admin/secrets",
  "/api/admin/settings",
  "/api/admin/tags",
  "/api/admin/works-categories",
  "/api/calendars",
  "/api/cover/pexels",
  "/api/cover/pexels/videos",
  "/api/cover/unsplash",
  "/api/custom-emojis",
];

/**
 * 로그인해도 필수 파라미터가 없으면 400 을 주는 GET 라우트.
 * 이 검증 분기는 응답 헬퍼를 갈아끼울 때(#696 5-3) 가장 쉽게 깨지는 자리라 따로 본다.
 */
export const PROTECTED_GET_NEEDS_PARAM: string[] = [
  "/api/admin/dashboard/category",
  "/api/admin/dashboard/day",
  "/api/posts/export",
  "/api/revisions",
  "/api/works/export",
];

/**
 * 파라미터를 주면 200 을 주는 GET 라우트.
 * 값은 **실제 데이터에 없는 것**을 골랐다 — 있는 값을 쓰면 그 데이터가 지워질 때 테스트가 같이 깨진다.
 * 없는 값이어도 200 에 빈 결과를 주는 것이 이 라우트들의 현재 동작이다.
 */
export const PROTECTED_GET_WITH_PARAM: (ApiRoute & { query: string })[] = [
  {
    path: "/api/admin/dashboard/category",
    query: "name=__e2e_없는_카테고리__",
    shape: { kind: "object", keys: ["posts"] },
  },
  {
    path: "/api/admin/dashboard/day",
    query: "date=1999-01-01",
    shape: { kind: "object", keys: ["topPosts", "totalViews"] },
  },
  {
    path: "/api/revisions",
    query: "entity_type=post&entity_id=00000000-0000-0000-0000-000000000000",
    shape: { kind: "array" },
  },
];

/**
 * 로그인해야 하는 쓰기 라우트 — **비로그인 거부만** 확인한다.
 * 로그인 상태로는 부르지 않는다. 부르면 실제 데이터가 바뀐다.
 */
export const PROTECTED_WRITE: { path: string; method: "POST" | "PATCH" | "DELETE" | "PUT" }[] = [
  { path: "/api/admin/account", method: "PATCH" },
  { path: "/api/admin/auth/logout-all", method: "POST" },
  { path: "/api/admin/authors/invite", method: "POST" },
  { path: "/api/admin/authors/members", method: "PATCH" },
  { path: "/api/admin/cover-history", method: "POST" },
  { path: "/api/admin/notifications", method: "PATCH" },
  { path: "/api/admin/profile", method: "PATCH" },
  { path: "/api/admin/secrets", method: "POST" },
  { path: "/api/admin/settings", method: "PATCH" },
  { path: "/api/admin/tags/remove", method: "POST" },
  { path: "/api/admin/translate", method: "POST" },
  { path: "/api/admin/upload", method: "POST" },
  { path: "/api/calendars", method: "POST" },
  { path: "/api/cover/ai-generate", method: "POST" },
  { path: "/api/custom-emojis", method: "POST" },
  { path: "/api/posts", method: "POST" },
  { path: "/api/posts/auto-cover", method: "POST" },
  { path: "/api/posts/reassign-category", method: "POST" },
  { path: "/api/revisions", method: "POST" },
  { path: "/api/works", method: "POST" },
];

/**
 * 외부 서비스를 부르는 라우트. 로그인 상태에서도 응답이 키 설정·상대 서버 상태에 달려 있어
 * 200 을 단정할 수 없다. "인증은 통과했다(401 아님)" 와 "서버가 터지지 않았다(5xx 아님)" 만 본다.
 */
export const EXTERNAL_BACKED = new Set<string>([
  "/api/admin/authors/github-profile",
  "/api/admin/profile/github-repos",
  "/api/admin/giscus-repo",
  "/api/cover/pexels",
  "/api/cover/pexels/videos",
  "/api/cover/unsplash",
  "/api/fonts/search",
]);

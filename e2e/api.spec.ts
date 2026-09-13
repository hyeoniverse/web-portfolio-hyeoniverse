import { test, expect, type APIResponse } from "@playwright/test";
import {
  PUBLIC_OK,
  PUBLIC_NEEDS_PARAM,
  PROTECTED_GET,
  PROTECTED_WRITE,
  type BodyShape,
} from "./apiRoutes";

/**
 * API 안전망 — 비로그인 호출.
 *
 * #696 에서 응답 만드는 방식을 통일한다. 그 전에 지금 상태 코드와 본문 모양을 박아 둔다.
 * 자세한 원칙은 apiRoutes.ts 주석 참고 — GET 만 부르고, 쓰기 라우트는 거부만 확인한다.
 */

async function checkShape(res: APIResponse, shape: BodyShape, label: string) {
  if (shape.kind === "raw") return;
  // res.json() 은 any 라 그대로 두면 타입 커버리지가 떨어진다. unknown 으로 받아 좁혀 쓴다.
  const body: unknown = await res.json();
  if (shape.kind === "array") {
    expect(Array.isArray(body), `${label}: 배열을 돌려줘야 한다`).toBe(true);
    return;
  }
  if (shape.kind === "error") {
    expect(body, `${label}: { error } 형태여야 한다`).toHaveProperty("error");
    return;
  }
  for (const key of shape.keys) {
    expect(body, `${label}: 최상위에 ${key} 가 있어야 한다`).toHaveProperty(key);
  }
}

test.describe("비로그인 — 공개 라우트", () => {
  for (const { path, shape } of PUBLIC_OK) {
    test(`GET ${path} → 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path} 는 로그인 없이 200 이어야 한다`).toBe(200);
      await checkShape(res, shape, path);
    });
  }
});

test.describe("비로그인 — 필수 파라미터 누락", () => {
  for (const path of PUBLIC_NEEDS_PARAM) {
    test(`GET ${path} → 400 + { error }`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path} 는 파라미터가 없으면 400 이어야 한다`).toBe(400);
      // approve-device 는 HTML 을 돌려주므로 본문 모양은 보지 않는다.
      if (path !== "/api/admin/auth/approve-device") {
        await checkShape(res, { kind: "error" }, path);
      }
    });
  }
});

test.describe("비로그인 — 보호된 GET 은 401", () => {
  for (const path of PROTECTED_GET) {
    test(`GET ${path} → 401`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path} 는 로그인 없이 401 이어야 한다`).toBe(401);
      // res.json() 은 any 라 그대로 두면 타입 커버리지가 떨어진다. unknown 으로 받아 좁혀 쓴다.
  const body: unknown = await res.json();
      expect(body, `${path}: { error } 형태여야 한다`).toHaveProperty("error");
    });
  }
});

/* /api/* 의 쓰기 요청은 두 겹으로 막혀 있다. 바깥이 proxy.ts 의 same-origin 검사(CSRF)이고,
   안쪽이 라우트의 인증이다. 둘을 따로 확인한다 — 하나가 뚫려도 다른 하나가 가려 주면
   테스트가 통과해 버리기 때문이다.

   주의: same-origin 검사는 프로덕션 빌드에서만 동작한다(dev 는 편의상 통과시킨다).
   webServer 가 `npm run start` 로 띄우므로 기본 실행 경로에서는 켜져 있다.
   E2E_BASE_URL 로 dev 서버를 가리키면 아래 CSRF 검사는 맞지 않는다. */

const ORIGIN = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("비로그인 — 쓰기는 CSRF 검사에서 먼저 끊긴다", () => {
  for (const { path, method } of PROTECTED_WRITE) {
    test(`${method} ${path} (origin 없음) → 403`, async ({ request }) => {
      const res = await request.fetch(path, { method, data: {} });
      expect(
        res.status(),
        `${path}: origin 없는 쓰기 요청은 CSRF 검사에서 403 이어야 한다`,
      ).toBe(403);
    });
  }
});

test.describe("비로그인 — CSRF 를 통과해도 인증에서 끊긴다", () => {
  for (const { path, method } of PROTECTED_WRITE) {
    test(`${method} ${path} (같은 origin) → 401`, async ({ request }) => {
      const res = await request.fetch(path, {
        method,
        data: {},
        headers: { origin: ORIGIN },
      });
      expect(
        res.status(),
        `${path}: 로그인 없이 401 이어야 한다 — 여기서 안 끊기면 아래 코드가 실제 데이터를 건드린다`,
      ).toBe(401);
    });
  }
});

/* 상세 페이지의 없는 주소·옛 주소(#891). 글·작업물 상세에는 loading.tsx 가 있어 응답이 로딩 화면부터 스트리밍됐고,
   그 뒤 페이지에서 부르는 notFound()·redirect() 는 200 응답 안의 내용으로만 전해졌다. 이제 [slug] 레이아웃이 먼저 확인한다 */
test.describe("비로그인 — 상세 페이지의 없는 주소·옛 주소", () => {
  test("없는 글 주소는 404", async ({ request }) => {
    const res = await request.get("/posts/e2e-no-such-post-xyz", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test("없는 작업물 주소는 404", async ({ request }) => {
    const res = await request.get("/works/e2e-no-such-work-xyz", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  /* 상세는 미리 그려 캐시한다(#909). 그 안의 redirect() 는 캐시가 없는 첫 요청에 Location 을 두 번 실어(vercel/next.js#82117)
     옛 주소는 proxy 가 그리기 전에 보낸다. Location 이 한 번인지까지 본다 */
  const locations = async (res: APIResponse) =>
    (await res.headersArray()).filter((h) => h.name.toLowerCase() === "location").map((h) => new URL(h.value, "http://local").pathname);

  test("작업물의 옛 id 주소는 slug 주소로 307", async ({ request }) => {
    const body = (await (await request.get("/api/works")).json()) as { works?: { id: string; slug?: string | null }[] };
    const work = body.works?.find((w) => w.slug && w.slug !== w.id);
    test.skip(!work, "slug 가 있는 작업물이 없다");
    const res = await request.get(`/works/${work!.id}`, { maxRedirects: 0 });
    expect(res.status(), "옛 주소는 HTTP 이동이어야 한다").toBe(307);
    expect(await locations(res)).toEqual([`/works/${work!.slug}`]);
  });

  test("작업물의 옛 번호 주소도 slug 주소로 307", async ({ request }) => {
    const body = (await (await request.get("/api/works")).json()) as { works?: { id: string; slug?: string | null; sort_order?: number }[] };
    const work = body.works?.find((w) => w.slug && w.sort_order === 1);
    test.skip(!work, "첫 자리 작업물에 slug 가 없다");
    const res = await request.get("/works/1", { maxRedirects: 0 });
    expect(res.status(), "옛 주소는 HTTP 이동이어야 한다").toBe(307);
    expect(await locations(res)).toEqual([`/works/${work!.slug}`]);
  });
});

/* 디자인 시스템·관리자 영역의 없는 주소(#903). 두 영역의 레이아웃이 페이지를 관리자 사전 게이트(AdminTranslationsGate)로
   감쌌고, 게이트는 서버에서 자식을 그리지 않아 [...missing] 의 notFound() 가 HTML 에 반영되지 않은 채 200 으로 나갔다.
   관리자 쪽 [...missing] 은 (dashboard) 밖으로 옮겼으므로, 로그인 확인이 그대로인지도 본다 */
test.describe("비로그인 — 디자인 시스템·관리자 영역의 없는 주소", () => {
  test("디자인 시스템의 없는 하위 주소는 404", async ({ request }) => {
    const res = await request.get("/design-system/e2e-no-such-page", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test("관리자 영역의 없는 주소는 로그인 화면으로 307", async ({ request }) => {
    const res = await request.get("/admin/e2e-no-such-page", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(new URL(res.headers().location ?? "", "http://local").pathname).toBe("/admin/login");
  });
});

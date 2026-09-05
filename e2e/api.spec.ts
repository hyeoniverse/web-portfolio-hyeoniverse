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

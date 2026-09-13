import { test, expect } from "@playwright/test";
import {
  PROTECTED_GET,
  PROTECTED_GET_NEEDS_PARAM,
  PROTECTED_GET_WITH_PARAM,
  EXTERNAL_BACKED,
} from "./apiRoutes";

/**
 * API 안전망 — 로그인 상태.
 *
 * 비로그인 쪽(api.spec.ts)이 "막혀 있는가" 를 본다면 여기는 "통과시키면 제대로 답하는가" 를 본다.
 * 인증 배선을 건드리면(#696 5-4) 401 이 그대로 남거나 500 이 나는 식으로 깨지는데,
 * 비로그인 테스트만으로는 그걸 못 잡는다.
 *
 * **GET 만 부른다.** 쓰기 라우트는 로그인 상태로 부르면 실제 데이터가 바뀐다.
 */

test.describe("로그인 — 보호된 GET", () => {
  for (const path of PROTECTED_GET) {
    test(`GET ${path}`, async ({ request }) => {
      const res = await request.get(path);
      const status = res.status();

      expect(status, `${path}: 로그인했는데 401 이면 인증 배선이 끊긴 것이다`).not.toBe(401);
      expect(status, `${path}: 5xx 는 서버가 터진 것이다`).toBeLessThan(500);

      if (EXTERNAL_BACKED.has(path)) {
        // 외부 서비스 응답에 달려 있어 200 을 단정하지 않는다. 위 두 줄이 이 라우트의 계약이다.
        return;
      }
      expect(status, `${path}: 로그인 상태에서는 200 이어야 한다`).toBe(200);

      const body: unknown = await res.json();
      expect(body, `${path}: 200 인데 { error } 를 돌려주면 안 된다`).not.toHaveProperty("error");
    });
  }
});

test.describe("로그인 — 필수 파라미터가 없으면 400", () => {
  for (const path of PROTECTED_GET_NEEDS_PARAM) {
    test(`GET ${path} → 400 + { error }`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path}: 파라미터가 없으면 400 이어야 한다`).toBe(400);
      expect(await res.json(), `${path}: { error } 형태여야 한다`).toHaveProperty("error");
    });
  }
});

test.describe("로그인 — 파라미터를 주면 200", () => {
  for (const { path, query, shape } of PROTECTED_GET_WITH_PARAM) {
    test(`GET ${path}?${query} → 200`, async ({ request }) => {
      const res = await request.get(`${path}?${query}`);
      expect(res.status(), `${path}: 파라미터가 있으면 200 이어야 한다`).toBe(200);
      const body: unknown = await res.json();
      if (shape.kind === "array") {
        expect(Array.isArray(body), `${path}: 배열을 돌려줘야 한다`).toBe(true);
      } else if (shape.kind === "object") {
        for (const key of shape.keys) {
          expect(body, `${path}: 최상위에 ${key} 가 있어야 한다`).toHaveProperty(key);
        }
      }
    });
  }
});

/* 관리자 영역의 없는 주소(#903). (dashboard) 레이아웃의 관리자 사전 게이트 안에서 그려져 404 화면이 200 으로 나갔다 */
test.describe("로그인 — 관리자 영역의 없는 주소", () => {
  for (const path of ["/admin/e2e-no-such-page", "/admin/posts/e2e-no-such/x"]) {
    test(`GET ${path} 는 404`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(404);
    });
  }
});

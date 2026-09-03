import { expect, type Page } from "@playwright/test";
import type { Route } from "./routes";

/**
 * 화면을 덮는 오버레이가 사라질 때까지 대기.
 * LoadingScreen 은 로딩 완료 후 페이드아웃하고 언마운트된다. 이걸 안 기다리면
 * "검은 화면 + 로고" 상태에서 검증이 돌아 실제 페이지를 못 본다.
 */
async function waitForOverlays(page: Page) {
  for (const sel of ['[class*="loadingScreen"]', '[class*="transitionOverlay"]']) {
    await page
      .locator(sel)
      .waitFor({ state: "detached", timeout: 30_000 })
      .catch(() => {
        // 해당 라우트에 애초에 없는 오버레이면 무시
      });
  }
}

/** 스크롤 트리거 애니메이션·lazy 콘텐츠를 발화시켜 페이지 전체를 렌더/실행시킨 뒤 최상단으로. */
export async function settle(page: Page, skipScroll = false) {
  await waitForOverlays(page);

  if (!skipScroll) {
    await page.evaluate(async () => {
      // Lenis 관성 스크롤을 우회해 즉시 이동. 긴 페이지에서 무한정 돌지 않게 스텝 상한.
      const step = window.innerHeight;
      for (let i = 0; i < 40; i++) {
        const y = i * step;
        if (y > document.body.scrollHeight) break;
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 100));
    });
  }

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
}

/**
 * app/not-found.tsx 제목(locales `errorPage.notFoundTitle`). 동적 라우트는 loading.tsx 가 먼저
 * 스트리밍돼 notFound() 여도 HTTP 200 이라, 상태 코드만으로는 404 화면을 못 거른다.
 */
const NOT_FOUND_TITLE = /Page Not Found|페이지를 찾을 수 없습니다/;

/**
 * 한 라우트를 열고 안정화한 뒤 "깨지지 않았는지"만 스모크 검증한다.
 * 픽셀 비교가 아니라 breakage 감시 — UI 변경은 허용하고 아래만 잡는다:
 *
 *   1. 페이지 로드         (HTTP status < 400, 404 화면 미노출)
 *   2. 런타임 에러 0        (uncaught exception)
 *   3. 에러 바운더리 미노출  (app/error.tsx 가 뜨면 console 에 "Application Error:")
 *   4. 실질 콘텐츠 렌더      (빈/깨진 화면 아님)
 */
export async function smokeRoute(page: Page, route: Route) {
  const pageErrors: string[] = [];
  let errorBoundary = false;
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Application Error:/.test(msg.text())) errorBoundary = true;
  });

  // admin 은 client 에서 config 를 fetch 하므로 networkidle 로, public 은 폴링·three.js 로
  // networkidle 이 안 와 load 로 대기한다.
  const isAdmin = route.path.startsWith("/admin");
  const res = await page.goto(route.path, { waitUntil: isAdmin ? "networkidle" : "load" });
  expect(res?.status(), `${route.path} 응답 상태`).toBeLessThan(400);

  await settle(page, route.skipScroll);

  expect(errorBoundary, `${route.path} 에러 바운더리(app/error.tsx) 노출`).toBe(false);

  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length, `${route.path} 빈/깨진 화면`).toBeGreaterThan(20);
  expect(bodyText, `${route.path} 404 화면 (slug 가 DB 에 없음)`).not.toMatch(NOT_FOUND_TITLE);

  // 있어야 할 섹션이 조용히 빠졌는지 — 데이터 fetch 가 실패해도 페이지는 멀쩡해 보이므로 따로 본다.
  if (route.expectVisible) {
    await expect(
      page.locator(route.expectVisible.selector).first(),
      `${route.path} ${route.expectVisible.label}`,
    ).toBeVisible({ timeout: 10_000 });
  }

  // 착수 전부터 있던 결함(knownPageErrors)은 걸러내 새 회귀만 남긴다.
  const newErrors = pageErrors.filter(
    (e) => !(route.knownPageErrors ?? []).some((re) => re.test(e)),
  );
  expect(newErrors, `${route.path} 런타임 에러`).toEqual([]);
}

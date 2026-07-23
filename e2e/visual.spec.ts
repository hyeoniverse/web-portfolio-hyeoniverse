import { test, expect, type Page } from "@playwright/test";
import { PUBLIC_ROUTES, GLOBAL_MASKS, HIDE_CSS } from "./routes";

/**
 * 리팩토링 시각 회귀. docs/refactoring-guide.md P1 — refactor 커밋은 픽셀이 같아야 한다.
 *
 *   baseline 갱신:  npx playwright test --update-snapshots
 *   비교 실행:      npx playwright test
 *
 * baseline 은 리팩토링 착수 "전" 커밋에서 찍는다. 이후 diff 가 나면 P1 위반이거나 의도된 design 변경이다.
 */

/**
 * 화면을 덮는 오버레이가 사라질 때까지 대기.
 *
 * LoadingScreen 은 로딩 완료 후 500ms 페이드아웃하고 언마운트된다 (`/privacy` 만 skip 대상).
 * 이걸 안 기다리면 "검은 화면 + 로고" 상태가 baseline 으로 박혀 이후 모든 실행이 diff 로 뜬다.
 * CSS Modules 클래스는 `LoadingScreen-module__해시__loadingScreen` 형태라 부분 일치로 잡는다.
 */
async function waitForOverlays(page: Page) {
  for (const sel of ['[class*="loadingScreen"]', '[class*="transitionOverlay"]']) {
    await page.locator(sel).waitFor({ state: "detached", timeout: 30_000 }).catch(() => {
      // 해당 라우트에 애초에 없는 오버레이면 무시
    });
  }
}

/** 스크롤 트리거 애니메이션·lazy 이미지를 전부 발화시킨 뒤 최상단으로 되돌린다. */
async function settle(page: Page, skipScroll = false) {
  await waitForOverlays(page);

  if (!skipScroll) {
    await page.evaluate(async () => {
      // Lenis 관성 스크롤을 우회해 즉시 이동. 아주 긴 페이지에서 무한정 돌지 않도록 스텝 상한을 둔다.
      const step = window.innerHeight;
      const maxSteps = 40;
      for (let i = 0; i < maxSteps; i++) {
        const y = i * step;
        if (y > document.body.scrollHeight) break;
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 120));
    });
  }

  await page.evaluate(() => document.fonts.ready);

  // 남은 이미지 디코드 대기. 응답 없는 원격 이미지에 발목 잡히지 않게 개별 타임아웃을 건다.
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((r) => {
              const done = () => r(null);
              img.onload = img.onerror = done;
              setTimeout(done, 3000);
            }),
        ),
    );
  });

  await page.waitForTimeout(300);

  // 문서 높이가 멈출 때까지 대기. lazy 콘텐츠·지연 마운트 때문에 fullPage 높이가 실행마다 달라지면
  // (셋업 중 최대 200px 가까이 흔들렸다) diff 가 아니라 크기 불일치로 실패한다.
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __lastH?: number; __stableN?: number };
      const h = document.documentElement.scrollHeight;
      w.__stableN = h === w.__lastH ? (w.__stableN ?? 0) + 1 : 0;
      w.__lastH = h;
      return (w.__stableN ?? 0) >= 3;
    },
    null,
    { timeout: 20_000, polling: 250 },
  );
}

for (const route of PUBLIC_ROUTES) {
  test(`visual: ${route.name}`, async ({ page }) => {
    // three.js·폴링이 도는 페이지가 있어 networkidle 은 영원히 안 온다. load 로 잡고 settle 에서 안정화.
    test.setTimeout(90_000);

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const res = await page.goto(route.path, { waitUntil: "load" });
    expect(res?.status(), `${route.path} 응답 상태`).toBeLessThan(400);

    await settle(page, route.skipScroll);
    await page.addStyleTag({ content: HIDE_CSS });

    const masks = [...GLOBAL_MASKS, ...(route.mask ?? [])].map((s) => page.locator(s));

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: route.fullPage ?? true,
      mask: masks,
    });

    // 리팩토링이 런타임 에러를 새로 만들었는지 같이 잡는다 — 시각 diff 로는 안 보이는 회귀.
    // 착수 전부터 있던 결함(knownPageErrors)은 걸러내 새 회귀만 남긴다.
    const newErrors = errors.filter(
      (e) => !(route.knownPageErrors ?? []).some((re) => re.test(e)),
    );
    expect(newErrors, `${route.path} 런타임 에러`).toEqual([]);
  });
}

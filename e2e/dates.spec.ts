import { test, expect, type Page } from "@playwright/test";

/**
 * 서버가 그린 날짜와 브라우저가 다시 계산한 날짜가 같아야 한다(#927).
 *
 * 날짜를 실행 환경의 시간대로 그리면, 서버(배포는 UTC)와 방문자 브라우저의 날짜가 갈리는 글에서 하이드레이션이 깨지고(React #418)
 * 서버 HTML 을 버리고 다시 그린다. 한국 시간(SITE_TIME_ZONE)으로 고정했는지를 다른 시간대·시각의 브라우저로 본다.
 * 글 상세를 열면 조회수 POST 가 나가므로 막는다.
 */

/** 하이드레이션 오류(#418·#425)를 모으고, 하이드레이션이 끝났는지(LanguageProvider 가 lang 을 처음 쓰는 때) 알려 준다 */
async function watchHydration(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => { if (/#418|#425|hydrat/i.test(e.message)) errors.push(e.message.slice(0, 200)); });
  await page.route(/\/view$/, (route) => route.abort());
  await page.addInitScript(() => {
    new MutationObserver((_, observer) => {
      (window as unknown as { __hydrated?: boolean }).__hydrated = true;
      observer.disconnect();
    }).observe(document, { attributes: true, attributeFilter: ["lang"], subtree: true });
  });
  return {
    errors,
    /** 하이드레이션이 끝나고 오류가 올라올 틈을 조금 준다 */
    settled: async () => {
      await page.waitForFunction(() => (window as unknown as { __hydrated?: boolean }).__hydrated === true);
      await page.waitForTimeout(1000);
    },
  };
}

test.describe("미국 서부 시간대의 브라우저", () => {
  test.setTimeout(90_000);
  test.use({ timezoneId: "America/Los_Angeles" });

  test("글 상세의 작성일은 한국 시간 날짜이고 하이드레이션이 깨지지 않는다", async ({ page, request }) => {
    // 한국 시간과 미국 서부 시간에서 날짜가 갈리는 글을 고른다
    const { posts } = (await (await request.get("/api/posts?sort=newest&limit=50")).json()) as { posts: { slug: string; created_at: string }[] };
    const dateIn = (iso: string, timeZone: string) =>
      new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone });
    const post = posts.find((p) => dateIn(p.created_at, "Asia/Seoul") !== dateIn(p.created_at, "America/Los_Angeles"));
    test.skip(!post, "두 시간대에서 날짜가 갈리는 글이 없다");

    const hydration = await watchHydration(page);
    await page.goto(`/posts/${post!.slug}`, { waitUntil: "load" });
    await hydration.settled();
    expect(hydration.errors, "하이드레이션 오류").toEqual([]);
    await expect(page.locator('[class*="PostArticleHeader-module__"][class*="__meta"] > span:first-child'))
      .toHaveText(dateIn(post!.created_at, "Asia/Seoul"));
  });
});

test.describe("/works 의 지금 달", () => {
  test.setTimeout(90_000);

  test("브라우저 시계가 다음 달이어도(캐시된 HTML) 하이드레이션이 깨지지 않는다", async ({ page }) => {
    const hydration = await watchHydration(page);
    // 서버는 지금 그렸고, 브라우저는 한국 시간으로 다음 달 1일 새벽 2시다
    const now = new Date();
    await page.clock.setSystemTime(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 7 * 3600_000));
    await page.goto("/works", { waitUntil: "load" });
    test.skip((await page.locator('[class*="__fixedDate"]').count()) === 0, "원통 배치가 아니다");
    await hydration.settled();
    expect(hydration.errors, "하이드레이션 오류").toEqual([]);
  });
});

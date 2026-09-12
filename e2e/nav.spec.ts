import { test, expect } from "@playwright/test";

/**
 * 전역 네비게이션 안전망.
 *
 * 모든 페이지 위에 있는 막대다. 이것을 그리는 Navigation.tsx 는 1,246줄이고, 그 안에
 * 알림·모바일 메뉴·하위 메뉴·로고 크기 측정·소리 켜기·테마 바꾸기가 한 컴포넌트에 들어 있다.
 * 이것을 기능별로 나눌 예정인데, 지금은 페이지가 열리는지만 확인하고 있어서 메뉴가 안 열리거나
 * 표시가 안 따라와도 검사가 통과한다.
 */

test.describe("전역 네비게이션", () => {
  test.setTimeout(120_000);

  test("메뉴 항목과 단추가 그려진다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible({ timeout: 30_000 });

    for (const name of ["Works", "Posts", "Profile", "About"]) {
      await expect(nav.getByRole("link", { name, exact: true }), `${name} 링크`).toBeVisible();
    }
    await expect(nav.getByRole("button", { name: /Switch to (light|dark) mode/ }), "테마 전환").toBeVisible();
    await expect(nav.getByRole("button", { name: /(Unmute|Mute) sounds/ }), "소리 전환").toBeVisible();
    await expect(nav.getByRole("button", { name: /Switch to (Korea|English)/ }), "언어 전환").toBeVisible();
  });

  test("Posts 에 올리면 하위 메뉴가 열린다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const posts = page.locator("nav").first().getByRole("link", { name: "Posts", exact: true });
    await expect(posts).toBeVisible({ timeout: 30_000 });

    const before = await page.locator('[class*="subMenu" i], [class*="dropdown" i]').count();
    await posts.hover();
    await page.waitForTimeout(700);
    const after = await page.locator('[class*="subMenu" i], [class*="dropdown" i]').count();
    expect(after, "하위 메뉴가 나타나야 한다").toBeGreaterThan(before);
  });

  test("현재 위치 표시가 페이지에 따라 움직인다", async ({ page }) => {
    await page.goto("/works", { waitUntil: "load" });
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1200);

    // 표시는 navIndicator 하나이고, 자리를 style.left 로 옮긴다.
    const indicator = page.locator("nav").first().locator('[class*="navIndicator"]');
    // 높이가 2px 인 얇은 막대라 toBeVisible 로는 잡히지 않는다. 존재와 자리만 본다.
    await expect(indicator, "위치 표시").toHaveCount(1);
    const onWorks = await indicator.evaluate((e) => (e as HTMLElement).style.left);

    await page.goto("/posts", { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const onPosts = await page.locator("nav").first().locator('[class*="navIndicator"]')
      .evaluate((e) => (e as HTMLElement).style.left);

    expect(onPosts, "다른 페이지에서는 다른 자리에 있어야 한다").not.toBe(onWorks);
  });

  test("테마 단추를 누르면 테마가 바뀐다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const btn = page.locator("nav").first().getByRole("button", { name: /Switch to (light|dark) mode/ });
    await expect(btn).toBeVisible({ timeout: 30_000 });

    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await btn.click();
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(after, "테마 값이 달라져야 한다").not.toBe(before);
  });

  test("언어 단추에 마우스를 올리면 바뀔 언어를 미리 보여 준다", async ({ page }) => {
    /* 정해 둔 시간을 기다리지 않고 조건을 기다린다. 미리보기는 150ms 타이머 뒤에 그려지는데, 여러 검사가 함께 홈을
       열면 홈의 메인 스레드가 긴 작업으로 차서 표시가 바뀌기까지 길게는 0.6초 넘게 걸린다. 예전에는 올린 뒤 0.6초·
       뗀 뒤 0.9초만 기다리고 봐서 가끔 실패했다(#901).
       준비는 아래 검사처럼 저장된 언어(en)가 단추에 적용된 것으로 본다. 서버는 ko 로 그리므로, en 이 보이면 화면이
       붙어 처리가 걸린 것이다. */
    await page.addInitScript(() => localStorage.setItem("language", "en"));
    await page.goto("/", { waitUntil: "load" });
    const btn = page.locator("nav").first().getByRole("button", { name: /Switch to (Korea|English)/ });
    await expect(btn, "저장된 언어(en)가 단추에 적용된다").toHaveAttribute("aria-label", /Korean/, { timeout: 30_000 });
    await expect(btn).toHaveText("EN");

    await btn.hover();
    await expect(btn, "올리면 바뀔 값을 미리 보여 준다").toHaveText("KO");
    expect(await page.evaluate(() => document.documentElement.lang),
      "미리보기일 뿐이므로 실제 언어는 그대로다").toBe("en");

    // 확실히 단추 바깥으로 옮긴다. 화면 왼쪽 위는 아직 네비게이션 안이다.
    await page.mouse.move(700, 600);
    await expect(btn, "떼면 원래 값으로 돌아온다").toHaveText("EN");
  });

  test("언어 단추를 누르면 문서 언어가 바뀐다", async ({ page }) => {
    /* 누르기 전에 언어가 자리를 잡을 때까지 기다린다.
       서버는 ko 로 그리고, 화면이 붙은 뒤 저장된 언어(없으면 브라우저 언어)로 바꾼다. 그 사이에
       누르면 사이트가 스스로 바꾼 것과 단추가 바꾼 것이 섞인다.
       저장된 언어를 en 으로 두고 연다. en 상태는 화면이 붙고 저장된 언어를 읽은 뒤에만 나오므로,
       en 이 된 것을 보면 준비가 끝난 것이 확실하다. 서버가 그린 ko 상태로는 알 수 없다. 예전에는
       이것으로 준비를 판단해, 브라우저가 영어일 때 사이트가 en 으로 바꾼 직후의 클릭이 다시 ko 로
       되돌려 "바뀌지 않았다"로 실패했다(#799). */
    await page.addInitScript(() => localStorage.setItem("language", "en"));
    await page.goto("/", { waitUntil: "load" });
    const btn = page.locator("nav").first().getByRole("button", { name: /Switch to (Korea|English)/ });
    await expect(btn).toBeVisible({ timeout: 30_000 });

    await expect(btn, "저장된 언어(en)가 단추에 적용된다").toHaveAttribute("aria-label", /Korean/, { timeout: 20_000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.lang), { message: "저장된 언어(en)가 문서에 적용된다" })
      .toBe("en");

    // 단추 글자가 아니라 문서에 적힌 언어를 본다.
    await btn.click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.lang), { message: "문서 언어" })
      .toBe("ko");
  });

  test("로고에 마우스를 올리면 글리치 연출이 걸린다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const logo = page.locator('[class*="logoNavBar"]').first();
    await expect(logo).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2500);

    const animation = () => page.evaluate(() => {
      const el = document.querySelector('[class*="logoNavBar"] [class*="logo"]');
      return el ? getComputedStyle(el).animationName : "";
    });
    expect(await animation(), "올리기 전에는 연출이 없다").toBe("none");

    await logo.hover();
    await page.waitForTimeout(600);
    expect(await animation(), "올리면 glitch 연출이 걸린다").toContain("glitch");
  });
});

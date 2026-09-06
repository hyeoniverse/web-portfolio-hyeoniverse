import { test, expect, type Page } from "@playwright/test";

/**
 * 디자인 시스템 화면 안전망.
 *
 * 이 화면을 그리는 ComponentsSection.tsx 는 1,623줄이고, 공용 컴포넌트 시연 여덟 범주가
 * 한 컴포넌트 안에 들어 있다. 시연용 상태만 56개다. 이것을 범주별로 나눌 예정이다.
 *
 * 이 주소는 기본 화면 검사(smoke)에서 빠져 있다. 세로 2만 픽셀이 넘고 움직이는 시연이
 * 많아 화면을 찍어 견주는 방식이 안정적이지 않기 때문이다(e2e/routes.ts 에 적혀 있다).
 * 그래서 화면을 찍지 않고, 무엇이 그려졌고 눌렀을 때 무엇이 달라지는지만 본다.
 */

const CATEGORIES = [
  "Layout & Brand",
  "Buttons & Actions",
  "Toggles & Selection",
  "Inputs & Fields",
  "Pickers & Selects",
  "Chips",
  "Overlays & Popovers",
  "Feedback & Display",
];

async function openDesignSystem(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/design-system", { waitUntil: "load" });
  await expect(page.locator("#components"), "컴포넌트 구역").toBeAttached({ timeout: 60_000 });
  return errors;
}

test.describe("디자인 시스템 화면", () => {
  test.setTimeout(180_000);

  test("여덟 범주가 모두 그려진다", async ({ page }) => {
    const errors = await openDesignSystem(page);
    for (const name of CATEGORIES) {
      await expect(page.getByRole("heading", { name, exact: true }), name).toBeAttached();
    }
    expect(errors, "화면을 그리다 난 오류").toEqual([]);
  });

  test("각 범주에 시연할 컴포넌트가 들어 있다", async ({ page }) => {
    await openDesignSystem(page);
    // 범주 제목만 남고 내용이 빠지는 경우를 잡는다. 제목 사이의 요소 수를 센다.
    const counts = await page.evaluate((names: string[]) => {
      const heads = [...document.querySelectorAll("h3")].filter((h) => names.includes(h.textContent?.trim() ?? ""));
      return heads.map((h) => {
        let n = 0;
        for (let el = h.nextElementSibling; el && el.tagName !== "H3"; el = el.nextElementSibling) {
          n += el.querySelectorAll("button, input, [role=button]").length;
        }
        return n;
      });
    }, CATEGORIES);
    expect(counts.length, "범주 수").toBe(CATEGORIES.length);
    counts.forEach((n, i) => expect(n, `${CATEGORIES[i]} 안의 조작 요소`).toBeGreaterThan(0));
  });

  test("시연용 조작이 실제로 반응한다 — 체크상자", async ({ page }) => {
    await openDesignSystem(page);
    const box = page.getByRole("checkbox", { name: "Square" });
    await box.scrollIntoViewIfNeeded();
    const before = await box.isChecked();
    // 진짜 <input> 은 눈에 보이지 않고 그 위에 네모 모양이 덮여 있다. 사람이 하듯 글자를 누른다.
    await page.locator("label", { has: box }).getByText("Square", { exact: true }).click();
    await expect(box, "누른 뒤 상태가 뒤집힌다").toBeChecked({ checked: !before });
  });

  test("시연용 조작이 실제로 반응한다 — 글자 입력", async ({ page }) => {
    await openDesignSystem(page);
    const input = page.getByRole("textbox", { name: "Label" }).first();
    await input.scrollIntoViewIfNeeded();
    await input.fill("안전망");
    await expect(input, "입력한 값이 남는다").toHaveValue("안전망");
  });

  test("색 고르기를 열면 값 입력칸이 나온다", async ({ page }) => {
    await openDesignSystem(page);
    const swatch = page.getByRole("button", { name: "Pick color" });
    await swatch.scrollIntoViewIfNeeded();
    await swatch.click();

    // 처음 열리는 형식은 OKLCH 다. 밝기(L)·채도(C)·색상(H) 세 값을 적는 칸이 나온다.
    for (const name of ["OKLCH L", "OKLCH C", "OKLCH H"]) {
      await expect(page.getByRole("spinbutton", { name }), name).toBeVisible({ timeout: 10_000 });
    }
  });

  test("색상 값을 바꾸면 시연에 보이는 색이 따라 바뀐다", async ({ page }) => {
    await openDesignSystem(page);
    const swatch = page.getByRole("button", { name: "Pick color" });
    await swatch.scrollIntoViewIfNeeded();
    // 시연은 고른 색을 단추 옆에 글자로 보여 준다.
    const shown = page.locator("text=/^#[0-9a-f]{6}$/i").first();
    const before = (await shown.textContent())?.toLowerCase();

    await swatch.click();
    const hue = page.getByRole("spinbutton", { name: "OKLCH H" });
    await expect(hue).toBeVisible({ timeout: 10_000 });
    await hue.fill("200");
    await hue.press("Enter");

    await expect
      .poll(async () => (await shown.textContent())?.toLowerCase(), { message: "시연에 보이는 색" })
      .not.toBe(before);
  });
});

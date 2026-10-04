/**
 * 📸 README "CMS 기능" 절 캡처 — 관리자 화면 · 음성 갤러리 · 번역 · 테마
 *
 * 공개 화면만 찍는 scripts/screenshots.mjs 와 달리 로그인 세션이 필요하고, 화면 안에서
 * 단추를 눌러 상태를 만든 뒤 찍는다. 연속 동작(재생 · 변환 · 번역)은 영상(webm)으로도 남긴다.
 *
 * 준비:
 *   1. .env.local 에 E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (e2e/auth.setup.ts 주석 참고)
 *   2. npm run build && npm run start      (dev 서버는 HMR 오버레이가 찍혀 쓰지 않는다)
 *   3. npx playwright test --project=setup  → e2e/.auth/admin.json 이 생긴다
 *
 * 실행:
 *   npx tsx scripts/screenshots-cms.ts \
 *     --work=<갤러리·대본·음성이 있는 작업물 id> --work-slug=<그 작업물 slug> \
 *     --post=<AI 요약이 있는 글 slug> --post-untranslated=<영어 본문이 없는 글 slug> \
 *     --draft-work=<PPTX 를 떨어뜨려도 되는 초안 작업물 id> --pptx=<발표자 노트가 있는 .pptx 경로>
 *
 * 옵션:
 *   --only=1,3,14          번호로 고른 것만
 *   --theme=light|dark     기본 light
 *   --no-video             영상 생략
 *   --base=http://localhost:3000
 *   --out=public/images/screenshots/cms
 *
 * 결과: public/images/screenshots/cms/NN-이름.png, 영상은 NN-이름.webm (ffmpeg 가 있으면 .gif 도)
 *
 * 저장 단추는 어디서도 누르지 않는다. 다만 6·7(PPTX)은 초안 작업물의 갤러리에 그림을 실제로 올리고,
 * 2·3 은 이미 만들어 둔 음성을 재생만 한다(새로 만들지 않는다). 8 은 번역 API 를 부르지만 저장하지 않는다.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { THEME_PRESETS } from "../src/app/admin/(dashboard)/settings/_data/settingsConstants";
import { applyAccentAll, applyNeutralScale, applyTextAccent, textOnAccent } from "../src/lib/themeColors";

/* ── CLI ── */
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const BASE = args.base || "http://localhost:3000";
const OUT = resolve(args.out || "public/images/screenshots/cms");
const THEME = (args.theme === "dark" ? "dark" : "light") as "light" | "dark";
const VIDEO = args["no-video"] !== "true";
const ONLY = args.only ? new Set(args.only.split(",").map(Number)) : null;
const WORK_ID = args.work;
const WORK_SLUG = args["work-slug"];
const POST_SLUG = args.post;
const POST_UNTRANSLATED = args["post-untranslated"];
const DRAFT_WORK_ID = args["draft-work"];
const PPTX = args.pptx;
const AUTH = resolve("e2e/.auth/admin.json");
const HOME_PRESETS = (args.presets || "Forest,Twilight,Arctic").split(",");

if (!existsSync(AUTH)) {
  console.error("e2e/.auth/admin.json 이 없습니다. 먼저 `npx playwright test --project=setup` 을 실행해 주세요.");
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
const HAS_FFMPEG = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;

/* ── 공통 ── */
const VIEWPORT = { width: 1440, height: 900 };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function newContext(browser: Browser, opts: { video?: string; admin?: boolean } = {}): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    storageState: opts.admin === false ? undefined : AUTH,
    colorScheme: THEME,
    permissions: ["microphone"],
    recordVideo: opts.video ? { dir: join(OUT, ".video"), size: VIEWPORT } : undefined,
  });
  // 관리자 UI 는 저장된 세션 언어가 en 일 수 있다 — 한국어로 고정. 화면 테마도 고정.
  await ctx.addInitScript(
    ([lang, theme]) => {
      localStorage.setItem("language", lang);
      localStorage.setItem("theme", theme);
    },
    ["ko", THEME],
  );
  return ctx;
}

async function open(page: Page, path: string, settleMs = 1500) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 60_000 });
  for (const sel of ['[class*="loadingScreen"]', '[class*="transitionOverlay"]']) {
    await page.locator(sel).waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
  }
  await page.evaluate(() => document.fonts.ready);
  await wait(settleMs);
}

async function shot(page: Page, name: string) {
  const file = join(OUT, `${name}-${THEME}.png`);
  await page.screenshot({ path: file });
  console.log(`  ✓ ${basename(file)}`);
}

/** 영상이 필요한 흐름 — 전용 컨텍스트에서 돌리고 끝나면 파일 이름을 바꾼다 */
async function recorded(browser: Browser, name: string, fn: (page: Page) => Promise<void>) {
  const ctx = await newContext(browser, { video: VIDEO ? name : undefined });
  const page = await ctx.newPage();
  try {
    await fn(page);
  } finally {
    const video = page.video();
    await ctx.close();
    if (video) {
      const src = await video.path();
      const dst = join(OUT, `${name}-${THEME}.webm`);
      renameSync(src, dst);
      console.log(`  ▶ ${basename(dst)}`);
      if (HAS_FFMPEG) {
        const gif = dst.replace(/\.webm$/, ".gif");
        execSync(`ffmpeg -y -loglevel error -i "${dst}" -vf "fps=12,scale=1280:-1:flags=lanczos" "${gif}"`);
        console.log(`  ▶ ${basename(gif)}`);
      }
    }
  }
}

function need(value: string | undefined, flag: string) {
  if (!value) throw new Error(`--${flag} 가 필요합니다`);
  return value;
}

/** 작업물 편집기를 열고 첫 장을 작업대에 올린다 */
async function openWorkEditor(page: Page, id: string) {
  await open(page, `/admin/works/${id}/edit`, 2000);
  await page.locator('[data-gallery-index="0"]').first().click();
  await page.getByPlaceholder("읽을 대본").first().waitFor({ timeout: 15_000 });
  await page.locator('[class*="voiceSelect"]').first().scrollIntoViewIfNeeded();
  await wait(600);
}

/** 사이트가 테마 색을 CSS 변수로 옮기는 규칙(ThemeProvider) 그대로 홈에 입힌다 — 저장 없이 미리 본다 */
function presetVars(name: string, mode: "light" | "dark"): Record<string, string> {
  const preset = THEME_PRESETS.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!preset) throw new Error(`프리셋 ${name} 이 없습니다. 있는 것: ${THEME_PRESETS.map((p) => p.name).join(", ")}`);
  const vars: Record<string, string> = {};
  const root = { style: { setProperty: (k: string, v: string) => void (vars[k] = v), removeProperty: () => {} } } as unknown as HTMLElement;
  const t = preset.theme;
  applyAccentAll(root, t.accentColor);
  applyTextAccent(root, t.accentColor, mode === "dark" ? t.darkBg : t.lightBg);
  vars["--bg-primary"] = mode === "dark" ? t.darkBg : t.lightBg;
  vars["--text-primary"] = mode === "dark" ? t.darkText : t.lightText;
  applyNeutralScale(root, vars["--bg-primary"], vars["--text-primary"], mode);
  vars["--text-on-accent"] = textOnAccent(t, mode, t.accentColor);
  return vars;
}

/* ── 장면 ── */
type Scene = { n: number; name: string; run: (browser: Browser) => Promise<void> };

const SCENES: Scene[] = [
  {
    n: 1,
    name: "gallery-captions",
    // 1. 작업물 상세 — 슬라이드 갤러리가 음성과 함께 재생되고 자막이 켜진 화면
    run: (browser) =>
      recorded(browser, "01-gallery-playing", async (page) => {
        await open(page, `/works/${need(WORK_SLUG, "work-slug")}`, 2000);
        const stage = page.locator('[aria-roledescription="carousel"]').first();
        await stage.scrollIntoViewIfNeeded();
        await wait(800);
        const withVoice = page.getByRole("button", { name: "음성과 함께 보기" });
        if (await withVoice.isVisible().catch(() => false)) await withVoice.click();
        const captions = page.getByRole("button", { name: "자막 켜기" });
        if (await captions.isVisible().catch(() => false)) await captions.click();
        await page.locator('p[class*="caption"]').first().waitFor({ timeout: 15_000 }).catch(() => {});
        await wait(2500);
        await shot(page, "01-gallery-captions");
        await wait(9000); // 영상: 한두 장 넘어가는 동안
      }),
  },
  {
    n: 2,
    name: "narration-editor",
    // 2. 관리자 작업물 편집 › 갤러리 음성 편집기 — 대본 칸 · 목소리 · 음성 만들기
    run: async (browser) => {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await openWorkEditor(page, need(WORK_ID, "work"));
      await shot(page, "02-narration-editor");
      await ctx.close();
    },
  },
  {
    n: 3,
    name: "narration-preview",
    // 3. 같은 편집기에서 미리 듣기 — 대본이 가사처럼 강조된다 (이미 만든 음성이 있는 장이어야 한다)
    run: (browser) =>
      recorded(browser, "03-narration-preview", async (page) => {
        await openWorkEditor(page, need(WORK_ID, "work"));
        await page.getByRole("button", { name: "미리 듣기" }).first().click();
        await page.locator('[aria-label="재생 중인 대본"]').waitFor({ timeout: 15_000 });
        await wait(2000);
        await shot(page, "03-narration-preview");
        await wait(6000);
      }),
  },
  {
    n: 4,
    name: "lexicon",
    // 4. 읽기 사전 — 대본 표기 → 읽을 말
    run: async (browser) => {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await openWorkEditor(page, need(WORK_ID, "work"));
      await page.getByRole("button", { name: "읽기 사전" }).first().click();
      await page.getByLabel("대본 표기").waitFor({ timeout: 10_000 });
      await wait(500);
      await shot(page, "04-lexicon");
      await ctx.close();
    },
  },
  {
    n: 5,
    name: "recording-editor",
    // 5. 녹음 파형 편집기 — 구간을 고르고 나눠 클립 2~3개. 가짜 마이크로 녹음한다. 끝에 취소해 올리지 않는다.
    run: (browser) =>
      recorded(browser, "05-recording-split", async (page) => {
        await openWorkEditor(page, need(WORK_ID, "work"));
        await page.getByRole("button", { name: "녹음하기" }).first().click();
        await wait(3500);
        await page.getByRole("button", { name: "중지" }).first().click();
        const toolbar = page.getByRole("toolbar", { name: "녹음 편집" });
        await toolbar.waitFor({ timeout: 15_000 });
        const wave = page.locator('[class*="wave"] canvas').first();
        await wave.scrollIntoViewIfNeeded();
        const box = (await wave.boundingBox())!;
        const drag = async (from: number, to: number) => {
          await page.mouse.move(box.x + box.width * from, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * to, box.y + box.height / 2, { steps: 12 });
          await page.mouse.up();
          await wait(300);
        };
        await drag(0.3, 0.55);
        await page.getByRole("button", { name: "나누기" }).click();
        await wait(600);
        await drag(0.7, 0.85);
        await wait(800);
        await shot(page, "05-recording-editor");
        await wait(1500);
        await page.getByRole("button", { name: "취소" }).click();
      }),
  },
  {
    n: 6,
    name: "pptx-import",
    // 6·7. PPTX 를 갤러리에 떨어뜨리기 — "n/N쪽 그리는 중" 진행과, 끝난 뒤 썸네일(발표자 노트가 대본으로 들어간 장)
    run: (browser) =>
      recorded(browser, "06-pptx-import", async (page) => {
        const file = need(PPTX, "pptx");
        await open(page, `/admin/works/${need(DRAFT_WORK_ID, "draft-work")}/edit`, 2000);
        const area = page.locator('[class*="gallerySelectArea"], [class*="galleryEmpty"], text=갤러리 이미지 추가').first();
        await area.scrollIntoViewIfNeeded();
        const data = readFileSync(file).toString("base64");
        await area.evaluate(
          (el, [b64, name]) => {
            const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const f = new File([bytes], name, { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
            const dt = new DataTransfer();
            dt.items.add(f);
            for (const type of ["dragenter", "dragover", "drop"]) {
              el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
            }
          },
          [data, basename(file)],
        );
        const progress = page.locator('[class*="galleryPdfProgress"]');
        await progress.waitFor({ timeout: 30_000 });
        await page.getByText(/쪽 그리는 중/).waitFor({ timeout: 60_000 }).catch(() => {});
        await wait(400);
        await shot(page, "06-pptx-progress");
        await progress.waitFor({ state: "detached", timeout: 300_000 });
        await wait(1500);
        // 발표자 노트가 대본으로 들어간 장 — 대본 표시가 붙은 썸네일을 작업대에 올린다
        const noted = page.locator('[data-gallery-index]:has([data-kind="script"])').first();
        if (await noted.isVisible().catch(() => false)) await noted.click();
        await page.locator('[class*="galleryCarousel"]').first().scrollIntoViewIfNeeded();
        await wait(800);
        await shot(page, "07-pptx-thumbnails");
      }),
  },
  {
    n: 8,
    name: "translate-editor",
    // 8. 편집기에서 EN 으로 바꿔 자동 번역이 채워진 화면 (대상 언어 칸이 비어 있어야 번역이 돈다)
    run: (browser) =>
      recorded(browser, "08-translate-editor", async (page) => {
        await open(page, `/admin/works/${need(DRAFT_WORK_ID, "draft-work")}/edit`, 2000);
        await page.locator('[class*="navGroup"] [role="switch"]').first().click();
        await page.locator('[class*="statusBanner"], [class*="successBanner"], [class*="errorBanner"]').first().waitFor({ timeout: 20_000 });
        await page.locator('[class*="successBanner"], [class*="errorBanner"]').first().waitFor({ timeout: 120_000 });
        await wait(1000);
        await shot(page, "08-translate-editor");
      }),
  },
  {
    n: 9,
    name: "settings-services",
    // 9. 설정 › 서비스 — 번역 · 요약 · TTS 공급자와 대체 순서
    run: async (browser) => {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await open(page, "/admin/settings?tab=services", 2000);
      await page.getByText("AI 자동 번역", { exact: true }).first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -120));
      await wait(600);
      await shot(page, "09-settings-services");
      await page.screenshot({ path: join(OUT, `09-settings-services-full-${THEME}.png`), fullPage: true });
      await ctx.close();
    },
  },
  {
    n: 10,
    name: "translate-banner",
    // 10. 공개 상세 — 영어 본문이 없는 글을 EN 으로 보면 뜨는 번역 배너
    run: async (browser) => {
      const ctx = await newContext(browser, { admin: false });
      const page = await ctx.newPage();
      await open(page, `/posts/${need(POST_UNTRANSLATED, "post-untranslated")}`, 2000);
      await page.locator('header [role="switch"], nav [role="switch"]').first().click();
      await page.locator('[class*="translateBanner"]').waitFor({ timeout: 15_000 });
      await wait(800);
      await shot(page, "10-translate-banner");
      await ctx.close();
    },
  },
  {
    n: 11,
    name: "ai-summary",
    // 11. 글 상세 위쪽 AI 요약 상자 (펼친 상태)
    run: async (browser) => {
      const ctx = await newContext(browser, { admin: false });
      const page = await ctx.newPage();
      await open(page, `/posts/${need(POST_SLUG, "post")}`, 2000);
      const head = page.locator('[aria-expanded]').filter({ hasText: "AI 요약" }).first();
      await head.scrollIntoViewIfNeeded();
      if ((await head.getAttribute("aria-expanded")) === "false") await head.click();
      await page.evaluate(() => window.scrollBy(0, -160));
      await wait(800);
      await shot(page, "11-ai-summary");
      await ctx.close();
    },
  },
  {
    n: 12,
    name: "theme-presets",
    // 12·13. 설정 › 외관 — 프리셋 목록과 대비 점검, 색상환 추천, 이미지에서 색 뽑기
    run: async (browser) => {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await open(page, "/admin/settings?tab=appearance", 2000);
      await page.getByText("테마 색상", { exact: true }).first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -100));
      await wait(600);
      await shot(page, "12-theme-presets");
      await page.getByText("대비 점검 (WCAG)").first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -200));
      await wait(600);
      await shot(page, "12-theme-contrast");
      await page.getByText("색 조합 추천").first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "색상환" }).first().click().catch(() => {});
      await page.getByRole("slider", { name: "기준 색상 고르기" }).waitFor({ timeout: 10_000 }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, -120));
      await wait(600);
      await shot(page, "13-theme-wheel");
      await page.getByRole("button", { name: "이미지에서" }).first().click();
      const sample = resolve("public/images/screenshots/pc/home-dark.png");
      await page.locator('input[type="file"][accept="image/*"]').last().setInputFiles(sample);
      await page.getByText(/후보 1/).waitFor({ timeout: 20_000 });
      await wait(800);
      await shot(page, "13-theme-from-image");
      await ctx.close();
    },
  },
  {
    n: 14,
    name: "home-presets",
    // 14. 같은 홈을 다른 프리셋으로 — 저장 없이 ThemeProvider 규칙으로 변수만 입힌다
    run: async (browser) => {
      const ctx = await newContext(browser, { admin: false });
      for (const preset of HOME_PRESETS) {
        const vars = presetVars(preset, THEME);
        const page = await ctx.newPage();
        await page.addInitScript((v) => {
          const apply = () => Object.entries(v).forEach(([k, val]) => document.documentElement.style.setProperty(k, val));
          apply();
          new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });
        }, vars);
        await open(page, "/", 3500);
        await shot(page, `14-home-${preset.toLowerCase()}`);
        await page.close();
      }
      await ctx.close();
    },
  },
  {
    n: 15,
    name: "relation-picker",
    // 15. 글과 작업물을 잇는 화면 — 작업물 편집기의 관련 글 고르기
    run: async (browser) => {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await open(page, `/admin/works/${need(WORK_ID, "work")}/edit`, 2000);
      const extra = page.locator('[class*="extraHead"][aria-expanded]').first();
      await extra.scrollIntoViewIfNeeded();
      if ((await extra.getAttribute("aria-expanded")) === "false") await extra.click();
      const input = page.getByPlaceholder(/관련글 연결|관련글 검색/).first();
      await input.scrollIntoViewIfNeeded();
      await input.click();
      await page.getByRole("listbox").waitFor({ timeout: 10_000 });
      await page.evaluate(() => window.scrollBy(0, -200));
      await wait(600);
      await shot(page, "15-relation-picker");
      await ctx.close();
    },
  },
  {
    n: 16,
    name: "seo-checklist",
    // 16. SEO 점검 패널
    run: async (browser) => {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await open(page, `/admin/works/${need(WORK_ID, "work")}/edit`, 2000);
      await page.locator('[aria-label="SEO checklist"] button[aria-haspopup="dialog"]').click();
      await page.getByRole("heading", { name: "SEO 체크" }).waitFor({ timeout: 10_000 });
      await wait(600);
      await shot(page, "16-seo-checklist");
      await ctx.close();
    },
  },
];

/* ── 실행 ── */
async function main() {
  const browser = await chromium.launch({
    args: [
      "--autoplay-policy=no-user-gesture-required", // 1·3: 소리 자동 재생
      "--use-fake-ui-for-media-stream", // 5: 마이크 권한 대화상자 없이
      "--use-fake-device-for-media-stream", // 5: 가짜 마이크(톤)
    ],
  });
  const scenes = ONLY ? SCENES.filter((s) => ONLY.has(s.n)) : SCENES;
  console.log(`CMS 캡처 ${scenes.length}장면 · ${THEME} · ${BASE} → ${OUT}${HAS_FFMPEG ? "" : " (ffmpeg 없음 — gif 생략)"}`);
  const failures: string[] = [];
  for (const s of scenes) {
    console.log(`\n[${s.n}] ${s.name}`);
    try {
      await s.run(browser);
    } catch (e) {
      const msg = (e as Error).message.split("\n")[0];
      failures.push(`${s.n} ${s.name}: ${msg}`);
      console.error(`  ✗ ${msg}`);
    }
  }
  await browser.close();
  if (failures.length) {
    console.error(`\n❌ ${failures.length} 실패:\n  ${failures.join("\n  ")}\n다시: --only=${failures.map((f) => f.split(" ")[0]).join(",")}`);
    process.exit(1);
  }
  console.log("\n완료");
}

main();

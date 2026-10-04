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
 *     --draft-work=<번역·PPTX 들이기를 해 볼 초안 작업물 id> --pptx=<발표자 노트가 있는 .pptx 경로> \
 *     [--post=<AI 요약이 있는 글 slug>] [--post-untranslated=<영어 본문이 없는 글 slug>] \
 *     [--summary-file=<{ summary_ko, summary_en } JSON — 11 에서 저장된 요약이 없을 때>]
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
 * 서버에는 아무것도 쓰지 않는다 — 저장 단추를 누르지 않고, 편집기 자동저장(POST /api/revisions · sendBeacon)은 막고,
 * 6·7(PPTX)의 업로드는 브라우저 안에서 가로채 data: 주소로 돌려준다(Storage 에 안 올라감). 2·3 은 이미 만든 음성을
 * 재생만 하고, 8 은 번역 API 를 부르되 폼에만 넣는다. 11 은 --post 가 없으면 작업물의 관리자 미리보기를 쓴다.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
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
/** 11 — 작업물에 저장된 요약이 없을 때 미리보기에 넣을 { summary_ko, summary_en } JSON */
const SUMMARY_FILE = args["summary-file"];

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
      /* 그림·영상에서 뺄 것 — 커스텀 커서(마지막 마우스 자리에 남는 분홍 점)와 "BGM을 켤 수 있어요" 말풍선(로드 2초 뒤 5초) */
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = '[class*="CursorTrail-module"][class*="cursor"], [class*="Navigation-module"][class*="soundTip"] { display: none !important; }';
        document.head.appendChild(style);
      });
    },
    ["ko", THEME],
  );
  if (opts.admin !== false) {
    /* 편집기 자동저장(3초 디바운스 POST + 떠날 때 sendBeacon)이 서버 revisions 에 남지 않게 한다 —
       캡처하려고 폼을 건드린 것(번역 · PPTX 들이기)이 다음 편집 때 "복원할까요" 로 튀어나오면 안 된다 */
    await ctx.route("**/api/revisions", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
    await ctx.addInitScript(() => {
      navigator.sendBeacon = () => true;
    });
  }
  return ctx;
}

/**
 * 갤러리 업로드를 브라우저 안에서 가로챈다 — 올린 파일을 그대로 data: 주소로 돌려주어 Storage 에 아무것도 남기지 않는다.
 * 6·7(PPTX) 전용. 변환 · 발표자 노트 → 대본 매핑은 전부 클라이언트 일이라 화면은 실제와 같다.
 */
async function interceptUploads(page: Page) {
  /* 문자열로 — 함수로 넘기면 tsx 가 끼워 넣는 __name 헬퍼가 페이지엔 없어 스크립트가 죽는다(14 와 같은 이유) */
  await page.addInitScript({
    content: `(() => {
      const orig = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const body = init && init.body;
        if (url.includes("/api/upload") && body instanceof FormData) {
          const file = body.get("file");
          if (file instanceof Blob) {
            const dataUrl = await new Promise((r) => {
              const fr = new FileReader();
              fr.onload = () => r(String(fr.result));
              fr.readAsDataURL(file);
            });
            return new Response(JSON.stringify({ url: dataUrl }), { status: 200, headers: { "Content-Type": "application/json" } });
          }
        }
        return orig(input, init);
      };
    })();`,
  });
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

/** webm → gif. 기본 256색 변환은 전체가 노랗게 뜬다 — 영상에서 팔레트를 먼저 뽑아 쓴다 */
function webmToGif(src: string, gif: string) {
  /* 10fps · 1120px · 디더 없음 — 17초짜리가 4MB 안팎. 디더를 켜면 1.3배, 1280px 12fps 면 1.6배 */
  const filter = "fps=10,scale=1120:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=none:diff_mode=rectangle";
  execSync(`ffmpeg -y -loglevel error -i "${src}" -vf "${filter}" "${gif}"`);
}

/** 영상이 필요한 흐름 — 전용 컨텍스트에서 돌리고 끝나면 파일 이름을 바꾼다 */
async function recorded(browser: Browser, name: string, fn: (page: Page) => Promise<void>, opts: { admin?: boolean } = {}) {
  const ctx = await newContext(browser, { video: VIDEO ? name : undefined, admin: opts.admin });
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
        webmToGif(dst, gif);
        console.log(`  ▶ ${basename(gif)}`);
      }
    }
  }
}

function need(value: string | undefined, flag: string) {
  if (!value) throw new Error(`--${flag} 가 필요합니다`);
  return value;
}

/** 요소 위쪽을 고정 네비 아래(offset px)로 보낸다 — scrollIntoViewIfNeeded 는 가운데 정렬이라 긴 카드가 잘린다 */
async function scrollTopTo(target: ReturnType<Page["locator"]>, offset = 130) {
  await target.evaluate((el, off) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off), offset);
  await wait(600);
}

/** 작업대(슬라이드 | 대본 | 조작 막대)와 썸네일 줄이 고정 네비 아래에 다 들어오게 맞춘다 */
async function frameGalleryBench(page: Page) {
  await page.mouse.move(20, 450); // 썸네일 위에 남은 마우스가 호버 오버레이를 띄운다
  await page.evaluate(() => {
    /* 전역 네비 + 편집기 상단 바(두 줄)가 고정이라 그 아래로 */
    const bench = document.querySelector('[class*="galleryBench"]');
    if (bench) window.scrollTo(0, bench.getBoundingClientRect().top + window.scrollY - 200);
  });
  await wait(600);
}

/** 작업물 편집기를 열고 첫 장을 작업대에 올린다 */
async function openWorkEditor(page: Page, id: string) {
  await open(page, `/admin/works/${id}/edit`, 2000);
  await page.locator('[data-gallery-index="0"]').first().click();
  await page.getByPlaceholder("읽을 대본").first().waitFor({ timeout: 15_000 });
  await frameGalleryBench(page);
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
      }, { admin: false }),
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
        await wait(5500); // 몇 어절은 채워진 뒤에
        await shot(page, "03-narration-preview");
        await wait(5000);
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
        /* 올리지 않고 닫는다 — "취소" 는 다른 데도 있어 녹음 편집기 안의 것만 */
        await page.locator('[class*="RecordingEditor-module"]').getByRole("button", { name: "취소" }).first().click();
      }),
  },
  {
    n: 6,
    name: "pptx-import",
    // 6·7. PPTX 를 갤러리에 떨어뜨리기 — "n/N쪽 그리는 중" 진행과, 끝난 뒤 썸네일(발표자 노트가 대본으로 들어간 장)
    run: (browser) =>
      recorded(browser, "06-pptx-import", async (page) => {
        const file = need(PPTX, "pptx");
        await interceptUploads(page);
        await open(page, `/admin/works/${need(DRAFT_WORK_ID, "draft-work")}/edit`, 2000);
        /* 갤러리가 비어 있으면 "+ 갤러리 추가" 타일이, 있으면 작업대가 떨어뜨리는 자리다 */
        const area = page.locator('[class*="galleryAddTile"], [class*="gallerySelectArea"]').first();
        await scrollTopTo(area, 320);
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
        await page.getByPlaceholder("읽을 대본").first().waitFor({ timeout: 15_000 }).catch(() => {});
        await frameGalleryBench(page);
        await shot(page, "07-pptx-thumbnails");
      }),
  },
  {
    n: 8,
    name: "translate-editor",
    // 8. 편집기에서 EN 으로 바꾼 뒤 자동 번역이 채워진 화면.
    //    KO/EN 전환만으로 번역이 돌려면 영어 칸이 모두 비어 있어야 하는데(제목 · 부제목 · 설명 · 역할 · 본문) 입력칸이 없는
    //    role_en 이 차 있는 글이 많다 — 그래서 같은 코드(translateFields)를 부르는 "재번역 › 전체" 로 돈다. 결과 화면은 같다.
    run: (browser) =>
      recorded(browser, "08-translate-editor", async (page) => {
        await open(page, `/admin/works/${need(DRAFT_WORK_ID, "draft-work")}/edit`, 2000);
        await scrollTopTo(page.getByRole("heading", { name: "기본 정보" }).first(), 230);
        const translated = page.waitForResponse((r) => r.url().includes("/api/admin/translate"), { timeout: 180_000 });
        await page.locator('[class*="navGroup"] [role="switch"]').first().click();
        await wait(1500);
        /* 전환만으로 번역이 돌지 않았으면(영어 칸이 하나라도 차 있음) 재번역 › 전체 */
        if (!(await page.locator('[class*="statusBanner"]').first().isVisible().catch(() => false))) {
          await page.getByRole("button", { name: "재번역" }).first().click();
          await page.getByText("전체", { exact: true }).first().click();
        }
        await translated;
        await wait(2500); // 번역이 칸에 들어가는 동안
        /* 영어로 채워진 설명 · 본문이 보이게. 상단 바(KO/EN)는 내려가면 숨고 올라오면 다시 나온다 — 끝에 조금 올린다 */
        await scrollTopTo(page.locator("label", { hasText: /^설명$/ }).first(), 300);
        await page.mouse.wheel(0, -60);
        await wait(900);
        await shot(page, "08-translate-editor");
        await wait(1500);
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
      /* 절 제목은 숨은 점프 내비에도 같은 글자가 있다 — heading 으로 집는다 */
      await page.getByRole("heading", { name: "AI 자동 번역" }).first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -30));
      await wait(600);
      await shot(page, "09-settings-services");
      await ctx.close();
    },
  },
  {
    n: 10,
    name: "translate-banner",
    // 10. 공개 상세 — 영어 본문이 없는 글(또는 작업물)을 EN 으로 보면 뜨는 번역 배너.
    //     --post-untranslated 가 있으면 그 글, 없으면 --work-slug 작업물(배너는 둘 다 같은 TranslateBanner).
    run: async (browser) => {
      const ctx = await newContext(browser, { admin: false });
      const page = await ctx.newPage();
      const path = POST_UNTRANSLATED ? `/posts/${POST_UNTRANSLATED}` : `/works/${need(WORK_SLUG, "work-slug")}`;
      await open(page, path, 2000);
      /* 상세 머리의 KO/EN 스위치(LanguageToggle) */
      const toggle = page.locator('[role="switch"][aria-checked]').first();
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      const banner = page.locator('[class*="translateBanner"]').first();
      await banner.waitFor({ timeout: 15_000 });
      await banner.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -200));
      await wait(1000);
      await shot(page, "10-translate-banner");
      await ctx.close();
    },
  },
  {
    n: 11,
    name: "ai-summary",
    // 11. 상세 위쪽 AI 요약 상자 (펼친 상태).
    //     --post 가 있으면 그 글의 공개 상세. 없으면 --work 작업물의 관리자 미리보기 — 저장된 요약이 없을 때는
    //     --summary-file 의 { summary_ko, summary_en } 을 미리보기 폼(sessionStorage)에만 넣는다. DB 에는 쓰지 않는다.
    run: async (browser) => {
      if (POST_SLUG) {
        const ctx = await newContext(browser, { admin: false });
        const page = await ctx.newPage();
        await open(page, `/posts/${POST_SLUG}`, 2000);
        const head = page.locator('[aria-expanded]').filter({ hasText: "AI 요약" }).first();
        await head.scrollIntoViewIfNeeded();
        if ((await head.getAttribute("aria-expanded")) === "false") await head.click();
        await page.evaluate(() => window.scrollBy(0, -160));
        await wait(800);
        await shot(page, "11-ai-summary");
        await ctx.close();
        return;
      }
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await open(page, `/admin/works/${need(WORK_ID, "work")}/edit`, 2000);
      const [preview] = await Promise.all([
        ctx.waitForEvent("page"),
        page.getByRole("button", { name: "미리보기" }).first().click(),
      ]);
      await preview.waitForLoadState("load");
      if (SUMMARY_FILE) {
        const summary = JSON.parse(readFileSync(SUMMARY_FILE, "utf8")) as { summary_ko: string; summary_en: string };
        await preview.evaluate((s) => {
          const raw = sessionStorage.getItem("work-preview");
          if (!raw) throw new Error("미리보기 폼이 없습니다");
          sessionStorage.setItem("work-preview", JSON.stringify({ ...JSON.parse(raw), ...s }));
        }, summary);
        await preview.reload({ waitUntil: "load" });
      }
      await preview.setViewportSize(VIEWPORT);
      for (const sel of ['[class*="loadingScreen"]', '[class*="transitionOverlay"]']) {
        await preview.locator(sel).waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
      }
      await wait(1500);
      const head = preview.locator('[aria-expanded]').filter({ hasText: "AI 요약" }).first();
      await head.waitFor({ timeout: 15_000 });
      await head.scrollIntoViewIfNeeded();
      if ((await head.getAttribute("aria-expanded")) === "false") await head.click();
      await preview.evaluate(() => window.scrollBy(0, -160));
      await wait(1000);
      await shot(preview, "11-ai-summary");
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
      /* 절 제목은 숨은 점프 내비에도 같은 글자가 있다 — heading 으로 집는다 */
      await scrollTopTo(page.getByRole("heading", { name: "테마 색상" }).first(), 200);
      await shot(page, "12-theme-presets");
      /* 대비 표 카드(ThemeContrastReport .report) · 색 조합 추천 카드(ThemeSuggest .suggest) */
      await scrollTopTo(page.locator('[class*="ThemeTools-module"][class*="report"]').first(), 130);
      await shot(page, "12-theme-contrast");
      /* 색상환 | 이미지에서 — SegmentedControl(role=tab) */
      const suggest = page.locator('[class*="ThemeTools-module"][class*="suggest"]').first();
      await page.getByRole("tab", { name: "색상환" }).first().click().catch(() => {});
      await page.getByRole("slider", { name: "기준 색상 고르기" }).waitFor({ timeout: 10_000 }).catch(() => {});
      await scrollTopTo(suggest, 130);
      await shot(page, "13-theme-wheel");
      await page.getByRole("tab", { name: "이미지에서" }).first().click();
      /* 색이 여럿 있는 그림이어야 후보가 여럿 나온다(홈 다크처럼 흑백이면 회색 후보 하나) */
      const sample = resolve(args["sample-image"] || "public/images/screenshots/pc/editor-color-light.png");
      /* 외관 탭에는 로고 업로드 input 도 있다 — 추천 카드 안의 것만 */
      await suggest.locator('input[type="file"]').first().setInputFiles(sample);
      await page.getByText(/후보 1/).waitFor({ timeout: 20_000 });
      await scrollTopTo(suggest, 130);
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
        /* init 시점엔 documentElement 가 아직 없다 — DOM 이 생긴 뒤 입히고, ThemeProvider 가 기본값이라며
           변수를 지울 때마다(style 속성 변경) 다시 입힌다. 페이지로 들어가는 코드는 문자열로 — tsx(esbuild) 가
           함수 안의 `const f = () => {}` 를 __name() 헬퍼로 감싸는데 직렬화된 쪽엔 그 헬퍼가 없다 */
        await page.addInitScript({
          content: `(() => {
            const v = ${JSON.stringify(vars)};
            function apply() {
              const root = document.documentElement;
              for (const k in v) if (root.style.getPropertyValue(k) !== v[k]) root.style.setProperty(k, v[k]);
            }
            document.addEventListener("DOMContentLoaded", () => {
              apply();
              new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });
            });
          })();`,
        });
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
    // 15. 글과 작업물을 잇는 화면 — 글 편집기(새 글)의 관련 프로젝트 고르기. 작업물 쪽 "관련 글" 과 같은 RelationPicker 인데,
    //     작업물 목록은 발행 여부와 무관하게 늘 채워져 있어 이쪽을 찍는다(글이 하나도 없는 사이트에서도 된다).
    run: async (browser) => {
      const ctx = await newContext(browser);
      const page = await ctx.newPage();
      await open(page, "/admin/posts/new", 2000);
      /* 관련 프로젝트는 접힌 "선택 입력" 구역 안에 있다 — 먼저 펼친다 */
      const optional = page.getByRole("button", { name: "선택 입력" }).first();
      await optional.scrollIntoViewIfNeeded();
      await optional.click();
      await wait(800);
      const input = page.getByPlaceholder("프로젝트 연결").first();
      await input.scrollIntoViewIfNeeded();
      await input.click();
      await page.getByRole("listbox").waitFor({ timeout: 10_000 });
      await wait(800);
      /* 열리면 placeholder 가 "프로젝트 검색..." 으로 바뀐다 — 선택기 틀을 기준으로 */
      await scrollTopTo(page.locator('[class*="RelationPicker-module"][class*="wrap"]').first(), 260);
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
      /* 커버 배너 아래 "기본 정보" 절이 머리에 오게 — 알약은 오른쪽 아래 고정이라 어디서든 보인다 */
      await scrollTopTo(page.getByRole("heading", { name: "기본 정보" }).first(), 220);
      await page.locator('[aria-label="SEO checklist"] button[aria-haspopup="dialog"]').click();
      await page.getByRole("dialog").filter({ hasText: "SEO 체크" }).waitFor({ timeout: 10_000 });
      await wait(800);
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
  rmSync(join(OUT, ".video"), { recursive: true, force: true });
  if (failures.length) {
    console.error(`\n❌ ${failures.length} 실패:\n  ${failures.join("\n  ")}\n다시: --only=${failures.map((f) => f.split(" ")[0]).join(",")}`);
    process.exit(1);
  }
  console.log("\n완료");
}

main();

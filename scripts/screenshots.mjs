/**
 * 📸 README용 스크린샷 자동 캡처
 *
 * 사용법:
 *   1. dev 서버 실행: npm run dev
 *   2. Playwright 설치: npx playwright install chromium
 *   3. 스크립트 실행: node scripts/screenshots.mjs
 *
 * 옵션:
 *   --base=http://localhost:3000   (기본값)
 *   --out=public/images/screenshots  (기본값)
 *   --dark                         (다크 모드만)
 *   --light                        (라이트 모드만)
 *   --device=pc                    (특정 디바이스만: pc,tablet,mobile)
 *   --pages=home,posts             (특정 페이지만)
 *   --full                         (전체 페이지 스크롤 캡처)
 *   --no-detail                    (상세 페이지 제외)
 *
 * 결과: public/images/screenshots/{device}/{page}-{theme}.png
 */

import { chromium } from "playwright";
import { mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";

/* ── CLI args ── */
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const BASE = args.base || "http://localhost:3000";
const OUT_DIR = resolve(args.out || "public/images/screenshots");
const ONLY_DARK = args.dark === "true";
const ONLY_LIGHT = args.light === "true";
const FULL_PAGE = args.full === "true";
const NO_DETAIL = args["no-detail"] === "true";
const FILTER_PAGES = args.pages?.split(",");
const FILTER_DEVICES = args.device?.split(",");

/* ── Devices ── */
const DEVICES = [
  { name: "pc", width: 1440, height: 900, scale: 2 },
  { name: "tablet", width: 768, height: 1024, scale: 2 },
  { name: "mobile", width: 390, height: 844, scale: 3 },
];

/* ── Pages ──
 *  - works 는 default(flow) + ?layout= 쿼리로 5종 추가 (fullscreen / cinematic / grid / split / cylinder)
 *  - 상세 페이지(work-detail / post-detail)는 detail: true 로 표시 → --no-detail 로 일괄 제외 가능
 */
const PAGES = [
  // 메인 페이지들
  { name: "home", path: "/", wait: 3500 },
  { name: "works", path: "/works", wait: 3500 }, // flow (default)
  { name: "works-fullscreen", path: "/works?layout=fullscreen", wait: 3500 },
  { name: "works-cinematic", path: "/works?layout=cinematic", wait: 3500 },
  { name: "works-grid", path: "/works?layout=grid", wait: 3000 },
  { name: "works-split", path: "/works?layout=split", wait: 3000 },
  { name: "works-cylinder", path: "/works?layout=cylinder", wait: 4000 },
  { name: "posts", path: "/posts", wait: 2500 },
  { name: "profile", path: "/profile", wait: 2500 },
  { name: "about", path: "/about", wait: 3000 },
  { name: "design-system", path: "/design-system", wait: 2500 },
  { name: "privacy", path: "/privacy", wait: 1500 },

  // 상세 페이지 (--no-detail 로 일괄 제외)
  { name: "work-detail", path: "/works/1", wait: 2500, detail: true },
  { name: "post-detail", path: "/posts/1", wait: 2500, detail: true },
];

/* ── Themes ── */
const THEMES = [];
if (!ONLY_DARK) THEMES.push("light");
if (!ONLY_LIGHT) THEMES.push("dark");

/* ── Helpers ── */
async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
  }, theme);
  await page.waitForTimeout(600);
}

async function dismissOverlays(page) {
  await page.evaluate(() => {
    // Next.js dev 에러 오버레이 숨기기
    const nextError = document.querySelector("nextjs-portal");
    if (nextError) nextError.remove();

    // 쿠키 배너, 모달 등 닫기
    document
      .querySelectorAll('[aria-label="Close"], [data-dismiss]')
      .forEach((el) => el.click());
  });
  await page.waitForTimeout(200);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/* ── Main ── */
async function run() {
  const devices = FILTER_DEVICES
    ? DEVICES.filter((d) => FILTER_DEVICES.includes(d.name))
    : DEVICES;

  let pages = PAGES;
  if (NO_DETAIL) pages = pages.filter((p) => !p.detail);
  if (FILTER_PAGES) pages = pages.filter((p) => FILTER_PAGES.includes(p.name));

  const total = devices.length * pages.length * THEMES.length;
  console.log(
    `\n📸 Capturing ${pages.length} pages × ${devices.length} devices × ${THEMES.length} themes = ${total} screenshots\n`,
  );

  const browser = await chromium.launch();
  let captured = 0;
  let failed = 0;

  for (const device of devices) {
    const deviceDir = join(OUT_DIR, device.name);
    ensureDir(deviceDir);

    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
    });

    for (const pg of pages) {
      const page = await context.newPage();

      for (const theme of THEMES) {
        const filename = `${pg.name}-${theme}.png`;
        const filepath = join(deviceDir, filename);

        try {
          // 테마 미리 세팅 (페이지 로드 전)
          await page.addInitScript((t) => {
            localStorage.setItem("theme", t);
          }, theme);

          await page.goto(`${BASE}${pg.path}`, {
            waitUntil: "networkidle",
            timeout: 30000,
          });
          await setTheme(page, theme);
          await dismissOverlays(page);
          if (pg.wait) await page.waitForTimeout(pg.wait);

          await page.screenshot({
            path: filepath,
            fullPage: FULL_PAGE,
          });

          captured++;
          const pct = Math.round((captured / total) * 100);
          console.log(
            `  ✓ [${pct}%] ${device.name}/${filename}`,
          );
        } catch (err) {
          failed++;
          console.error(
            `  ✗ ${device.name}/${filename}: ${err.message}`,
          );
        }
      }

      await page.close();
    }

    await context.close();
  }

  await browser.close();

  console.log(
    `\n✅ Done — ${captured} captured, ${failed} failed`,
  );
  console.log(`   Saved to ${OUT_DIR}/\n`);

  // 디렉토리 구조 안내
  console.log("📂 Directory structure:");
  for (const d of devices) {
    console.log(`   ${d.name}/`);
    for (const p of pages) {
      for (const t of THEMES) {
        console.log(`     ${p.name}-${t}.png`);
      }
    }
  }
  console.log();
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

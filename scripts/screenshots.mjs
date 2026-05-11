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
 *   --no-retry                     (실패 시 재시도 프롬프트 생략)
 *
 * 결과: public/images/screenshots/{device}/{page}-{theme}.png
 */

import { chromium } from "playwright";
import { mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import readline from "readline";

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
const NO_RETRY = args["no-retry"] === "true";
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

function ask(question) {
  return new Promise((res) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (a) => {
      rl.close();
      res(a);
    });
  });
}

/* ── Capture ──
 *  jobs: [{ device, page, theme }]
 *  device 별로 context 재사용, 같은 device+page 안에서는 page 객체 재사용.
 *  실패한 job 은 failures 배열로 반환 → 재시도 루프에서 그대로 다시 입력.
 */
async function runJobs(browser, jobs) {
  const failures = [];
  let captured = 0;
  const total = jobs.length;

  // device → page → theme[] 순으로 그룹핑
  const byDevice = new Map();
  for (const j of jobs) {
    if (!byDevice.has(j.device.name)) {
      byDevice.set(j.device.name, { device: j.device, byPage: new Map() });
    }
    const dEntry = byDevice.get(j.device.name);
    if (!dEntry.byPage.has(j.page.name)) {
      dEntry.byPage.set(j.page.name, { page: j.page, themes: [] });
    }
    dEntry.byPage.get(j.page.name).themes.push(j.theme);
  }

  for (const { device, byPage } of byDevice.values()) {
    const deviceDir = join(OUT_DIR, device.name);
    ensureDir(deviceDir);

    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
    });

    for (const { page: pg, themes } of byPage.values()) {
      const page = await context.newPage();

      for (const theme of themes) {
        const filename = `${pg.name}-${theme}.png`;
        const filepath = join(deviceDir, filename);

        try {
          await page.addInitScript((t) => {
            localStorage.setItem("theme", t);
          }, theme);

          // waitUntil: "load" — DOM + 리소스 로드만 기다림.
          //   "networkidle" 은 Lenis RAF / 폰트 fetch / 분석 핑 등 계속 도는 페이지에서 timeout 빈발.
          //   페이지별 pg.wait 가 애니메이션/모션 완료까지 기다려주므로 networkidle 까지 강제할 필요 없음.
          await page.goto(`${BASE}${pg.path}`, {
            waitUntil: "load",
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
          console.log(`  ✓ [${pct}%] ${device.name}/${filename}`);
        } catch (err) {
          const message = (err.message || String(err)).split("\n")[0];
          failures.push({ device, page: pg, theme, error: message });
          console.error(`  ✗ ${device.name}/${filename}: ${message}`);
        }
      }

      await page.close();
    }

    await context.close();
  }

  return { captured, failures };
}

/* ── Main ── */
async function run() {
  const devices = FILTER_DEVICES
    ? DEVICES.filter((d) => FILTER_DEVICES.includes(d.name))
    : DEVICES;

  let pages = PAGES;
  if (NO_DETAIL) pages = pages.filter((p) => !p.detail);
  if (FILTER_PAGES) pages = pages.filter((p) => FILTER_PAGES.includes(p.name));

  // 캡처 단위(job) 평면화
  const initialJobs = [];
  for (const d of devices) {
    for (const p of pages) {
      for (const t of THEMES) {
        initialJobs.push({ device: d, page: p, theme: t });
      }
    }
  }

  console.log(
    `\n📸 Capturing ${pages.length} pages × ${devices.length} devices × ${THEMES.length} themes = ${initialJobs.length} screenshots\n`,
  );

  const browser = await chromium.launch();
  let totalCaptured = 0;
  let currentJobs = initialJobs;
  let attempt = 1;

  try {
    while (currentJobs.length > 0) {
      if (attempt > 1) {
        console.log(`\n🔁 Retry attempt ${attempt} — ${currentJobs.length} jobs\n`);
      }

      const { captured, failures } = await runJobs(browser, currentJobs);
      totalCaptured += captured;

      if (failures.length === 0) {
        console.log(`\n✅ Done — ${totalCaptured} captured`);
        console.log(`   Saved to ${OUT_DIR}/\n`);
        break;
      }

      // 실패 목록 출력
      console.log(`\n❌ ${failures.length} failed${attempt > 1 ? ` (attempt ${attempt})` : ""}:`);
      for (const f of failures) {
        console.log(`  • ${f.device.name}/${f.page.name}-${f.theme}.png`);
        console.log(`    └─ ${f.error}`);
      }

      // 재시도 여부 결정
      const interactive = process.stdin.isTTY && process.stdout.isTTY;
      if (NO_RETRY || !interactive) {
        if (!interactive) {
          console.log(`\n💡 Non-interactive 환경 — 재시도 프롬프트 생략.`);
        }
        console.log(`\n   ${totalCaptured} captured, ${failures.length} failed.`);
        console.log(`   재시도 명령:`);
        for (const f of failures) {
          console.log(
            `     node scripts/screenshots.mjs --device=${f.device.name} --pages=${f.page.name} --${f.theme}`,
          );
        }
        console.log();
        break;
      }

      const answer = (await ask(`\n↻  Retry ${failures.length} failed captures? (Y/n): `))
        .toLowerCase()
        .trim();
      if (answer === "n" || answer === "no") {
        console.log(`\n   ${totalCaptured} captured, ${failures.length} skipped.\n`);
        break;
      }

      currentJobs = failures.map((f) => ({
        device: f.device,
        page: f.page,
        theme: f.theme,
      }));
      attempt++;
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

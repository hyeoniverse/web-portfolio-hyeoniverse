/**
 * content/**\/(이미지·영상) → public/content/**  복사 + 정리
 *
 * 사용법:
 *   npx tsx scripts/sync-content-assets.ts          # 복사 + 사라진 파일 정리
 *   npx tsx scripts/sync-content-assets.ts --dry    # 무엇이 바뀌는지만 출력
 *
 * 왜 복사하나
 *   항목 하나만 쓰는 이미지는 그 항목의 md 옆에 둔다. 항목과 함께 옮겨지고 함께 지워지며,
 *   PR diff 에 본문과 같이 뜨고, 상대 경로라 VS Code 미리보기에서도 보인다.
 *   그런데 Next 는 `public/` 만 정적으로 서빙하므로 그대로 두면 화면에 안 나온다.
 *   그래서 빌드 앞에서 `public/content/` 로 트리를 그대로 옮긴다.
 *
 *   라우트 핸들러로 content/ 를 직접 흘려보내는 방법도 있지만, Vercel 에서 서버 번들에
 *   content/ 를 포함시키는 설정이 따로 필요하고 이미지가 CDN 대신 함수를 거친다. 복사가 단순하다.
 *
 * 정리(prune)가 복사만큼 중요하다. 지운 이미지가 public/ 에 남으면 배포에 계속 실려 가고,
 * md 에서 지웠는데도 URL 로는 열리는 상태가 된다.
 *
 * public/content/ 는 생성물이라 .gitignore 에 있다. 원본은 content/ 하나뿐이다.
 */

import fs from "node:fs";
import path from "node:path";

const DRY_RUN = process.argv.includes("--dry");
const SRC_ROOT = path.resolve(process.cwd(), "content");
const OUT_ROOT = path.resolve(process.cwd(), "public/content");

/* md 는 복사하지 않는다 — 본문은 DB 로 들어가므로 공개 서빙할 이유가 없다. */
const ASSET_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg",
  ".mp4", ".webm", ".mov",
  ".pdf",
]);

/** 루트 기준 상대 경로 목록 (디렉터리 제외). */
function walk(root: string, base = root): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
}

/** 내용이 같으면 건드리지 않는다 — 매 빌드마다 mtime 이 바뀌면 캐시가 헛돈다. */
function isSame(src: string, dest: string): boolean {
  if (!fs.existsSync(dest)) return false;
  const a = fs.statSync(src);
  const b = fs.statSync(dest);
  return a.size === b.size && a.mtimeMs <= b.mtimeMs;
}

function main() {
  const sources = walk(SRC_ROOT).filter((rel) => ASSET_EXT.has(path.extname(rel).toLowerCase()));
  const wanted = new Set(sources);

  let copied = 0;
  for (const rel of sources) {
    const src = path.join(SRC_ROOT, rel);
    const dest = path.join(OUT_ROOT, rel);
    if (isSame(src, dest)) continue;
    copied++;
    if (DRY_RUN) { console.log(`   + ${rel}`); continue; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  /* 원본이 사라진 것은 지운다. 이게 없으면 md 에서 뺀 이미지가 계속 배포된다. */
  let pruned = 0;
  for (const rel of walk(OUT_ROOT)) {
    if (wanted.has(rel)) continue;
    pruned++;
    if (DRY_RUN) { console.log(`   - ${rel}`); continue; }
    fs.rmSync(path.join(OUT_ROOT, rel), { force: true });
  }

  /* 파일이 빠져나가 빈 껍데기만 남은 폴더 정리 — 깊은 곳부터 올라온다. */
  if (!DRY_RUN && fs.existsSync(OUT_ROOT)) {
    const dirs: string[] = [];
    const collect = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) { const full = path.join(dir, entry.name); collect(full); dirs.push(full); }
      }
    };
    collect(OUT_ROOT);
    /* collect 가 자식을 먼저 push 하므로 이미 깊은 것부터다 — 여기서 뒤집으면 부모를
       먼저 보게 되어, 자식이 아직 남아 있는 폴더를 못 지운다. */
    for (const dir of dirs) {
      if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    }
  }

  const prefix = DRY_RUN ? "[dry] " : "";
  if (copied === 0 && pruned === 0) console.log(`${prefix}📦 content 자산 ${sources.length}개 — 변경 없음`);
  else console.log(`${prefix}📦 content 자산 — 복사 ${copied} · 정리 ${pruned} (전체 ${sources.length})`);
}

main();

/**
 * src/app/api · src/app/auth 의 route.ts → src/data/generated/apiMap.ts (빌드 전 생성)
 *
 * 사용법:
 *   npx tsx scripts/gen-api-map.ts
 *   npx tsx scripts/gen-api-map.ts --check   # 파일이 최신인지만 확인 (CI · 테스트 용)
 *
 * 왜 필요한가
 *   About 의 API 패널이 손으로 쓴 data/about/backend.ts 를 읽었다. 라우트가 늘어나는 동안 고치지 않아
 *   161개 · 16묶음에 머물렀고 /api/demo/* · /api/weather 같은 경로가 빠져 있었다.
 *   그래서 숫자 · 묶음 · 접근 등급 · 테이블 · 외부 서비스를 라우트 파일에서 굽는다. 읽는 규칙은 lib/about/apiMap.
 *
 * 런타임에 파일을 읽지 않는 이유
 *   배포된 서버에는 repo 가 없다. 빌드 산출물만 돈다. 그래서 빌드 시점에 넣는다.
 */

import fs from "node:fs";
import path from "node:path";
import { buildApiMap, renderApiMap } from "@/lib/about/apiMap";

const CHECK = process.argv.includes("--check");
const ROOT = process.cwd();
const OUT = path.resolve(ROOT, "src/data/generated/apiMap.ts");

function routeFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return routeFiles(p);
    return /^route\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const files = ["src/app/api", "src/app/auth"].flatMap((d) => routeFiles(path.resolve(ROOT, d)));
const read = (p: string) => {
  try {
    return fs.statSync(p).isFile() ? fs.readFileSync(p, "utf8") : null;
  } catch {
    return null;
  }
};
const map = buildApiMap(ROOT, files, read);
if (map.routeFiles !== files.length) console.warn(`[gen-api-map] route.ts ${files.length}개 중 ${files.length - map.routeFiles}개에서 메서드를 못 찾았습니다`);
const next = renderApiMap(map);
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (CHECK) {
  if (prev !== next) {
    console.error("[gen-api-map] src/data/generated/apiMap.ts 가 라우트와 다릅니다 — npm run gen-api-map");
    process.exit(1);
  }
} else if (prev !== next) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, next);
  console.log("[gen-api-map] src/data/generated/apiMap.ts 갱신");
}

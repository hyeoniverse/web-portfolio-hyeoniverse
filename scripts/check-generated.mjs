// src/data/generated/ 의 생성물이 원본과 같은지 확인한다 — 생성 스크립트를 다시 돌려 git 의 커밋본과 비교한다.
// About 문구 · content/ 의 md · API 라우트 · DB 마이그레이션 · 토큰을 고치고 생성을 빼먹으면, 그 뒤로 누가 dev · build 를
// 돌리든 생성물이 바뀐 채로 남아 상관없는 브랜치마다 diff 가 따라다녔다. CI 에서 여기서 걸러 커밋 단계에서 맞추게 한다.
// skyCatalog.ts 는 외부 데이터(d3-celestial)로 손으로 한 번 만드는 파일이라 넣지 않는다.
// 사용: `npm run gen:check` (CI) · 맞추려면 `npm run gen` 후 커밋
import { spawnSync } from "node:child_process";

const GENERATORS = [
  ["scripts/gen-about-fallback.ts", "src/data/generated/aboutContent.ts"],
  ["scripts/gen-erd.ts", "src/data/generated/erdSchema.ts"],
  ["scripts/gen-api-map.ts", "src/data/generated/apiMap.ts"],
  ["scripts/gen-token-sky.ts", "src/data/generated/tokenSky.ts"],
  ["scripts/gen-about-dict.ts", "src/data/generated/aboutDict.ts"],
];

for (const [script] of GENERATORS) {
  const r = spawnSync("npx", ["tsx", script], { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) {
    console.error(`[gen:check] ${script} 가 실패했습니다.`);
    process.exit(1);
  }
}

const files = GENERATORS.map(([, out]) => out);
const diff = spawnSync("git", ["diff", "--name-only", "--", ...files], { encoding: "utf8" });
const stale = diff.stdout.split("\n").filter(Boolean);

if (stale.length > 0) {
  console.error("[gen:check] 생성물이 원본과 다릅니다 — `npm run gen` 을 돌려 아래 파일을 함께 커밋하세요.");
  for (const f of stale) console.error(`  - ${f}`);
  spawnSync("git", ["--no-pager", "diff", "--stat", "--", ...stale], { stdio: "inherit" });
  process.exit(1);
}
console.log(`[gen:check] 생성물 ${files.length}개가 원본과 같습니다.`);

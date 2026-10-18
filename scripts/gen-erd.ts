/**
 * supabase/setup.sql → src/data/generated/erdSchema.ts (빌드 전 생성)
 *
 * 사용법:
 *   npx tsx scripts/gen-erd.ts
 *   npx tsx scripts/gen-erd.ts --check   # 파일이 최신인지만 확인 (CI · 테스트 용)
 *
 * 왜 필요한가
 *   About 의 ERD 기본값(관리자에서 SQL 을 따로 붙여 넣지 않았을 때 보이는 그림)이 손으로 쓴 TS 였다.
 *   마이그레이션이 쌓이는 동안 아무도 고치지 않아, works 칼럼 4개가 빠지고 타입 · 관계가 어긋난 채 보였다.
 *   그래서 기본값을 사람이 쓰지 않고 스키마에서 굽는다. 테이블 · 칼럼 · FK 의 원본은 setup.sql 하나뿐이다
 *   (마이그레이션은 setup.sql 에 흡수된다). About 은 관리자에서 덮어쓰지 않으므로 이 생성본이 곧 화면의 ERD 다.
 *
 *   FK 가 없는 논리 관계(likes · revisions · 댓글 반응 · 신고)와 설계 메모는 SQL 에 없어서
 *   data/about/erd.ts 에 손으로 둔다.
 *
 * 런타임에 파일을 읽지 않는 이유
 *   배포된 서버에는 repo 가 없다. 빌드 산출물만 돈다. 그래서 빌드 시점에 넣는다.
 */

import fs from "node:fs";
import path from "node:path";
import { renderErdSchema } from "@/lib/about/erdSchema";

const CHECK = process.argv.includes("--check");
const SRC = path.resolve(process.cwd(), "supabase/setup.sql");
const OUT = path.resolve(process.cwd(), "src/data/generated/erdSchema.ts");

const { code: next, skipped } = renderErdSchema(fs.readFileSync(SRC, "utf8"));
if (skipped > 0) console.warn(`[gen-erd] setup.sql 에서 읽지 못한 문장 ${skipped}개 — parseSqlErd 를 확인하세요`);
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (CHECK) {
  if (prev !== next) {
    console.error("[gen-erd] src/data/generated/erdSchema.ts 가 setup.sql 과 다릅니다 — npm run gen-erd");
    process.exit(1);
  }
} else if (prev !== next) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, next);
  console.log("[gen-erd] src/data/generated/erdSchema.ts 갱신");
}

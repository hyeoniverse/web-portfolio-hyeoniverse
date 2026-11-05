/**
 * DB 에 적힌 content/ 저장소 주소 → Vercel 이 내보내는 /content/… 주소 (한 번 돌리는 정리)
 *
 * 사용법:
 *   npx tsx scripts/localize-content-assets.ts          # 바꾼다
 *   npx tsx scripts/localize-content-assets.ts --dry    # 무엇이 바뀌는지만 출력
 *
 * 왜: 예전 sync-works 는 content/ 의 그림 · 영상을 Supabase 저장소(posts/content-assets/)에 올리고 그 주소를 적었다.
 * 본문의 그림 · 영상은 방문자가 저장소에서 바로 받아 가므로 무료 플랜의 Cached Egress(월 5GB)를 넘겨
 * 프로젝트 전체가 멈췄다(2026-11). 같은 파일이 git 의 content/ 에 있고 빌드 때 public/content 로 복사되니
 * 그 주소로 되돌린다. 작업물 본문이 posts '프로젝트' 글로 옮겨 가 주소가 여러 표에 흩어져 있어 표마다 훑는다.
 *
 * - 바꾸는 건 주소뿐이고 updated_at 은 건드리지 않는다(글의 수정일이 바뀌지 않게).
 * - git 에 같은 파일이 없는 주소는 그대로 두고 목록만 출력한다.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { localizeContentAssets } from "./lib/contentAssets";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DRY_RUN = process.argv.includes("--dry");
const TABLES = ["posts", "works", "series"] as const;

async function main() {
  const kept = new Set<string>();
  let changedRows = 0;

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`❌ ${table} 조회 실패: ${error.message}`);
      process.exit(1);
    }
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const { value, replaced, missing } = localizeContentAssets(supabase, row);
      missing.forEach((m) => kept.add(m));
      if (replaced === 0) continue;
      const changed = Object.fromEntries(Object.entries(value).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(row[k])));
      const label = (row.slug ?? row.title ?? row.id) as string;
      console.log(`  ↻ ${table}/${label} — ${replaced}개 (${Object.keys(changed).join(", ")})`);
      if (!DRY_RUN) {
        const { error: updateErr } = await supabase.from(table).update(changed).eq("id", row.id as string);
        if (updateErr) {
          console.error(`    ❌ ${updateErr.message}`);
          continue;
        }
      }
      changedRows++;
    }
  }

  if (kept.size) {
    console.log(`\n⚠ git 에 같은 파일이 없어 저장소 주소로 둔 것 ${kept.size}개:`);
    [...kept].sort().forEach((u) => console.log(`    ${u}`));
  }
  console.log(`\n✅ ${changedRows}개 행을 고쳤습니다${DRY_RUN ? " (dry run — DB 변경 없음)" : ""}`);
}

main().catch((err) => {
  console.error("❌ 실패:", err);
  process.exit(1);
});

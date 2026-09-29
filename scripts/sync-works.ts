/**
 * content/works/*.md → Supabase DB 단방향 동기화
 *
 * 사용법:
 *   npx tsx scripts/sync-works.ts          # 수동 실행
 *   npx tsx scripts/sync-works.ts --dry    # 변경 사항만 미리보기 (DB 쓰기 없음)
 *
 * 실행 전 .env.local에 다음 환경변수 필요:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 동작:
 *   1. content/works/*.md 파일을 스캔
 *   2. frontmatter + 본문 파싱 (parseMdWork 로직)
 *   3. title 기준으로 DB 조회(휴지통 제외)
 *      - 없으면: INSERT (비공개 초안)
 *      - 있으면: 파일 mtime > DB updated_at 일 때만 UPDATE (본문+메타 전부, published·정렬은 유지)
 *   4. DB에 있지만 파일이 없는 작업물은 건드리지 않음
 *   5. 쓰기 전에 본문·커버·갤러리의 로컬 주소(/content/…)를 Supabase 저장소에 올리고 저장소 주소로 바꾼다
 *      (scripts/lib/contentAssets) — dev 에서 동기화해도 배포 환경에서 이미지가 깨지지 않게.
 *      이미 로컬 주소로 들어가 있는 작업물은 본문을 건드리지 않고 주소만 고친다.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { parseMdWork } from "@/utils/mdParser";
import { findContentAssets, uploadContentAssets } from "./lib/contentAssets";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log("⏭  Supabase 환경변수 없음 — 동기화 건너뜀");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DRY_RUN = process.argv.includes("--dry");
const CONTENT_DIR = path.resolve(process.cwd(), "content/works");

/* 파싱은 관리자 "마크다운 가져오기" 와 같은 함수를 쓴다(@/utils/mdParser) — 칸 이름이 표와 어긋나지 않게.
   예전에는 여기 따로 둔 파서가 없는 칼럼(category_ko, role)에 써서 INSERT·UPDATE 가 실패했다. */
type ParsedWork = ReturnType<typeof parseMdWork> & { title: string };

async function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log("📂 content/works/ 디렉토리 없음 — 건너뜀");
    return;
  }

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    console.log("📂 content/works/ 에 .md 파일 없음 — 건너뜀");
    return;
  }

  console.log(
    `\n📄 ${files.length}개 .md 파일 발견${DRY_RUN ? " (dry run)" : ""}\n`,
  );

  const works: (ParsedWork & { filePath: string; mtime: Date })[] = [];
  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMdWork(raw, file) as ParsedWork;
    const stat = fs.statSync(filePath);
    works.push({ ...parsed, filePath, mtime: stat.mtime });
  }

  // title 기준으로 DB 조회. 휴지통(deleted_at)에 있는 같은 제목은 빼고 본다 — 거기에 쓰면 화면에 안 나온다
  const titles = works.map((w) => w.title);
  const { data: existing, error } = await supabase
    .from("works")
    /* 로컬 주소가 남아 있는 작업물을 고치려고 칸 전체를 읽는다 */
    .select("*")
    .in("title", titles)
    .is("deleted_at", null);

  if (error) {
    console.error("❌ DB 조회 실패:", error.message);
    process.exit(1);
  }

  const dbMap = new Map(
    (existing ?? []).map((row) => [row.title, row]),
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const work of works) {
    const dbRow = dbMap.get(work.title);
    const { filePath, mtime, ...parsedData } = work;
    /* 로컬 이미지는 저장소로 — 주소를 바꾼 값으로 쓴다 */
    const assets = await uploadContentAssets(supabase, parsedData, { dry: DRY_RUN });
    const workData = assets.value;
    if (assets.missing.length) console.warn(`    ⚠ 로컬에 없는 파일: ${assets.missing.join(", ")}`);

    if (!dbRow) {
      console.log(`  ✚ INSERT  ${work.title} ← ${path.basename(filePath)}`);
      if (!DRY_RUN) {
        const { error: insertErr } = await supabase
          .from("works")
          .insert(workData);
        if (insertErr) {
          console.error(`    ❌ ${insertErr.message}`);
          continue;
        }
      }
      created++;
    } else {
      const dbUpdated = new Date(dbRow.updated_at);
      if (mtime > dbUpdated) {
        console.log(
          `  ↻ UPDATE  ${work.title} (file: ${mtime.toISOString().slice(0, 19)} > db: ${dbUpdated.toISOString().slice(0, 19)})`,
        );
        if (!DRY_RUN) {
          /* 공개 여부는 관리자 화면 몫이라 건드리지 않는다. 순서(order)는 DB 에 아직 정해지지 않았을 때(0)만
             채운다 — 관리자 화면에서 끌어서 바꾼 순서를 다음 동기화가 되돌리지 않게 */
          const { published: _published, sort_order: fileOrder, ...rest } = workData as typeof workData & { sort_order?: number };
          void _published;
          const base = !dbRow.sort_order && fileOrder != null ? { ...rest, sort_order: fileOrder } : rest;
          /* 트리거가 없어 직접 올린다 — 안 올리면 편집기가 브라우저에 남은 옛 draft 를 더 새것으로 보고 새 본문을 덮는다 */
          const fields = { ...base, updated_at: new Date().toISOString() };
          const { error: updateErr } = await supabase
            .from("works")
            .update(fields)
            .eq("id", dbRow.id);
          if (updateErr) {
            console.error(`    ❌ ${updateErr.message}`);
            continue;
          }
        }
        updated++;
      } else {
        /* 본문은 DB 가 더 새로우니 두되(관리자 화면에서 고친 내용 보호), 순서가 아직 0 이면 순서만 채운다 */
        const fileOrder = (workData as { sort_order?: number }).sort_order;
        if (!dbRow.sort_order && fileOrder != null) {
          console.log(`  ↕ ORDER   ${work.title} → ${fileOrder}`);
          if (!DRY_RUN) {
            const { error: orderErr } = await supabase
              .from("works")
              .update({ sort_order: fileOrder })
              .eq("id", dbRow.id);
            if (orderErr) {
              console.error(`    ❌ ${orderErr.message}`);
              continue;
            }
          }
          updated++;
        } else if (findContentAssets(dbRow).length > 0) {
          /* 본문은 그대로 두고, 예전에 로컬 주소(/content/…)로 들어간 이미지만 저장소 주소로 고친다 */
          const { id, created_at: _c, updated_at: _u, ...row } = dbRow as Record<string, unknown>;
          void _c; void _u;
          const fixed = await uploadContentAssets(supabase, row, { dry: DRY_RUN });
          const changed = Object.fromEntries(Object.entries(fixed.value).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(row[k])));
          console.log(`  ⇪ ASSETS  ${work.title} — 로컬 주소 ${fixed.replaced}개를 저장소로 (${Object.keys(changed).join(", ")})`);
          if (!DRY_RUN && Object.keys(changed).length) {
            const { error: fixErr } = await supabase.from("works").update({ ...changed, updated_at: new Date().toISOString() }).eq("id", id as string);
            if (fixErr) {
              console.error(`    ❌ ${fixErr.message}`);
              continue;
            }
          }
          updated++;
        } else {
          skipped++;
        }
      }
    }
  }

  console.log(
    `\n✅ 완료 — ${created} 생성, ${updated} 수정, ${skipped} 스킵${DRY_RUN ? " (dry run — DB 변경 없음)" : ""}`,
  );
}

main().catch((err) => {
  console.error("❌ 동기화 실패:", err);
  process.exit(1);
});

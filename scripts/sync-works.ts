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
 *   3. title 기준으로 DB 조회
 *      - 없으면: INSERT (비공개 초안)
 *      - 있으면: 파일 mtime > DB updated_at 일 때만 UPDATE (본문+메타만, published 등 유지)
 *   4. DB에 있지만 파일이 없는 작업물은 건드리지 않음
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

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

interface ParsedWork {
  title: string;
  content_ko: string;
  content_type: "markdown";
  published: boolean;
  subtitle_ko?: string;
  category_ko?: string;
  year?: string;
  tech?: string[];
  description_ko?: string;
  role_ko?: string;
  image?: string;
  live_url?: string;
  github_url?: string;
}

function parseMdWork(raw: string, fileName: string): ParsedWork {
  let text = raw;
  const meta: Record<string, string | string[]> = {};
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fmMatch) {
    text = text.slice(fmMatch[0].length);
    for (const line of fmMatch[1].split("\n")) {
      const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
      if (!kv) continue;
      const [, key, val] = kv;
      if (val.startsWith("[") && val.endsWith("]")) {
        meta[key] = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""));
      } else {
        meta[key] = val.trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  const title = (meta.title as string) || fileName.replace(/\.md$/, "");
  const work: ParsedWork = {
    title,
    content_ko: text,
    content_type: "markdown",
    published: false,
  };

  if (meta.subtitle) work.subtitle_ko = meta.subtitle as string;
  if (meta.category) work.category_ko = meta.category as string;
  if (meta.year) work.year = meta.year as string;
  if (meta.tech)
    work.tech = Array.isArray(meta.tech) ? meta.tech : [meta.tech as string];
  if (meta.description) work.description_ko = meta.description as string;
  if (meta.role) work.role_ko = meta.role as string;
  if (meta.image) work.image = meta.image as string;
  if (meta.live_url) work.live_url = meta.live_url as string;
  if (meta.github_url) work.github_url = meta.github_url as string;

  return work;
}

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
    const parsed = parseMdWork(raw, file);
    const stat = fs.statSync(filePath);
    works.push({ ...parsed, filePath, mtime: stat.mtime });
  }

  // title 기준으로 DB 조회 (works는 slug가 없으므로 title로 매칭)
  const titles = works.map((w) => w.title);
  const { data: existing, error } = await supabase
    .from("works")
    .select("title, updated_at")
    .in("title", titles);

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { filePath, mtime, ...workData } = work;

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
          const { error: updateErr } = await supabase
            .from("works")
            .update({
              title: workData.title,
              content_ko: workData.content_ko,
              ...(workData.subtitle_ko && { subtitle_ko: workData.subtitle_ko }),
              ...(workData.category_ko && { category_ko: workData.category_ko }),
              ...(workData.year && { year: workData.year }),
              ...(workData.tech && { tech: workData.tech }),
              ...(workData.description_ko && { description_ko: workData.description_ko }),
              ...(workData.role_ko && { role: workData.role_ko }),
              ...(workData.image && { image: workData.image }),
              ...(workData.live_url && { live_url: workData.live_url }),
              ...(workData.github_url && { github_url: workData.github_url }),
            })
            .eq("title", work.title);
          if (updateErr) {
            console.error(`    ❌ ${updateErr.message}`);
            continue;
          }
        }
        updated++;
      } else {
        skipped++;
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

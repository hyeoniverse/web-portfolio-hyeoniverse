/**
 * content/posts/*.md → Supabase DB 단방향 동기화
 *
 * 사용법:
 *   npx tsx scripts/sync-posts.ts          # 수동 실행
 *   npx tsx scripts/sync-posts.ts --dry    # 변경 사항만 미리보기 (DB 쓰기 없음)
 *
 * 실행 전 .env.local에 다음 환경변수 필요:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 동작:
 *   1. content/posts/*.md 파일을 스캔
 *   2. frontmatter + 본문 파싱 (기존 parseMdPost 로직 재사용)
 *   3. slug 기준으로 DB 조회
 *      - 없으면: INSERT (비공개 초안)
 *      - 있으면: 파일 mtime > DB updated_at 일 때만 UPDATE (본문+메타만, published 등 유지)
 *   4. DB에 있지만 파일이 없는 포스트는 건드리지 않음 (삭제 안 함)
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
const CONTENT_DIR = path.resolve(process.cwd(), "content/posts");

interface ParsedPost {
  title: string;
  slug: string;
  content: string;
  content_type: "markdown";
  category: string;
  tags?: string[];
  excerpt?: string;
  cover_image?: string;
  created_at?: string;
  published: boolean;
}

function parseMdPost(raw: string, fileName: string): ParsedPost {
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
  const slug = ((meta.slug as string) || title)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");

  const post: ParsedPost = {
    title,
    slug,
    content: text,
    content_type: "markdown",
    category: (meta.category as string) || "기타",
    published: false,
  };

  if (meta.tags)
    post.tags = Array.isArray(meta.tags) ? meta.tags : [meta.tags as string];
  if (meta.excerpt) post.excerpt = meta.excerpt as string;
  if (meta.cover_image) post.cover_image = meta.cover_image as string;
  if (meta.date) {
    const d = new Date(meta.date as string);
    if (!isNaN(d.getTime())) post.created_at = d.toISOString();
  }

  return post;
}

async function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log("📂 content/posts/ 디렉토리 없음 — 건너뜀");
    return;
  }

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    console.log("📂 content/posts/ 에 .md 파일 없음 — 건너뜀");
    return;
  }

  console.log(`\n📄 ${files.length}개 .md 파일 발견${DRY_RUN ? " (dry run)" : ""}\n`);

  // 파싱
  const posts: (ParsedPost & { filePath: string; mtime: Date })[] = [];
  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = parseMdPost(raw, file);
    const stat = fs.statSync(filePath);
    posts.push({ ...parsed, filePath, mtime: stat.mtime });
  }

  // DB에서 slug 목록 조회
  const slugs = posts.map((p) => p.slug);
  const { data: existing, error } = await supabase
    .from("posts")
    .select("slug, updated_at, title")
    .in("slug", slugs);

  if (error) {
    console.error("❌ DB 조회 실패:", error.message);
    process.exit(1);
  }

  const dbMap = new Map(
    (existing ?? []).map((row) => [row.slug, row]),
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    const dbRow = dbMap.get(post.slug);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { filePath, mtime, ...postData } = post;

    if (!dbRow) {
      // 새 포스트
      console.log(`  ✚ INSERT  ${post.slug} ← ${path.basename(filePath)}`);
      if (!DRY_RUN) {
        const { error: insertErr } = await supabase
          .from("posts")
          .insert(postData);
        if (insertErr) {
          console.error(`    ❌ ${insertErr.message}`);
          continue;
        }
      }
      created++;
    } else {
      // 기존 포스트 — 파일이 DB보다 새로우면 UPDATE
      const dbUpdated = new Date(dbRow.updated_at);
      if (mtime > dbUpdated) {
        console.log(`  ↻ UPDATE  ${post.slug} (file: ${mtime.toISOString().slice(0, 19)} > db: ${dbUpdated.toISOString().slice(0, 19)})`);
        if (!DRY_RUN) {
          // published, is_pinned 등은 건드리지 않음
          const { error: updateErr } = await supabase
            .from("posts")
            .update({
              title: postData.title,
              content: postData.content,
              category: postData.category,
              ...(postData.tags && { tags: postData.tags }),
              ...(postData.excerpt && { excerpt: postData.excerpt }),
              ...(postData.cover_image && { cover_image: postData.cover_image }),
            })
            .eq("slug", post.slug);
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

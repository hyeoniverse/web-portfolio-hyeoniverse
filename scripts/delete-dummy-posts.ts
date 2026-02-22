/**
 * 더미 포스트 삭제 스크립트
 *
 * 사용법:
 *   npx tsx scripts/delete-dummy-posts.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // "더미 포스트입니다" 가 포함된 포스트 검색
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title")
    .or("content.ilike.%더미 포스트입니다%,content.ilike.%더미 포스트%,title.ilike.%더미%,excerpt.ilike.%더미%");

  if (error) {
    console.error("검색 실패:", error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log("삭제할 더미 포스트가 없습니다.");
    return;
  }

  console.log(`${posts.length}개 더미 포스트 발견:`);
  posts.forEach((p) => console.log(`  - [${p.id.slice(0, 8)}] ${p.title}`));

  const ids = posts.map((p) => p.id);
  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .in("id", ids);

  if (deleteError) {
    console.error("삭제 실패:", deleteError.message);
    process.exit(1);
  }

  console.log(`${posts.length}개 더미 포스트 삭제 완료.`);
}

main();

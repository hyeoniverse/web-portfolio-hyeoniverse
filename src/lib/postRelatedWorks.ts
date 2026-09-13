import { createAdminClient } from "@/lib/supabase/admin";
import type { RelatedWork } from "@/app/posts/[slug]/_components/RelatedWorksCarousel";

/**
 * 글에 이어 둔 관련 작업물(공개된 것만). 글 상세는 서버에서 받아 HTML 에 담고, 공개 API(미리보기)도 같은 값을 준다(#917).
 * 예전에는 상세가 마운트 뒤에 받아, 본문 위 칸에 캐러셀이 늦게 끼어들며 본문을 175px 밀어냈다.
 */
export async function getPostRelatedWorks(postId: string): Promise<RelatedWork[]> {
  const admin = createAdminClient();

  const { data: rels } = await admin
    .from("post_work_relations")
    .select("work_id")
    .eq("post_id", postId);

  const workIds = (rels ?? []).map((r) => r.work_id as string);
  if (workIds.length === 0) return [];

  const { data: works, error } = await admin
    .from("works")
    .select("id, slug, title, title_en, subtitle_ko, subtitle_en, year, image, categories_ko, categories_en, nature_ko, nature_en")
    .in("id", workIds)
    .eq("published", true)
    .is("deleted_at", null);

  // 스키마/쿼리 오류가 조용히 빈 배열로 삼켜지지 않게 로그 (title_en 컬럼 누락 등 스키마 드리프트가 원인이었음)
  if (error) console.error("[related-works] works query failed:", error.message);

  return (works ?? []) as RelatedWork[];
}

import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/types/post";

/* admin 목록이 쓰는 컬럼 — 본문(content/content_en, 글당 수십 KB)만 빼고 나머지는 전부 명시한다.
   route.ts 의 목록 select 와 SSR 초기 조회가 같은 컬럼을 쓰도록 여기 한 곳에서 관리한다. */
export const ADMIN_LIST_COLS =
  "id,title,title_en,slug,content_type,excerpt,excerpt_en,cover_image,cover_position,cover_zoom,icon,tags,tag_notes,category,is_pinned,published,language,view_count,like_count,github_url,deleted_at,purge_after,summary_ko,summary_en,created_at,updated_at,version,post_number,series_id,series_order,scheduled_at,author_ids";

/**
 * admin 글 목록의 첫 페이지를 서버에서 미리 조회한다(SSR 초기 데이터).
 *
 * 기본 뷰(필터 없음·최신순)만 담당한다 — 화면에서 필터·정렬·페이지가 바뀌면 client 가
 * /api/posts 로 다시 불러온다. 그래서 popular/random/검색 분기는 여기서 다루지 않는다.
 *
 * 세션 클라이언트로 조회한다: 무엇이 보이는지는 posts_admin_select 정책이 정한다
 * (owner/admin 은 전부, 저자는 자기 글). /api/posts?all=true 와 같은 규칙이다.
 */
export async function fetchAdminPostsFirstPage(
  limit: number,
): Promise<{ posts: Post[]; totalPages: number }> {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("posts")
    .select(`${ADMIN_LIST_COLS}, series:series_id(title, title_en)`, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(0, limit - 1);

  return {
    /* 목록은 본문(content) 컬럼을 일부러 빼므로 Post 와 완전히 겹치지 않는다 — /api/posts 의 admin
       목록이 client 에서 Post 로 다뤄지는 것과 같은 취급이다. */
    posts: (data ?? []) as unknown as Post[],
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

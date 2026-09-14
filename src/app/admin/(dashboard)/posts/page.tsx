import { getSiteConfig } from "@/lib/getSiteConfig";
import { fetchAdminPostsFirstPage } from "@/lib/api/adminPostList";
import PostsClient from "./PostsClient";

/* 기본 뷰(필터 없음·최신순) 1페이지를 서버에서 미리 조회해 client 에 주입한다 — 행이 셸과 함께
   뜨도록. 인증은 (dashboard)/layout 이 이미 보장한다(user 없으면 redirect). */
export default async function AdminPostsPage() {
  const cfg = await getSiteConfig();
  const perPage = cfg.posts?.adminPerPage ?? 20;
  const { posts, totalPages } = await fetchAdminPostsFirstPage(perPage);

  return (
    <PostsClient
      initialPosts={posts}
      initialTotalPages={totalPages}
      initialPerPage={perPage}
    />
  );
}

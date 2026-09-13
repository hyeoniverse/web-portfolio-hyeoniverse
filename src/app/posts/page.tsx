import type { Metadata } from "next";
import { getInitialPostsData } from "@/lib/posts";
import PostsPageChrome from "./_components/PostsPageChrome";
import PostsClient from "./PostsClient";

export const metadata: Metadata = { title: "Posts" };

export const revalidate = 60;

export default async function PostsPage() {
  const initialData = await getInitialPostsData();
  /* 제목·배너(PostsPageChrome)와 글 목록을 모두 미리 그린다. 목록은 필터 없는 1쪽이고, 주소의 필터·쪽 번호는
     PostsClient 가 마운트 직후 옮겨 다시 받는다(usePostsQuery). 예전에는 PostsClient 가 useSearchParams() 로 주소를 읽어
     Suspense 경계 안이 통째로 브라우저 렌더로 빠졌고, 미리 그린 HTML 에는 빈 자리만 있었다(#925). */
  return (
    <PostsPageChrome pinnedPosts={initialData.pinnedPosts}>
      <PostsClient initialData={initialData} />
    </PostsPageChrome>
  );
}

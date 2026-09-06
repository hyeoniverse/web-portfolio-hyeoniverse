import { Suspense } from "react";
import type { Metadata } from "next";
import { getInitialPostsData } from "@/lib/posts";
import PostsClient from "./PostsClient";

export const metadata: Metadata = { title: "Posts" };

export const revalidate = 60;

export default async function PostsPage() {
  const initialData = await getInitialPostsData();
  /* PostsClient 가 useSearchParams() 를 쓰므로 prerender 시 Suspense 가 필요.
     loading.tsx 를 두면 /posts → /posts/[slug] 네비게이션 시 PostsLoading 이 잠시 노출되는 문제가
     있어 인라인 Suspense 로 처리한다.

     fallback 은 화면 한 개 높이만큼 자리를 잡아 둔다. 예전에는 null 이었는데, 그러면 내용이
     오기 전 한 프레임 동안 본문이 비어서 푸터가 화면 안에 그려졌다가 내용이 오면
     3,000px 아래로 밀려났다. 눈에는 거의 안 보이지만 레이아웃 밀림으로는 0.31 로 잡힌다.
     빈 자리만 잡아 두면 푸터가 처음부터 화면 밖에 있어 밀릴 일이 없다. */
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <PostsClient initialData={initialData} />
    </Suspense>
  );
}

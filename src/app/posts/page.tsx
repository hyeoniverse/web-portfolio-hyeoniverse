import { Suspense } from "react";
import { getInitialPostsData } from "@/lib/posts";
import PostsClient from "./PostsClient";

export const revalidate = 60;

export default async function PostsPage() {
  const initialData = await getInitialPostsData();
  /* PostsClient 가 useSearchParams() 를 쓰므로 prerender 시 Suspense 가 필요.
     loading.tsx 를 두면 /posts → /posts/[slug] 네비게이션 시 PostsLoading 이 잠시 노출되는 문제가
     있어, fallback 을 null 로 둔 인라인 Suspense 로 처리. SSR 은 initialData 가 이미 있어
     실질적인 fallback 노출 시간은 0. */
  return (
    <Suspense fallback={null}>
      <PostsClient initialData={initialData} />
    </Suspense>
  );
}

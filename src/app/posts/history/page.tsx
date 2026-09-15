import type { Metadata } from "next";
import { getInitialPostsData, getPostArchiveMonths } from "@/lib/posts";
import PostsPageChrome from "../_components/PostsPageChrome";
import PostsClient from "../PostsClient";

export const metadata: Metadata = { title: "History" };

export const revalidate = 60;

/* /posts/history — 시간순 아카이브(타임라인). PostsClient 를 history 모드로 렌더:
   timeline 레이아웃 강제 + 필터/배너/시리즈/사이드바 숨김 + 무한스크롤 + 왼쪽 연월 인덱스.
   archiveMonths = 전체 아카이브 유효일(로드 여부 무관) → 왼쪽 인덱스에 모든 월 표시. */
export default async function HistoryPage() {
  const [initialData, archiveMonths] = await Promise.all([
    getInitialPostsData(),
    getPostArchiveMonths(),
  ]);
  return (
    <PostsPageChrome history>
      <PostsClient initialData={initialData} history archiveMonths={archiveMonths} />
    </PostsPageChrome>
  );
}

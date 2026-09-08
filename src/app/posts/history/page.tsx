import { Suspense } from "react";
import type { Metadata } from "next";
import { getInitialPostsData, getPostArchiveMonths } from "@/lib/posts";
import BackLink from "@/components/ui/BackLink";
import PostsPageChrome from "../_components/PostsPageChrome";
import PostsClient from "../PostsClient";
import styles from "../Posts.module.css";

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
  /* fallback 은 화면 한 개 높이만큼 자리를 잡아 둔다. null 이면 내용이 오기 전 한 프레임 동안
     본문이 비어 푸터가 화면 안에 그려졌다가 아래로 밀려난다(레이아웃 밀림). */
  return (
    <>
      <div className={styles.historyBackBar}>
        <BackLink href="/posts" label="글 목록" />
      </div>
      <PostsPageChrome history>
        <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
          <PostsClient initialData={initialData} history archiveMonths={archiveMonths} />
        </Suspense>
      </PostsPageChrome>
    </>
  );
}

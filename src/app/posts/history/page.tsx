import type { Metadata } from "next";
import { getHistoryData } from "@/lib/posts";
import HistoryClient from "./HistoryClient";

export const metadata: Metadata = { title: "History" };

export const revalidate = 60;

/* /posts/history — 모든 발행 글을 시간순으로 훑는 아카이브(몽이 길 · 시간의 강). 본문 없이 제목 · 날짜 · 태그만 받는다 */
export default async function HistoryPage() {
  const { posts, tilTag } = await getHistoryData();
  return <HistoryClient posts={posts} tilTag={tilTag} />;
}

import { getAllTagsData } from "@/lib/posts";
import TagsIndexClient from "./TagsIndexClient";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tags",
  description: "모든 태그 목록",
};

export default async function TagsIndexPage() {
  const data = await getAllTagsData();
  // 검색 캡슐이 URL 을 effect 에서 읽어 정적 렌더에서 빠지지 않으므로 본문을 그대로 미리 그린다(#913)
  return <TagsIndexClient tags={data.tags} />;
}

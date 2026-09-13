import { getTagPageData, getAllTagsData } from "@/lib/posts";
import TagPageClient from "./TagPageClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

/* 미리 그려 캐시한다(#913). 예전에는 generateStaticParams 가 없어 revalidate 가 있어도 요청마다 서버에서 그렸다.
   글·작업물을 저장하면 각 API 가 태그 페이지도 새로 그리게 하고, 시간 기준 갱신은 안전망이다 */
export const revalidate = 60;

export async function generateStaticParams() {
  const { tags } = await getAllTagsData();
  return tags.map(({ tag }) => ({ tag }));
}

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded}`,
    description: `"${decoded}" 태그가 달린 게시물 모음`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const [data, allTagsData] = await Promise.all([
    getTagPageData(decoded),
    getAllTagsData(),
  ]);

  if (data.totalCount === 0) notFound();

  return <TagPageClient tag={decoded} initialData={data} allTags={allTagsData.tags} />;
}

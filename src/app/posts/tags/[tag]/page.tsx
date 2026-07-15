import { Suspense } from "react";
import { getTagPageData, getAllTagsData } from "@/lib/posts";
import TagPageClient from "./TagPageClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 60;

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

  // TagPageClient 가 SearchCapsule(useSearchParams) 를 쓰므로 prerender 시 Suspense 필요
  return (
    <Suspense fallback={null}>
      <TagPageClient tag={decoded} initialData={data} allTags={allTagsData.tags} />
    </Suspense>
  );
}

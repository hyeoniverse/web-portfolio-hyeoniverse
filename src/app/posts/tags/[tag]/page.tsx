import { getTagPageData } from "@/lib/posts";
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
    title: { absolute: `Hyeoniverse | #${decoded}` },
    description: `"${decoded}" 태그가 달린 게시물 모음`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const data = await getTagPageData(decoded);

  if (data.totalCount === 0) notFound();

  return <TagPageClient tag={decoded} initialData={data} />;
}

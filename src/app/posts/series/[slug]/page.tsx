import { getSeriesPageData, getAllSeriesSlugs } from "@/lib/posts";
import SeriesDetailClient from "./SeriesDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

/* 미리 그려 캐시한다 — 시리즈/글 저장 시 재검증, 시간 기준 갱신은 안전망. (태그 상세 #913 과 같은 결) */
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllSeriesSlugs();
  return slugs.map((slug) => ({ slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { series } = await getSeriesPageData(decodeURIComponent(slug));
  if (!series) return { title: "Series" };
  return {
    title: series.title,
    description: series.description || `${series.title} 시리즈`,
  };
}

export default async function SeriesDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await getSeriesPageData(decodeURIComponent(slug));
  if (!data.series) notFound();
  return <SeriesDetailClient data={data} />;
}

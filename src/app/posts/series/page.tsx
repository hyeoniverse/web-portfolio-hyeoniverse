import { getAllSeriesData } from "@/lib/posts";
import SeriesIndexClient from "./SeriesIndexClient";
import type { Metadata } from "next";
import { siteMetaText } from "@/lib/siteMetaText";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

/* 설명은 사이트 기본 언어로(#1406) */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "Series", description: await siteMetaText("pageMeta.seriesIndex"), path: "/posts/series" });
}

export default async function SeriesIndexPage() {
  const data = await getAllSeriesData();
  // 검색 캡슐이 URL 을 effect 에서 읽어 정적 렌더에서 빠지지 않으므로 본문을 그대로 미리 그린다(#913)
  return <SeriesIndexClient series={data.series} />;
}

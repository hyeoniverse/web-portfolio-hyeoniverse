import { getAllSeriesData } from "@/lib/posts";
import SeriesIndexClient from "./SeriesIndexClient";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Series",
  description: "모든 시리즈 목록",
};

export default async function SeriesIndexPage() {
  const data = await getAllSeriesData();
  // 검색 캡슐이 URL 을 effect 에서 읽어 정적 렌더에서 빠지지 않으므로 본문을 그대로 미리 그린다(#913)
  return <SeriesIndexClient series={data.series} />;
}

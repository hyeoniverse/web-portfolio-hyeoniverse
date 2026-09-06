import { Suspense } from "react";
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
  // SeriesIndexClient 가 SearchCapsule(useSearchParams) 를 쓰므로 prerender 시 Suspense 필요
  /* fallback 은 화면 한 개 높이만큼 자리를 잡아 둔다. null 이면 내용이 오기 전 한 프레임 동안
     본문이 비어 푸터가 화면 안에 그려졌다가 아래로 밀려난다(레이아웃 밀림). */
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <SeriesIndexClient series={data.series} />
    </Suspense>
  );
}

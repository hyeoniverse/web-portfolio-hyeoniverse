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
  return (
    <Suspense fallback={null}>
      <SeriesIndexClient series={data.series} />
    </Suspense>
  );
}

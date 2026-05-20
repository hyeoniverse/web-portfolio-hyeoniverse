import { getAllSeriesData } from "@/lib/posts";
import SeriesIndexClient from "./SeriesIndexClient";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Hyeoniverse | Series" },
  description: "모든 시리즈 목록",
};

export default async function SeriesIndexPage() {
  const data = await getAllSeriesData();
  return <SeriesIndexClient series={data.series} />;
}

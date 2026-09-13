import { getAllCategoriesData } from "@/lib/posts";
import CategoriesIndexClient from "./CategoriesIndexClient";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Categories",
  description: "모든 카테고리 목록",
};

export default async function CategoriesIndexPage() {
  const data = await getAllCategoriesData();
  // 검색 캡슐이 URL 을 effect 에서 읽어 정적 렌더에서 빠지지 않으므로 본문을 그대로 미리 그린다(#913)
  return <CategoriesIndexClient categories={data.categories} />;
}

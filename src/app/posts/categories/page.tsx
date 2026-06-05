import { Suspense } from "react";
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
  // CategoriesIndexClient 가 SearchCapsule(useSearchParams) 를 쓰므로 prerender 시 Suspense 필요
  return (
    <Suspense fallback={null}>
      <CategoriesIndexClient categories={data.categories} />
    </Suspense>
  );
}

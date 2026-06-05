import { Suspense } from "react";
import { getAllTagsData } from "@/lib/posts";
import TagsIndexClient from "./TagsIndexClient";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tags",
  description: "모든 태그 목록",
};

export default async function TagsIndexPage() {
  const data = await getAllTagsData();
  // TagsIndexClient 가 SearchCapsule(useSearchParams) 를 쓰므로 prerender 시 Suspense 필요
  return (
    <Suspense fallback={null}>
      <TagsIndexClient tags={data.tags} />
    </Suspense>
  );
}

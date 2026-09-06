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
  /* fallback 은 비워 둔다. 이 화면은 내용이 한 화면보다 짧아서, 자리를 미리 잡아 두면
     오히려 푸터가 아래에서 위로 올라오며 밀린다(재 봤더니 0.002 → 0.070 으로 나빠졌다).
     내용이 한 화면보다 긴 목록 화면(/posts · /posts/series · /posts/history)에서만 자리를 잡는다. */
  return (
    <Suspense fallback={null}>
      <TagsIndexClient tags={data.tags} />
    </Suspense>
  );
}

import { getAllTagsData } from "@/lib/posts";
import TagsIndexClient from "./TagsIndexClient";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "태그 모음",
  description: "모든 태그 목록",
};

export default async function TagsIndexPage() {
  const data = await getAllTagsData();
  return <TagsIndexClient tags={data.tags} />;
}

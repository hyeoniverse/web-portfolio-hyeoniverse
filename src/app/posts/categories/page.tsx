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
  return <CategoriesIndexClient categories={data.categories} />;
}

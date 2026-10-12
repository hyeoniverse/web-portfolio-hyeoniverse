"use client";

import { useCategoryText } from "@/hooks/useCategories";

export default function CategoryLabel({ category }: { category: string }) {
  const categoryText = useCategoryText();
  return <>{categoryText(category)}</>;
}

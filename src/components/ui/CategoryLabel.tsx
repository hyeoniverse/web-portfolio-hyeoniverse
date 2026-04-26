"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { translateCategory, useCategories } from "@/hooks/useCategories";

export default function CategoryLabel({ category }: { category: string }) {
  const { language } = useLanguage();
  const categories = useCategories();
  return <>{translateCategory(category, language, categories)}</>;
}

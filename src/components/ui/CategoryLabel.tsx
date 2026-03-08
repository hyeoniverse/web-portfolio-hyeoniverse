"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { translateCategory } from "@/hooks/useCategories";

export default function CategoryLabel({ category }: { category: string }) {
  const { language } = useLanguage();
  return <>{translateCategory(category, language)}</>;
}

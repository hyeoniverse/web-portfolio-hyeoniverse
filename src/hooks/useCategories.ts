import { useState, useEffect } from "react";
import { siteConfig } from "@/config/site.config";

export interface BilingualCategory {
  ko: string;
  en: string;
}

// 기존 string[] → { ko, en }[] 자동 정규화
function normalize(raw: unknown[]): BilingualCategory[] {
  return raw.map((item) =>
    typeof item === "string" ? { ko: item, en: item } : (item as BilingualCategory),
  );
}

const DEFAULT_CATEGORIES: BilingualCategory[] = normalize(
  siteConfig.posts.categories as unknown as unknown[],
);

export function useCategories(): BilingualCategory[] {
  const [categories, setCategories] = useState<BilingualCategory[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(normalize(data));
        }
      })
      .catch(() => {});
  }, []);

  return categories;
}

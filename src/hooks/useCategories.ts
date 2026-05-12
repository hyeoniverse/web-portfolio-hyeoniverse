import { useState, useEffect } from "react";
import { siteConfig } from "@/config/site.config";
import type { BilingualCategory } from "@/types/common";

export type { BilingualCategory } from "@/types/common";

// 기존 string[] / BilingualCategory[] 모두 받아 정규화 (DB 마이그레이션 호환)
function normalize(raw: readonly (string | BilingualCategory)[]): BilingualCategory[] {
  return raw.map((item) =>
    typeof item === "string" ? { ko: item, en: item } : item,
  );
}

const DEFAULT_CATEGORIES: BilingualCategory[] = normalize(
  siteConfig.posts.categories,
);

/**
 * DB에 저장된 카테고리 값(ko)을 현재 언어에 맞게 변환.
 * 매칭 실패 시 원본 반환.
 */
export function translateCategory(
  value: string,
  lang: "ko" | "en",
  cats: BilingualCategory[] = DEFAULT_CATEGORIES,
): string {
  const found = cats.find((c) => c.ko === value || c.en === value);
  return found ? found[lang] : value;
}

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

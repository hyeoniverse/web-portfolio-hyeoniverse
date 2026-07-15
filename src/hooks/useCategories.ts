import { useState, useEffect } from "react";
import { siteConfig } from "@/config/site.config";
import type { BilingualCategory } from "@/types/common";
import {
  normalizeCategories,
  flattenCategories,
  findCategoryNode,
} from "@/lib/categoryTree";

export type { BilingualCategory } from "@/types/common";

const DEFAULT_CATEGORIES: BilingualCategory[] = normalizeCategories(
  siteConfig.posts.categories,
);

/**
 * DB에 저장된 카테고리 값(ko/en)을 현재 언어에 맞게 변환.
 * 2단계 트리를 flatten 해 대분류/소분류 어느 쪽이든 매칭. 실패 시 원본 반환.
 */
export function translateCategory(
  value: string,
  lang: "ko" | "en",
  cats: BilingualCategory[] = DEFAULT_CATEGORIES,
): string {
  const found = findCategoryNode(cats, value);
  return found ? found[lang] : value;
}

export { flattenCategories };

/** 카테고리 트리 (대분류 children 보유). 렌더 순서 유지. */
export function useCategories(): BilingualCategory[] {
  const [categories, setCategories] = useState<BilingualCategory[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(normalizeCategories(data));
        }
      })
      .catch(() => {});
  }, []);

  return categories;
}

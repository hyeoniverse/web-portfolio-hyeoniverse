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

/* 이 훅은 한 화면에 여러 번 쓰인다 — CategoryLabel 이 글 카드마다 붙어서, 글 목록에서는
   인스턴스가 십수 개가 된다. 각자 fetch 하면 같은 응답을 그 수만큼 받는다(측정: /posts 에서
   8번). 요청 하나를 모듈 수준에서 공유하고, 끝난 결과는 캐시해 이후 인스턴스가 곧바로 쓴다.
   서버에서는 effect 가 돌지 않으므로 모듈 캐시에 요청별 값이 섞일 일이 없다. */
let cached: BilingualCategory[] | null = null;
let inflight: Promise<BilingualCategory[] | null> | null = null;

function loadCategories(): Promise<BilingualCategory[] | null> {
  inflight ??= fetch("/api/categories")
    .then((res) => res.json())
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) return null;
      cached = normalizeCategories(data);
      return cached;
    })
    .catch(() => null);
  return inflight;
}

/** 카테고리 트리 (대분류 children 보유). 렌더 순서 유지. */
export function useCategories(): BilingualCategory[] {
  const [categories, setCategories] = useState<BilingualCategory[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    let alive = true;
    loadCategories().then((next) => {
      if (next && alive) setCategories(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return categories;
}

import type { BilingualCategory } from "@/types/common";

/**
 * 2단계 카테고리 트리 공용 헬퍼 (순수 함수 — 클라이언트/서버 공용, 서버 의존성 없음).
 *
 * 데이터 모델:
 * - 카테고리 목록은 `BilingualCategory[]` 트리 (대분류가 `children` 으로 소분류를 가짐, 최대 1단계).
 * - legacy 는 flat `string[]` / `BilingualCategory[]` (children 없음) — 그대로 흡수된다.
 * - 글(posts.category)에는 항상 leaf 문자열(ko 또는 en)만 저장하고, 부모는 트리에서 도출.
 */

/** string | BilingualCategory | legacy 를 BilingualCategory 로 정규화 (children 재귀 보존) */
function normalizeCategory(item: unknown): BilingualCategory {
  if (typeof item === "string") return { ko: item, en: item };
  const c = (item ?? {}) as BilingualCategory;
  const normalized: BilingualCategory = { ko: c.ko, en: c.en };
  if (c.description !== undefined) normalized.description = c.description;
  if (Array.isArray(c.children) && c.children.length > 0) {
    normalized.children = c.children.map(normalizeCategory);
  }
  return normalized;
}

/** 배열 전체 정규화 */
export function normalizeCategories(raw: readonly unknown[]): BilingualCategory[] {
  return raw.map(normalizeCategory);
}

/** 트리를 대분류+소분류 모두 포함한 flat 리스트로 (렌더 순서 유지) */
export function flattenCategories(cats: readonly BilingualCategory[]): BilingualCategory[] {
  const out: BilingualCategory[] = [];
  for (const c of cats) {
    out.push(c);
    if (c.children?.length) out.push(...flattenCategories(c.children));
  }
  return out;
}

/** ko 또는 en 값으로 트리 어디서든 노드 탐색 (대분류/소분류 무관) */
export function findCategoryNode(
  cats: readonly BilingualCategory[],
  value: string,
): BilingualCategory | null {
  for (const c of cats) {
    if (c.ko === value || c.en === value) return c;
    if (c.children?.length) {
      const found = findCategoryNode(c.children, value);
      if (found) return found;
    }
  }
  return null;
}

/** 주어진 소분류 값의 부모(대분류)를 반환. 최상위이거나 못 찾으면 null */
export function findParentCategory(
  cats: readonly BilingualCategory[],
  value: string,
): BilingualCategory | null {
  for (const c of cats) {
    if (c.children?.some((ch) => ch.ko === value || ch.en === value)) return c;
  }
  return null;
}

/**
 * 필터 값을 매칭 대상 문자열 집합으로 확장.
 * - 대분류 → [대분류 + 모든 소분류]의 ko/en (자식 글 전부 포함)
 * - 소분류/leaf → [해당 값]
 * posts.category 는 ko 를 저장하지만 en 저장분도 매칭되도록 ko·en 둘 다 포함.
 */
export function expandCategoryValues(
  cats: readonly BilingualCategory[],
  value: string,
): string[] {
  const node = findCategoryNode(cats, value);
  if (!node) return [value];
  const nodes = [node, ...(node.children ? flattenCategories(node.children) : [])];
  const values = new Set<string>();
  for (const n of nodes) {
    if (n.ko) values.add(n.ko);
    if (n.en) values.add(n.en);
  }
  return [...values];
}

export interface CategoryOption {
  value: string;
  label: string;
  group?: string;
}

/**
 * 픽커(Select)용 옵션 목록 — 소분류는 부모(대분류) 그룹 헤더 아래로 묶고,
 * 자식 없는 최상위 카테고리는 ungrouped. value 는 항상 leaf 의 ko(= posts.category 저장값).
 * 글은 leaf 에만 배정 — 대분류(그룹)는 컨테이너라 선택지로 내지 않는다.
 */
export function toCategoryOptions(
  cats: readonly BilingualCategory[],
  lang: "ko" | "en",
): CategoryOption[] {
  const out: CategoryOption[] = [];
  for (const c of cats) {
    if (c.children?.length) {
      const group = lang === "ko" ? c.ko : c.en;
      for (const ch of c.children) {
        out.push({ value: ch.ko, label: lang === "ko" ? ch.ko : ch.en, group });
      }
    } else {
      out.push({ value: c.ko, label: lang === "ko" ? c.ko : c.en });
    }
  }
  return out;
}

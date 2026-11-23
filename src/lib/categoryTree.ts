import type { BilingualCategory } from "@/types/common";

/**
 * 2단계 카테고리 트리 공용 헬퍼 (순수 함수 — 클라이언트/서버 공용, 서버 의존성 없음).
 *
 * 데이터 모델:
 * - 카테고리 목록은 `BilingualCategory[]` 트리 (대분류가 `children` 으로 소분류를 가짐, 최대 1단계).
 * - legacy 는 flat `string[]` / `BilingualCategory[]` (children 없음) — 그대로 흡수된다.
 * - 글(posts.category)에는 leaf 의 저장값을 둔다(categoryValue). 이름이 트리에서 하나뿐이면 ko 이름,
 *   다른 대분류에 같은 이름이 있으면 `"대분류/소분류"` 경로. 부모는 트리에서 도출.
 * - 이름만 저장된 옛 값도 그대로 읽는다(resolveCategory). 이름이 하나뿐이면 예전과 같게 동작한다.
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

/** 대분류와 소분류를 잇는 저장값 구분자 — `"대분류/소분류"` */
const CATEGORY_PATH_SEPARATOR = "/";

/** 트리에서 찾은 카테고리 — 소분류면 부모(대분류)를 함께 돌려준다 */
export interface ResolvedCategory {
  node: BilingualCategory;
  parent: BilingualCategory | null;
}

const nameMatches = (c: BilingualCategory, value: string) => c.ko === value || c.en === value;

/**
 * 저장값(이름 하나 또는 `"대분류/소분류"` 경로)을 트리의 노드로 해석한다.
 *
 * 1. 이름 전체가 어떤 노드의 ko/en 과 같으면 그 노드. 같은 이름이 여럿이면 대분류를 먼저,
 *    그다음 트리 순서상 첫 소분류를 고른다(경로 없이 이름만 저장된 옛 값의 해석 규칙).
 *    이름에 `/` 가 든 카테고리(예: "CI/CD")도 여기서 먼저 걸린다.
 * 2. 아니면 `/` 위치마다 앞을 대분류, 뒤를 소분류 이름으로 보고 맞는 쌍을 찾는다.
 *    ko 경로("개발/프론트엔드")와 en 경로("Development/Frontend") 둘 다 받는다.
 */
export function resolveCategory(
  cats: readonly BilingualCategory[],
  value: string,
): ResolvedCategory | null {
  const v = value.trim();
  if (!v) return null;
  for (const c of cats) {
    if (nameMatches(c, v)) return { node: c, parent: null };
  }
  for (const c of cats) {
    const child = c.children?.find((ch) => nameMatches(ch, v));
    if (child) return { node: child, parent: c };
  }
  for (let i = v.indexOf(CATEGORY_PATH_SEPARATOR); i > 0; i = v.indexOf(CATEGORY_PATH_SEPARATOR, i + 1)) {
    const parentName = v.slice(0, i).trim();
    const childName = v.slice(i + 1).trim();
    if (!parentName || !childName) continue;
    for (const c of cats) {
      if (!nameMatches(c, parentName)) continue;
      const child = c.children?.find((ch) => nameMatches(ch, childName));
      if (child) return { node: child, parent: c };
    }
  }
  return null;
}

/** 저장값(이름 또는 경로)으로 노드 탐색 (대분류/소분류 무관). 규칙은 resolveCategory */
export function findCategoryNode(
  cats: readonly BilingualCategory[],
  value: string,
): BilingualCategory | null {
  return resolveCategory(cats, value)?.node ?? null;
}

/** 트리 전체에서 ko 또는 en 이 name 과 같은 노드 수 */
function countNamed(cats: readonly BilingualCategory[], name: string): number {
  return flattenCategories(cats).filter((c) => nameMatches(c, name)).length;
}

/**
 * 노드를 posts.category 에 저장할 값으로.
 * - 대분류(또는 자식 없는 최상위)는 ko 이름 그대로.
 * - 소분류는 이름이 트리에서 하나뿐이면 ko 이름 그대로(기존 데이터와 같은 모양),
 *   다른 대분류에 같은 이름이 있으면 `"대분류ko/소분류ko"` 경로.
 */
export function categoryValue(
  cats: readonly BilingualCategory[],
  node: BilingualCategory,
  parent: BilingualCategory | null,
): string {
  if (!parent) return node.ko;
  if (countNamed(cats, node.ko) <= 1) return node.ko;
  return `${parent.ko}${CATEGORY_PATH_SEPARATOR}${node.ko}`;
}

/**
 * 아무 형태의 입력(ko/en 이름, ko/en 경로)을 저장값으로 정규화. 트리에 없으면 다듬기만 해 돌려준다.
 * 저장 직전 · 같은 카테고리끼리 묶어 셀 때 쓴다.
 */
export function canonicalCategory(cats: readonly BilingualCategory[], value: string): string {
  const resolved = resolveCategory(cats, value);
  return resolved ? categoryValue(cats, resolved.node, resolved.parent) : value.trim();
}

/**
 * 저장값 → 보이는 이름(lang). 소분류 이름이 다른 대분류에도 있으면 `"대분류 › 소분류"` 로 구분해 보인다.
 * 트리에 없는 값은 그대로.
 */
export function categoryLabel(
  cats: readonly BilingualCategory[],
  value: string,
  lang: "ko" | "en",
): string {
  const resolved = resolveCategory(cats, value);
  if (!resolved) return value;
  const { node, parent } = resolved;
  if (parent && countNamed(cats, node.ko) > 1) return `${parent[lang]} › ${node[lang]}`;
  return node[lang];
}

/**
 * 필터 값을 매칭 대상 문자열 집합(posts.category 에 있을 수 있는 값)으로 확장.
 * - 대분류 → [대분류 + 모든 소분류], 소분류/leaf → [해당 노드]
 * - 노드마다 ko·en 경로("개발/프론트엔드" · "Development/Frontend")를 넣고,
 *   경로 없는 이름(ko·en)은 그 이름이 이 노드로 해석될 때만 넣는다 — 다른 대분류의 같은 이름 글이 섞이지 않게.
 * - 트리에 없는 값은 [값] 그대로.
 */
export function expandCategoryValues(
  cats: readonly BilingualCategory[],
  value: string,
): string[] {
  const resolved = resolveCategory(cats, value);
  if (!resolved) return [value];
  const entries: ResolvedCategory[] = [
    resolved,
    ...(resolved.node.children ?? []).map((ch) => ({ node: ch, parent: resolved.node })),
  ];
  const values = new Set<string>([value.trim()]);
  for (const { node, parent } of entries) {
    for (const name of [node.ko, node.en]) {
      if (name && findCategoryNode(cats, name) === node) values.add(name);
    }
    if (parent) {
      values.add(`${parent.ko}${CATEGORY_PATH_SEPARATOR}${node.ko}`);
      values.add(`${parent.en}${CATEGORY_PATH_SEPARATOR}${node.en}`);
    }
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
 * 자식 없는 최상위 카테고리는 ungrouped. value 는 leaf 의 저장값(categoryValue — 보통 ko 이름,
 * 같은 이름이 다른 대분류에도 있으면 "대분류/소분류" 경로).
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
        out.push({ value: categoryValue(cats, ch, c), label: lang === "ko" ? ch.ko : ch.en, group });
      }
    } else {
      out.push({ value: c.ko, label: lang === "ko" ? c.ko : c.en });
    }
  }
  return out;
}

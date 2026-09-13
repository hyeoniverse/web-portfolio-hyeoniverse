import { formatProjectNumber } from "@/utils/formatProjectNumber";

/** 옛 주소를 판단하는 데 쓰는 작업물 값 */
export interface WorkRef {
  id: string;
  slug: string | null;
  sort_order: number;
}

/**
 * 작업물 옛 주소(id 또는 표시 번호 "01" 등)가 가리키는 slug 주소를 돌려준다(#909). 상세 레이아웃의 findProjectIndex 와
 * 같은 순서로 본다. slug 가 먼저라, 숫자처럼 생긴 slug 는 그대로 둔다. 옮길 필요가 없으면(이미 slug 이거나, slug 없는
 * 작업물이거나, 없는 작업물이면) null.
 */
export function legacyWorkTarget(works: WorkRef[], param: string): string | null {
  if (works.some((w) => w.slug === param)) return null;
  const hit =
    works.find((w) => w.id === param) ??
    works.find((w) => formatProjectNumber(w.sort_order) === param.padStart(2, "0"));
  const target = hit ? hit.slug || hit.id : null;
  return target && target !== param ? target : null;
}

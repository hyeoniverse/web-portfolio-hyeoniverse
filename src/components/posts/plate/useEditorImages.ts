import { useCallback, useState } from "react";
import type { EditorImageInfo } from "./types";

/* 같은 목록인지 — 주소·자리·종류·떼어 둔 것인지가 모두 같으면 같다 */
function sameImages(a: EditorImageInfo[], b: EditorImageInfo[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => {
    const y = b[i];
    return x.url === y.url && x.mediaType === y.mediaType && !!x.detached === !!y.detached
      && x.path.length === y.path.length && x.path.every((v, j) => v === y.path[j]);
  });
}

/**
 * 본문 첨부 이미지 패널의 목록. 편집기는 본문이 바뀔 때마다 목록을 새 배열로 돌려주므로,
 * 그대로 상태에 넣으면 글자 하나 칠 때마다 편집 화면 전체를 한 번 더 그린다(#850).
 * 목록이 같으면 상태를 그대로 두어 다시 그리지 않는다.
 */
export function useEditorImages() {
  const [images, setImages] = useState<EditorImageInfo[]>([]);
  const update = useCallback((next: EditorImageInfo[]) => {
    setImages((prev) => (sameImages(prev, next) ? prev : next));
  }, []);
  return [images, update] as const;
}

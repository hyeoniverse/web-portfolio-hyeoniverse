import { useCallback, useSyncExternalStore } from "react";

const MAX_RECENT = 8;
const EMPTY: string[] = [];

/* key 마다 한 벌 — 같은 key 를 쓰는 도구끼리 최근색을 함께 본다(#1117).
   예전에는 도구마다 useState 로 따로 들고 있어, 떠 있는 툴바에서 고른 색이 상단 툴바에는
   페이지를 다시 열 때까지 나타나지 않았다. */
const cache = new Map<string, string[]>();
const listeners = new Map<string, Set<() => void>>();
let storageBound = false;

const storageKeyOf = (key: string) => `editor-recent-colors:${key}`;

function read(key: string): string[] {
  const hit = cache.get(key);
  if (hit) return hit;
  let colors = EMPTY;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKeyOf(key)) || "[]");
    if (Array.isArray(parsed)) colors = parsed.filter((c): c is string => typeof c === "string").slice(0, MAX_RECENT);
  } catch { /* 저장소를 못 쓰면 빈 목록 */ }
  cache.set(key, colors);
  return colors;
}

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function subscribe(key: string, fn: () => void) {
  /* 다른 탭에서 고른 색도 받는다 */
  if (!storageBound && typeof window !== "undefined") {
    storageBound = true;
    window.addEventListener("storage", (e) => {
      const key = e.key?.startsWith("editor-recent-colors:") ? e.key.slice("editor-recent-colors:".length) : null;
      if (!key) return;
      cache.delete(key);
      emit(key);
    });
  }
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(fn);
  return () => { set.delete(fn); };
}

/** localStorage 기반 최근 색상 hook — key 별로 분리 (예: "border-color", "cell-bg", "text-mark") */
export function useRecentColors(storageKey: string) {
  const colors = useSyncExternalStore(
    useCallback((fn: () => void) => subscribe(storageKey, fn), [storageKey]),
    () => read(storageKey),
    () => EMPTY,
  );

  const addColor = useCallback((color: string) => {
    if (!color) return;
    // 중복 제거, 맨 앞에 추가
    const next = [color, ...read(storageKey).filter((c) => c !== color)].slice(0, MAX_RECENT);
    cache.set(storageKey, next);
    try {
      window.localStorage.setItem(storageKeyOf(storageKey), JSON.stringify(next));
    } catch { /* quota / disabled */ }
    emit(storageKey);
  }, [storageKey]);

  return { colors, addColor };
}

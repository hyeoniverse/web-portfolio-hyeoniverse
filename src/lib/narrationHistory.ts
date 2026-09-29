/**
 * 슬라이드 음성 이력 — 장마다 만들거나 올린 음성 파일 주소를 이 브라우저에 남긴다(편집 화면 전용).
 *
 * 다시 만들면 작업물에는 새 음성만 남아 앞의 음성을 다시 찾을 길이 없었다. 음성 파일은 버킷에서 지우지 않으므로
 * 주소만 기억해 두면 나중에 다시 듣고 되돌릴 수 있다. 서버에 둘 만큼의 기록은 아니라 localStorage 에만 둔다 —
 * 다른 브라우저·기기에는 없고, 저장소를 비우면 사라진다.
 * 열쇠는 슬라이드 그림 주소다(gallery_notes 와 같다). 장마다 최근 MAX_PER_SLIDE 개만 둔다.
 */
export interface NarrationHistoryEntry {
  audio: string;
  /** 만든 목소리("제공자:성별") — 녹음이나 이력 기능 전에 만든 음성이면 없다 */
  voice?: string;
  source?: "tts" | "recorded";
  /** 만들 때 쓴 대본 */
  script?: string;
  /** 기록한 때(ms) */
  at: number;
}

type HistoryMap = Record<string, NarrationHistoryEntry[]>;

const KEY = "gallery.narrationHistory";
const MAX_PER_SLIDE = 10;
const EMPTY: NarrationHistoryEntry[] = [];

let cache: HistoryMap | null = null;
const listeners = new Set<() => void>();

function load(): HistoryMap {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as HistoryMap) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function save(next: HistoryMap) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 저장소를 못 쓰면 이번 방문 동안만 */ }
  listeners.forEach((l) => l());
}

export function subscribeNarrationHistory(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; cb(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

/** 이 장의 이력 — 최근 것이 앞. 같은 배열을 돌려주다가 바뀌면 새 배열(useSyncExternalStore 용) */
export function readNarrationHistory(slide: string): NarrationHistoryEntry[] {
  return load()[slide] ?? EMPTY;
}

/** 남긴다 — 같은 주소가 있으면 맨 앞으로 옮긴다 */
export function pushNarrationHistory(slide: string, entry: NarrationHistoryEntry) {
  const map = load();
  const rest = (map[slide] ?? []).filter((e) => e.audio !== entry.audio);
  save({ ...map, [slide]: [entry, ...rest].slice(0, MAX_PER_SLIDE) });
}

/** 이력에서만 뺀다 — 파일은 그대로 */
export function removeNarrationHistory(slide: string, audio: string) {
  const map = load();
  const list = (map[slide] ?? []).filter((e) => e.audio !== audio);
  const next = { ...map };
  if (list.length) next[slide] = list;
  else delete next[slide];
  save(next);
}

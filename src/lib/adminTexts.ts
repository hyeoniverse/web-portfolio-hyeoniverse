import { ADMIN_TEXTS_MAX, ADMIN_TEXT_MAX_CHARS } from "@/lib/adminTextsShared";

/**
 * 관리자 화면의 시스템 글(알림 제목 · 본문 — 서버가 만들어 저장한 정해진 글) 번역 저장소.
 * 화면 글 사전에 없어 adminLang 이 닿지 않는 글을 /api/admin/site-translate-texts 로 묻는다.
 * 화면이 보이는 글을 request() 로 알리면 모아서 한 번에 묻고, 받으면 구독자에게 알린다.
 * 받은 번역은 메모리 + localStorage(언어마다 한 묶음). 실패한 글은 이번 방문 동안 원문.
 * 관리자 사전을 싣지 않는다 — 공개 번들의 내비게이션(알림 드롭다운)도 쓴다.
 */
const CACHE_PREFIX = "adminTexts:";
/* 저장해 두는 글 수 상한 — 오래된 것부터 버린다 */
const CACHE_MAX = 500;

const memory = new Map<string, Map<string, string>>();
const tried = new Map<string, Set<string>>();
const queue = new Map<string, Set<string>>();
let timer: ReturnType<typeof setTimeout> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function langMap(lang: string): Map<string, string> {
  let m = memory.get(lang);
  if (!m) {
    m = new Map();
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + lang);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (typeof v === "string") m.set(k, v);
      }
    } catch { /* 저장소를 못 쓰면 받아 올 때까지 원문 */ }
    memory.set(lang, m);
  }
  return m;
}

function save(lang: string) {
  const entries = [...langMap(lang)].slice(-CACHE_MAX);
  try { localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(Object.fromEntries(entries))); } catch { /* 메모리에만 */ }
}

export function subscribeAdminTexts(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}
export const getAdminTextsVersion = () => version;
function emit() {
  version++;
  listeners.forEach((l) => l());
}

/** 번역 — 없으면 undefined */
export function lookupAdminText(lang: string, text: string): string | undefined {
  return langMap(lang).get(text);
}

/** 보이는 글을 알린다 — 아직 없고 묻지 않은 글만 모아 다음 틱에 묻는다 */
export function requestAdminTexts(lang: string, texts: Iterable<string>, fetcher: typeof fetch = fetch) {
  const have = langMap(lang);
  const done = tried.get(lang) ?? new Set<string>();
  tried.set(lang, done);
  const q = queue.get(lang) ?? new Set<string>();
  for (const t of texts) {
    if (!t || !t.trim() || t.length > ADMIN_TEXT_MAX_CHARS || have.has(t) || done.has(t)) continue;
    q.add(t);
  }
  if (!q.size) return;
  queue.set(lang, q);
  if (!timer) timer = setTimeout(() => { timer = null; void flush(fetcher); }, 0);
}

async function flush(fetcher: typeof fetch) {
  const jobs = [...queue];
  queue.clear();
  await Promise.all(jobs.map(async ([lang, set]) => {
    const all = [...set];
    const done = tried.get(lang)!;
    for (let i = 0; i < all.length; i += ADMIN_TEXTS_MAX) {
      const batch = all.slice(i, i + ADMIN_TEXTS_MAX);
      batch.forEach((t) => done.add(t));
      try {
        const res = await fetcher("/api/admin/site-translate-texts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang, texts: batch }),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as { translations?: unknown };
        const tr = data.translations && typeof data.translations === "object" ? (data.translations as Record<string, unknown>) : {};
        const m = langMap(lang);
        let added = false;
        for (const t of batch) {
          const v = tr[t];
          if (typeof v === "string" && v.trim()) { m.set(t, v); added = true; }
        }
        if (added) { save(lang); emit(); }
      } catch { /* 이번 방문 동안 원문 */ }
    }
  }));
}

/** 테스트용 */
export function __resetAdminTextsForTest() {
  memory.clear();
  tried.clear();
  queue.clear();
  if (timer) clearTimeout(timer);
  timer = null;
  version = 0;
}

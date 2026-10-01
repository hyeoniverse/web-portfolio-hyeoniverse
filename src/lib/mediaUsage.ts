/* 라이브러리 › 업로드한 파일 — 저장소 파일이 어디서 쓰이는지. 파일 주소는 저장 경로(예: posts/uuid.jpg,
   logos/1700000000.png)를 그대로 품으므로, 글·프로젝트·사이트 설정 등을 글자로 이어 붙인 뒤 경로가 들어 있는지 본다. */

export type MediaUseKind = "post" | "work" | "series" | "settings" | "emoji" | "coverHistory";

export interface MediaRef { kind: MediaUseKind; id?: string; title?: string }

export interface MediaSource { kind: MediaUseKind; id?: string; title?: string; text: string }

/** 저장 경로 → 쓰는 곳들. 같은 곳에서 여러 번 나와도 한 번 */
export function findMediaUsage(paths: string[], sources: MediaSource[]): Map<string, MediaRef[]> {
  const out = new Map<string, MediaRef[]>();
  for (const path of paths) {
    const refs: MediaRef[] = [];
    for (const s of sources) {
      if (s.text.includes(path)) refs.push({ kind: s.kind, ...(s.id ? { id: s.id } : {}), ...(s.title ? { title: s.title } : {}) });
    }
    out.set(path, refs);
  }
  return out;
}

/* 저장소 공개 주소 안의 경로 — …/object/public/<bucket>/<path>, …/render/image/public/<bucket>/<path> 등.
   버킷 이름 뒤 글자를 경로로 보고, 앞쪽 폴더를 하나씩 떼어 낸 꼴도 함께 넣는다(posts 버킷의 posts/a.jpg 처럼
   버킷과 폴더 이름이 겹쳐도 맞게). */
const PATH_RE = /\/(?:posts|uploads)\/([A-Za-z0-9._~%\-/]+)/g;

function candidates(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(PATH_RE)) {
    let p = m[1];
    try { p = decodeURIComponent(p); } catch { /* 깨진 % 는 그대로 */ }
    for (;;) {
      out.add(p);
      const i = p.indexOf("/");
      if (i < 0) break;
      p = p.slice(i + 1);
    }
  }
  return out;
}

/** 모든 곳을 한 번씩만 훑어 경로 → 쓰는 곳 색인을 만든다. 파일마다 모든 글을 다시 훑던
    findMediaUsage(파일 수 × 글 수)보다 훨씬 빠르다 — 목록용. 지우기 직전 확인은 findMediaUsage 로 꼼꼼히. */
export function indexMediaUsage(sources: MediaSource[]): Map<string, MediaRef[]> {
  const out = new Map<string, MediaRef[]>();
  for (const s of sources) {
    const ref: MediaRef = { kind: s.kind, ...(s.id ? { id: s.id } : {}), ...(s.title ? { title: s.title } : {}) };
    for (const p of candidates(s.text)) {
      const list = out.get(p);
      if (list) list.push(ref);
      else out.set(p, [ref]);
    }
  }
  return out;
}

export interface MediaQuery { kind?: string; unused?: boolean; q?: string; page?: number; limit?: number }

/** 걸러 보기 + 쪽 나누기. 종류별 개수·안 쓰는 파일 크기는 거르기 전 전체로 센다(걸러 보기 단추에 붙는다) */
export function pageMedia<T extends { path: string; name: string; mime: string; size: number; usage: unknown[] }>(all: T[], query: MediaQuery) {
  const counts: Record<string, number> = { all: all.length };
  let totalSize = 0, unusedCount = 0, unusedSize = 0;
  for (const m of all) {
    const k = mediaType(m.mime, m.name);
    counts[k] = (counts[k] ?? 0) + 1;
    totalSize += m.size;
    if (m.usage.length === 0) { unusedCount++; unusedSize += m.size; }
  }
  const q = (query.q ?? "").trim().toLowerCase();
  const filtered = all.filter((m) =>
    (!query.kind || query.kind === "all" || mediaType(m.mime, m.name) === query.kind)
    && (!query.unused || m.usage.length === 0)
    && (!q || m.path.toLowerCase().includes(q)));
  const limit = Math.min(Math.max(1, query.limit ?? 48), 200);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const page = Math.min(Math.max(1, query.page ?? 1), totalPages);
  return {
    items: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length, page, totalPages,
    summary: { counts, totalSize, unusedCount, unusedSize },
  };
}

/** 파일 종류 — 목록 걸러 보기용 */
export function mediaType(mime: string, name: string): "image" | "video" | "audio" | "font" | "doc" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (/\.(woff2?|ttf|otf)$/i.test(name) || mime.startsWith("font/")) return "font";
  if (mime === "application/pdf" || /\.(pdf|docx?|pptx?|xlsx?|hwp|zip)$/i.test(name)) return "doc";
  return "other";
}

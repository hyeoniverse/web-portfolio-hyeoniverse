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

/** 파일 종류 — 목록 걸러 보기용 */
export function mediaType(mime: string, name: string): "image" | "video" | "audio" | "font" | "doc" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (/\.(woff2?|ttf|otf)$/i.test(name) || mime.startsWith("font/")) return "font";
  if (mime === "application/pdf" || /\.(pdf|docx?|pptx?|xlsx?|hwp|zip)$/i.test(name)) return "doc";
  return "other";
}

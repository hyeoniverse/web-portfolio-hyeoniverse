// ── 갤러리 블록 데이터 모델 ──
// 슬라이드 갤러리를 글 본문 어디에나 둔다(작업물 갤러리와 같은 모양 — 주소 목록 + 주소를 열쇠로 한 장마다의 대본 · 음성).
// el.data 에 저장하고, HTML 로는 data-gallery 속성에 JSON 으로 담긴다(plateSerializer · readerExtras/islands).
import type { GalleryNotes } from "@/data/projects";

export interface GalleryBlockData {
  gallery: string[];
  notes: GalleryNotes;
}

/** 저장된 값을 믿지 않고 모양을 맞춘다 — 문자열 주소만, 노트는 갤러리에 있는 장의 것만 */
export function normalizeGallery(raw: unknown): GalleryBlockData {
  const r = (raw && typeof raw === "object" ? raw : {}) as { gallery?: unknown; notes?: unknown };
  const gallery = Array.isArray(r.gallery) ? r.gallery.filter((u): u is string => typeof u === "string" && u.trim() !== "") : [];
  const inGallery = new Set(gallery);
  const notesIn = r.notes && typeof r.notes === "object" ? (r.notes as GalleryNotes) : {};
  const notes: GalleryNotes = {};
  for (const [url, note] of Object.entries(notesIn)) if (inGallery.has(url) && note && typeof note === "object") notes[url] = note;
  return { gallery, notes };
}

import type { GalleryNote, GalleryNotes } from "@/data/projects";

/**
 * 갤러리 음성 노트의 언어 — 한국어는 노트의 기본 칸, 영어는 노트 안의 `en` 칸에 같은 모양으로 둔다.
 * DB 칸을 새로 만들지 않으려고 한 노트 안에 두 언어를 넣었다(gallery_notes JSONB 하나).
 */
export type NoteLang = "ko" | "en";

/** 한 장의 그 언어 노트 — en 칸을 뺀 모양 */
export function noteFor(note: GalleryNote | undefined, lang: NoteLang): Omit<GalleryNote, "en"> | undefined {
  if (!note) return undefined;
  if (lang === "en") return note.en;
  const { en: _en, ...ko } = note;
  return ko;
}

/** 편집 화면용 — 그 언어의 노트만 모은다(없는 장은 뺀다) */
export function notesForLang(notes: GalleryNotes | undefined, lang: NoteLang): GalleryNotes {
  const out: GalleryNotes = {};
  for (const [url, note] of Object.entries(notes ?? {})) {
    const n = noteFor(note, lang);
    if (n && Object.keys(n).length > 0) out[url] = n;
  }
  return out;
}

/** 읽는 화면용 — 영어로 볼 때 영어 대본·음성이 없는 장은 한국어로 대신한다 */
export function readerNotes(notes: GalleryNotes | undefined, lang: NoteLang): GalleryNotes | undefined {
  if (!notes || lang === "ko") return notes && notesForLang(notes, "ko");
  const out: GalleryNotes = {};
  for (const [url, note] of Object.entries(notes)) {
    const en = note.en;
    out[url] = en && (en.script?.trim() || en.audio) ? en : (noteFor(note, "ko") ?? {});
  }
  return out;
}

/** 한 장의 그 언어 노트를 고친다 — undefined·빈 문자열 칸은 지우고, 다 비면 그 언어 칸(또는 장)을 없앤다 */
export function patchNote(notes: GalleryNotes, url: string, lang: NoteLang, patch: Partial<Omit<GalleryNote, "en">>): GalleryNotes {
  const next: GalleryNotes = { ...notes };
  const cur = next[url] ?? {};
  const clean = (o: Record<string, unknown>) => {
    for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === "") delete o[k];
    return o;
  };
  if (lang === "en") {
    const en = clean({ ...(cur.en ?? {}), ...patch } as Record<string, unknown>) as GalleryNote["en"];
    const merged: GalleryNote = { ...cur, en };
    if (!en || Object.keys(en).length === 0) delete merged.en;
    if (Object.keys(merged).length === 0) delete next[url]; else next[url] = merged;
  } else {
    const merged = clean({ ...cur, ...patch } as Record<string, unknown>) as GalleryNote;
    if (Object.keys(merged).length === 0) delete next[url]; else next[url] = merged;
  }
  return next;
}

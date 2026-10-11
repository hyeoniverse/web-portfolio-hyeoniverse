import type { GalleryNotes, Project } from "@/data/projects";
import type { ContentFields, ContentRole } from "@/lib/api/contentTranslate";
import { readerNotes } from "@/lib/galleryNotes";

/**
 * "다른 언어로 읽기"의 번역(/api/content-translate 응답)을 화면 모양에 덧씌운다 — 브라우저 쪽.
 *
 * 번역된 칸은 ko · en 두 칸 모두 번역으로 덮는다. 그러면 T · pickLocalized 가 어느 언어를 고르든 번역이 보이고,
 * 컴포넌트는 번역이 있는지 몰라도 된다. 번역이 없는 칸(응답에 없거나 원문 그대로 돌아온 칸)은 건드리지 않는다.
 */
const both = (v: string | undefined, fallback: { ko: string; en: string }) => (v ? { ko: v, en: v } : fallback);

/** 역할별 목록 → 화면의 { 역할: 항목[] } — 번역으로 역할 이름이 겹치면 항목을 잇는다 */
export function rolesToRecord(list: ContentRole[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const { role, items } of list) out[role] = [...(out[role] ?? []), ...items];
  return out;
}

/**
 * 갤러리 노트 — 번역의 원문 언어(source) 노트를 두 언어 칸에 두고 번역된 자막 줄(captions)을 붙인다.
 * 음성은 원문 그대로(파일·대본은 번역하지 않는다), 보이는 자막만 번역이다.
 */
export function translatedGalleryNotes(
  notes: GalleryNotes | undefined,
  source: "ko" | "en",
  captions: Record<string, string[]> | undefined,
): GalleryNotes | undefined {
  if (!notes || !captions || Object.keys(captions).length === 0) return notes;
  const shown = readerNotes(notes, source) ?? {};
  const out: GalleryNotes = { ...notes };
  for (const [url, lines] of Object.entries(captions)) {
    const n = shown[url];
    if (!n || lines.length === 0) continue;
    const withCaptions = { ...n, captions: lines };
    out[url] = { ...withCaptions, en: withCaptions };
  }
  return out;
}

export function translatedProject(p: Project, tr: ContentFields): Project {
  const contributions = tr.contributions?.length ? rolesToRecord(tr.contributions) : undefined;
  const techNotes = tr.techNotes && p.tech_notes
    ? Object.fromEntries(Object.entries(p.tech_notes).map(([tech, note]) => [tech, both(tr.techNotes?.[tech], note)]))
    : p.tech_notes;
  const categories = tr.categories?.length ? tr.categories : undefined;
  return {
    ...p,
    title: both(tr.title, p.title),
    subtitle: both(tr.subtitle, p.subtitle),
    description: both(tr.description, p.description),
    content: both(tr.content, p.content),
    ...(categories ? { categories: { ko: categories, en: categories }, category: { ko: categories[0], en: categories[0] } } : {}),
    ...(tr.nature && p.nature ? { nature: { ko: tr.nature, en: tr.nature } } : {}),
    role: both(tr.role, p.role),
    ...(contributions && p.contributions ? { contributions: { ko: contributions, en: contributions } } : {}),
    tech_notes: techNotes,
    ...(tr.summary && p.summary ? { summary: { ko: tr.summary, en: tr.summary } } : {}),
    teamMembers: p.teamMembers && tr.team?.length
      ? p.teamMembers.map((m, i) => {
        const t = tr.team?.[i];
        if (!t) return m;
        const c = t.contributions.length ? rolesToRecord(t.contributions) : undefined;
        return {
          ...m,
          role: both(t.role, m.role),
          ...(t.bio ? { bio: { ko: t.bio, en: t.bio } } : {}),
          ...(c ? { contributions: { ko: c, en: c } } : {}),
        };
      })
      : p.teamMembers,
    galleryNotes: translatedGalleryNotes(p.galleryNotes, tr.source ?? "ko", tr.gallery),
  };
}

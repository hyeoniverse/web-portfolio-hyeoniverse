import { createHash } from "crypto";
import { isContentMissing } from "@/lib/contentLang";

/**
 * 상세 화면 "다른 언어로 읽기"(/api/content-translate)의 순수한 부분 — 원문 고르기 · 해시.
 * 라우트에서 떼어 둔 것은 테스트하려고다(DB · 공급자 없이).
 */

/** 번역하는 칸 — 글: title · excerpt · content, 작업물: title · subtitle · description · content */
export type ContentField = "title" | "excerpt" | "subtitle" | "description" | "content";
type ContentTextFields = Partial<Record<ContentField, string>>;

/**
 * 정보 칸(메타) — 본문 밖에서 방문자에게 보이는, DB 의 ko/en 칸에서 온 글. 칸마다 모양이 다르다.
 *   글    : summary(AI 요약) · seriesTitle(시리즈 이름)
 *   작업물: summary · categories · nature · role · contributions(역할별 항목) · techNotes(기술 이름 → 설명)
 *           · team(팀원 순서대로 역할 · 소개 · 기여) · gallery(그림 주소 → 자막 줄)
 * 번역하지 않는 것: 기술 이름 · 태그(주소의 열쇠이자 고유명사) · 팀원 이름 · 날짜 · 주소 · 수치(요약의 metrics 값)
 * — 바꾸면 링크가 깨지거나 뜻이 틀어진다.
 */
export interface ContentRole { role: string; items: string[] }
interface ContentTeamMember { role: string; bio: string; contributions: ContentRole[] }
export interface ContentMeta {
  /** 저장된 요약 글(JSON 구조 또는 예전 줄글) — 번역도 같은 꼴로 돌려준다 */
  summary?: string;
  seriesTitle?: string;
  categories?: string[];
  nature?: string;
  role?: string;
  contributions?: ContentRole[];
  techNotes?: Record<string, string>;
  team?: ContentTeamMember[];
  /** 그림 주소 → 자막 줄(lib/galleryCaptions 의 captionLines) — 줄 수는 원문과 늘 같다 */
  gallery?: Record<string, string[]>;
}
type ContentMetaField = keyof ContentMeta;

/** 번역 응답 · 캐시(content_translations.fields) — 칸 글 + 정보 칸 + 원문 언어 · 판(v) */
export type ContentFields = ContentTextFields & ContentMeta & {
  /** 번역의 원문 언어 — 갤러리 음성·자막을 그 언어 노트로 맞춘다 */
  source?: "ko" | "en";
  /** 캐시 판 — 정보 칸을 더하기 전에 저장된 줄(v 없음)은 다시 번역한다 */
  v?: number;
};

/** 캐시 판 — 번역하는 칸이 늘면 올린다. 이보다 낮은 줄은 원문이 그대로여도 다시 번역한다 */
export const CONTENT_TRANSLATION_VERSION = 2;

export interface ContentSource {
  /** 원문 칸 — 한국어 본문이 있으면 ko, 없으면 en(갤러리 음성 · 자막을 그 칸의 노트로 맞춘다) */
  lang: "ko" | "en";
  /** 원문의 실제 언어 — 공급자에 넘긴다. ko 칸이면 source_lang(기본 언어가 ja 면 ja, 비면 ko) */
  from: string;
  fields: ContentTextFields;
  /** 정보 칸 — 빈 칸은 넣지 않는다 */
  meta: ContentMeta;
  /** 본문이 HTML(richtext)인가 — 공급자에 HTML 로 보낸다 */
  html: boolean;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
/** 역할별 항목(jsonb) → 순서 있는 목록. 빈 역할 이름은 뺀다 */
function roles(v: unknown): ContentRole[] {
  if (!v || typeof v !== "object" || Array.isArray(v)) return [];
  return Object.entries(v as Record<string, unknown>)
    .map(([role, items]) => ({ role: role.trim(), items: strList(items) }))
    .filter((r) => r.role);
}
/** 한 언어 칸이 비면 다른 언어 칸 — 화면(T · pickLocalized)이 그렇게 보여 준다 */
const pick = (useKo: boolean, ko: unknown, en: unknown) => (useKo ? str(ko) || str(en) : str(en) || str(ko));

/** 빈 칸을 뺀다 — 빈 칸은 보내지도, 해시에 넣지도 않는다 */
function compactMeta(m: ContentMeta): ContentMeta {
  const out: ContentMeta = {};
  for (const [k, v] of Object.entries(m) as [ContentMetaField, ContentMeta[ContentMetaField]][]) {
    const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
    if (!empty) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** 글 — 한국어 본문(content)이 있으면 한국어 칸들, 없으면 영어 칸들. 제목은 그 언어 칸이 비면 다른 쪽.
 *  series 는 글이 속한 시리즈 행(title · title_en) — 없으면 시리즈 이름은 번역하지 않는다 */
export function postSource(row: Row, series?: Row | null): ContentSource | null {
  const ko = str(row.content);
  const en = str(row.content_en);
  if (!ko && !en) return null;
  const useKo = !!ko;
  return {
    lang: useKo ? "ko" : "en",
    from: useKo ? str(row.source_lang) || "ko" : "en",
    html: row.content_type === "richtext",
    fields: {
      title: (useKo ? str(row.title) : str(row.title_en)) || str(row.title) || str(row.title_en),
      excerpt: useKo ? str(row.excerpt) : str(row.excerpt_en),
      content: useKo ? ko : en,
    },
    meta: compactMeta({
      summary: pick(useKo, row.summary_ko, row.summary_en),
      seriesTitle: series ? pick(useKo, series.title, series.title_en) : "",
    }),
  };
}

/** 작업물 — 한국어 본문이 있으면(contentLang 판정 — 복사된 README 는 없는 것으로 친다) 한국어 칸들, 아니면 영어 칸들.
 *  gallery 는 그림 주소 → 그 언어의 자막 줄(서버가 readerNotes + captionLines 로 만든다) */
export function workSource(row: Row, gallery?: Record<string, string[]>): ContentSource | null {
  const ko = str(row.content_ko);
  const en = str(row.content_en);
  const koMissing = isContentMissing(ko, en, "ko");
  const enMissing = isContentMissing(en, ko, "en");
  if (koMissing && enMissing) return null;
  const useKo = !koMissing;
  const lang = useKo ? "ko" : "en";

  const catsKo = strList(row.categories_ko);
  const catsEn = strList(row.categories_en);
  /* 화면과 같다 — 영어로 볼 때 영어 이름이 빈 자리는 한국어 이름 */
  const categories = useKo ? catsKo : (catsEn.length ? catsKo.map((k, i) => catsEn[i] || k) : catsKo);
  const contribKo = roles(row.contributions_ko);
  const contribEn = roles(row.contributions_en);

  const techNotes: Record<string, string> = {};
  if (row.tech_notes && typeof row.tech_notes === "object") {
    for (const [tech, note] of Object.entries(row.tech_notes as Record<string, { ko?: unknown; en?: unknown }>)) {
      const text = note ? pick(useKo, note.ko, note.en) : "";
      if (text) techNotes[tech] = text;
    }
  }

  const team: ContentTeamMember[] = Array.isArray(row.team_members)
    ? (row.team_members as Row[]).map((m) => {
      const mk = roles(m?.contributions_ko);
      const me = roles(m?.contributions_en);
      return {
        role: pick(useKo, m?.role_ko, m?.role_en),
        bio: pick(useKo, m?.bio_ko, m?.bio_en),
        contributions: useKo ? (mk.length ? mk : me) : (me.length ? me : mk),
      };
    })
    : [];
  /* 팀원 줄은 순서(index)로 맞춘다 — 번역할 글이 하나도 없으면 칸째 뺀다 */
  const teamHasText = team.some((m) => m.role || m.bio || m.contributions.length);

  return {
    lang,
    from: useKo ? str(row.source_lang) || "ko" : "en",
    html: row.content_type === "richtext",
    fields: {
      title: (useKo ? str(row.title) : str(row.title_en)) || str(row.title) || str(row.title_en),
      subtitle: useKo ? str(row.subtitle_ko) : str(row.subtitle_en),
      description: useKo ? str(row.description_ko) : str(row.description_en),
      content: useKo ? ko : en,
    },
    meta: compactMeta({
      summary: pick(useKo, row.summary_ko, row.summary_en),
      categories,
      nature: pick(useKo, row.nature_ko, row.nature_en),
      role: pick(useKo, row.role_ko, row.role_en),
      contributions: useKo ? (contribKo.length ? contribKo : contribEn) : (contribEn.length ? contribEn : contribKo),
      techNotes,
      team: teamHasText ? team : [],
      gallery: Object.fromEntries(Object.entries(gallery ?? {}).filter(([, lines]) => lines.length > 0)),
    }),
  };
}

/** 원문 해시 — 칸 이름 순서를 고정해 같은 원문이면 늘 같은 값. 원문이 바뀌면 캐시가 무효가 된다.
 *  판(CONTENT_TRANSLATION_VERSION)도 넣는다 — 번역하는 칸이 바뀌면 원문이 같아도 다시 번역한다 */
export function sourceHash(src: ContentSource): string {
  const keys = (Object.keys(src.fields) as ContentField[]).sort();
  const metaKeys = (Object.keys(src.meta) as ContentMetaField[]).sort();
  const payload = JSON.stringify([
    CONTENT_TRANSLATION_VERSION,
    /* 원문 칸과 실제 언어가 같으면 예전 해시 그대로 — 저장된 번역을 버리지 않게 */
    src.from === src.lang ? src.lang : [src.lang, src.from],
    src.html,
    keys.map((k) => [k, src.fields[k] ?? ""]),
    metaKeys.map((k) => [k, src.meta[k]]),
  ]);
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/** 저장된 번역을 그대로 써도 되나 — 원문 해시가 같고, 지금 판으로 저장한 줄이어야 한다 */
export function isFreshCache(cached: { source_hash?: unknown; fields?: unknown } | null | undefined, hash: string): boolean {
  if (!cached || cached.source_hash !== hash) return false;
  const v = (cached.fields as ContentFields | null)?.v;
  return typeof v === "number" && v >= CONTENT_TRANSLATION_VERSION;
}

/* ── 정보 칸 ↔ 번역할 글 조각 ──
 * 정보 칸의 글(잎)을 하나씩 꺼내 id 를 붙여 한 번에 보내고(평문 한 번), 돌아온 번역을 같은 id 자리에 끼운다.
 * 요약은 저장된 JSON 을 풀어 글 칸만 꺼낸다 — 블록 종류 · 꾸밈 이모지 · 수치는 그대로 둔다.
 */
export interface MetaPiece { id: string; text: string }

/* 요약 JSON 에서 번역하지 않는 열쇠 — 모양을 정하는 값과 수치 */
const SUMMARY_SKIP = new Set(["type", "tone", "emoji", "value", "from", "hash", "kind"]);

/** JSON 값의 글 잎을 꺼낸다 — 경로를 id 로. skip 의 열쇠 아래는 건너뛴다 */
function leaves(v: unknown, path: string, out: MetaPiece[], skip?: Set<string>) {
  if (typeof v === "string") {
    if (v.trim()) out.push({ id: path, text: v });
    return;
  }
  if (Array.isArray(v)) { v.forEach((x, i) => leaves(x, `${path}.${i}`, out, skip)); return; }
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      if (skip?.has(k)) continue;
      leaves(x, `${path}.${k}`, out, skip);
    }
  }
}

/** 잎을 번역으로 바꾼 사본 — 하나라도 번역이 없으면 null(그 칸은 원문으로) */
function replaceLeaves(v: unknown, path: string, tr: Map<string, string>, skip?: Set<string>): { ok: boolean; value: unknown } {
  if (typeof v === "string") {
    if (!v.trim()) return { ok: true, value: v };
    const t = tr.get(path);
    return t ? { ok: true, value: t } : { ok: false, value: v };
  }
  if (Array.isArray(v)) {
    let ok = true;
    const value = v.map((x, i) => { const r = replaceLeaves(x, `${path}.${i}`, tr, skip); ok &&= r.ok; return r.value; });
    return { ok, value };
  }
  if (v && typeof v === "object") {
    let ok = true;
    const value: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      if (skip?.has(k)) { value[k] = x; continue; }
      const r = replaceLeaves(x, `${path}.${k}`, tr, skip);
      ok &&= r.ok;
      value[k] = r.value;
    }
    return { ok, value };
  }
  return { ok: true, value: v };
}

/** 저장된 요약 → 번역할 모양. JSON 구조면 객체, 예전 줄글이면 문자열 */
function summaryShape(raw: string): unknown {
  if (raw.startsWith("{")) {
    try { return JSON.parse(raw) as unknown; } catch { /* 줄글로 */ }
  }
  return raw;
}

/** 정보 칸 → 번역할 글 조각(평문). id 는 "칸/경로" */
export function metaPieces(meta: ContentMeta): MetaPiece[] {
  const out: MetaPiece[] = [];
  for (const [k, v] of Object.entries(meta) as [ContentMetaField, unknown][]) {
    if (k === "summary") leaves(summaryShape(v as string), "summary", out, SUMMARY_SKIP);
    /* 기술 설명 · 자막은 열쇠(기술 이름 · 그림 주소)를 두고 값만 */
    else leaves(v, k, out);
  }
  return out;
}

/**
 * 번역을 정보 칸에 끼운다 — 칸마다 따로: 그 칸의 조각이 다 번역됐으면 번역, 하나라도 빠지면 원문 그대로.
 * complete 는 모든 칸이 번역됐는지(아니면 캐시하지 않는다).
 */
export function applyMetaTranslations(meta: ContentMeta, tr: Map<string, string>): { meta: ContentMeta; complete: boolean } {
  const out: ContentMeta = {};
  let complete = true;
  for (const [k, v] of Object.entries(meta) as [ContentMetaField, unknown][]) {
    if (k === "summary") {
      const shape = summaryShape(v as string);
      const r = replaceLeaves(shape, "summary", tr, SUMMARY_SKIP);
      if (!r.ok) complete = false;
      out.summary = !r.ok ? (v as string) : typeof r.value === "string" ? r.value : JSON.stringify(r.value);
      continue;
    }
    const r = replaceLeaves(v, k, tr);
    if (!r.ok) complete = false;
    (out as Record<string, unknown>)[k] = r.ok ? r.value : v;
  }
  return { meta: out, complete };
}

/* ── 본문 안 라벨(lib/bodyLabels) ──
 * 글마다 같은 글이라 언어마다 한 줄 — content_translations 의 source_type 'ui', source_id 는 고정값.
 * 해시는 영어 원문 라벨 묶음(열쇠 순서) — 라벨 글을 고치거나 더하면 다음 요청이 다시 번역한다.
 */
export const UI_SOURCE_ID = "00000000-0000-0000-0000-000000000000";

export function uiLabelsHash(source: [string, string][]): string {
  return createHash("sha256").update(JSON.stringify(["ui", source])).digest("hex").slice(0, 32);
}

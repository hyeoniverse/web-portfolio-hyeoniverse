import { createHash } from "crypto";
import { isContentMissing } from "@/lib/contentLang";
import type { ListItemFields, ListItemType } from "@/lib/siteTranslation";

/**
 * 사이트 전체 번역(/api/site-translate/*)의 서버 쪽 순수한 부분 — 목록 칸의 원문 고르기 · 해시.
 *
 * 목록은 본문을 번역하지 않는다 — 카드에 보이는 짧은 칸만. 상세의 줄(source_type 'post' · 'work')은 본문까지
 * 들어 있어 그 줄이 있을 때만 쓸 수 있고, 목록 하나를 보이려고 본문 수십 개를 번역할 수는 없다.
 * 그래서 짧은 칸만 담는 줄을 따로 둔다 — source_type 'post_meta' · 'work_meta' · 'series_meta'.
 */
export type ListMetaSourceType = `${ListItemType}_meta`;
export const metaSourceType = (t: ListItemType): ListMetaSourceType => `${t}_meta`;

/** 캐시 판 — 담는 칸이 바뀌면 올린다 */
export const LIST_META_VERSION = 1;

export interface ListMetaSource {
  lang: "ko" | "en";
  /** 빈 칸은 넣지 않는다 */
  fields: ListItemFields;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function compact(f: ListItemFields): ListItemFields {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => !!v)) as ListItemFields;
}

/** 목록에서 고르는 열(종류별) */
export const LIST_META_SELECT: Record<ListItemType, string> = {
  post: "id, title, title_en, excerpt, excerpt_en, content, content_en",
  work: "id, title, title_en, subtitle_ko, subtitle_en, description_ko, description_en, content_ko, content_en",
  series: "id, title, title_en, description, description_en",
};

/**
 * 한 항목의 원문 — 상세 번역(contentTranslate)과 같은 언어 판정: 한국어 본문이 있으면 한국어 칸들.
 * 시리즈는 본문이 없어 한국어 제목이 있으면 한국어. 번역할 칸이 하나도 없으면 null.
 */
export function listMetaSource(type: ListItemType, row: Row): ListMetaSource | null {
  let src: ListMetaSource;
  if (type === "post") {
    const useKo = !!str(row.content) || !str(row.content_en);
    src = {
      lang: useKo ? "ko" : "en",
      fields: compact({
        title: (useKo ? str(row.title) : str(row.title_en)) || str(row.title) || str(row.title_en),
        excerpt: useKo ? str(row.excerpt) : str(row.excerpt_en),
      }),
    };
  } else if (type === "work") {
    const ko = str(row.content_ko);
    const en = str(row.content_en);
    const useKo = !isContentMissing(ko, en, "ko") || isContentMissing(en, ko, "en");
    src = {
      lang: useKo ? "ko" : "en",
      fields: compact({
        title: (useKo ? str(row.title) : str(row.title_en)) || str(row.title) || str(row.title_en),
        subtitle: useKo ? str(row.subtitle_ko) : str(row.subtitle_en),
        description: useKo ? str(row.description_ko) : str(row.description_en),
      }),
    };
  } else {
    const useKo = !!str(row.title) || !str(row.title_en);
    src = {
      lang: useKo ? "ko" : "en",
      fields: compact({
        title: useKo ? str(row.title) : str(row.title_en),
        description: useKo ? str(row.description) : str(row.description_en),
      }),
    };
  }
  return Object.keys(src.fields).length ? src : null;
}

/** 원문 해시 — 칸 순서를 고정. 판도 넣는다 */
export function listMetaHash(src: ListMetaSource): string {
  const keys = Object.keys(src.fields).sort() as (keyof ListItemFields)[];
  const payload = JSON.stringify(["meta", LIST_META_VERSION, src.lang, keys.map((k) => [k, src.fields[k]])]);
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/** 화면 글(UI 문자열) 묶음 줄의 source_id — 언어마다 한 줄(본문 안 라벨의 'ui' 와 같은 고정값, 종류로 나뉜다) */
export const SITE_UI_SOURCE_ID = "00000000-0000-0000-0000-000000000000";

/** 사이트 내용 글(홈 글 · 카테고리 · 태그) 묶음 줄의 source_id — 화면 글(site_ui)과 같은 종류, 다른 고정값(lib/siteContent) */
export const SITE_CONTENT_SOURCE_ID = "00000000-0000-0000-0000-000000000001";

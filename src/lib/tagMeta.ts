/* ──────────────────────────────────────────────────────────────────────────
   Tag metadata helpers — site.config.tagDescriptions 의 다양한 legacy 포맷을
   하나의 normalized shape 로 변환 + 현재 언어 기준 표시 이름 fallback.

   저장 키 = canonical tag (post.tags 와 매칭, DB 변경 X).
   value 정규화 → { ko, en, description: { ko, en } }
     - ko/en: 표시 이름 override. 비어있으면 canonical key 로 fallback.
     - description.ko/en: bilingual 설명.
   ────────────────────────────────────────────────────────────────────────── */

import type { LocalizedText } from "@/types/common";

export interface TagMeta {
  ko: string;
  en: string;
  description: LocalizedText;
}

export type StoredTagMeta =
  | string
  | LocalizedText
  | { ko?: string; en?: string; description?: LocalizedText };

/** 다양한 legacy 포맷 모두 받아서 normalized shape 반환. */
export function normalizeTagMeta(d: StoredTagMeta | undefined): TagMeta {
  if (!d) return { ko: "", en: "", description: { ko: "", en: "" } };
  if (typeof d === "string") {
    // legacy 단일 설명 → description.ko 로
    return { ko: "", en: "", description: { ko: d, en: "" } };
  }
  // object 형식. description 필드가 있으면 new format, 없으면 legacy bilingual desc.
  if ("description" in d && d.description && typeof d.description === "object") {
    return {
      ko: d.ko ?? "",
      en: d.en ?? "",
      description: { ko: d.description.ko ?? "", en: d.description.en ?? "" },
    };
  }
  // legacy: { ko, en } 가 곧 설명이었음
  return {
    ko: "",
    en: "",
    description: {
      ko: (d as { ko?: string }).ko ?? "",
      en: (d as { en?: string }).en ?? "",
    },
  };
}

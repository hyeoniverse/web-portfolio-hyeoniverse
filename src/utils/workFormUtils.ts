import type { Work, WorkFormData } from "@/types/work";

export function workToFormData(work: Work): WorkFormData {
  return {
    slug: work.slug || "",
    title: work.title,
    title_en: work.title_en || "",
    subtitle_ko: work.subtitle_ko,
    subtitle_en: work.subtitle_en,
    categories_ko: Array.isArray(work.categories_ko) ? work.categories_ko : [],
    categories_en: Array.isArray(work.categories_en) ? work.categories_en : [],
    nature_ko: work.nature_ko || "",
    nature_en: work.nature_en || "",
    year: work.year,
    description_ko: work.description_ko,
    description_en: work.description_en,
    role_ko: work.role_ko || "",
    role_en: work.role_en || "",
    tech: work.tech,
    image: work.image,
    landing: work.landing ?? null,
    live_url: work.live_url,
    github_url: work.github_url,
    published: work.published,
    sort_order: work.sort_order || 1,
    is_pinned: work.is_pinned ?? false,
    scheduled_at: work.scheduled_at ?? null,
  };
}

export const defaultForm: WorkFormData = {
  slug: "",
  title: "",
  title_en: "",
  subtitle_ko: "",
  subtitle_en: "",
  categories_ko: [],
  categories_en: [],
  nature_ko: "",
  nature_en: "",
  // 신규 work 는 "기간으로 표시" default — JSON 으로 end:"" 까지 포함시켜 PeriodPicker hasRange 가 true 가 되게 함.
  // 사용자가 end 를 채우지 않고 저장하면 serializePeriodAsYear 가 plain "2026" 으로 다시 직렬화함 (DB 깨끗).
  year: JSON.stringify({ start: new Date().getFullYear().toString(), end: "", format: "year" }),
  description_ko: "",
  description_en: "",
  role_ko: "",
  role_en: "",
  tech: [],
  image: "",
  landing: null,
  live_url: "",
  github_url: "",
  published: false,
  sort_order: 0, // 새 작업물 — 0 이면 맨 뒤(정렬 목록 표시·저장 모두, #873)
  is_pinned: false,
  scheduled_at: null,
};

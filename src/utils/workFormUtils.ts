import type { Work, WorkFormData } from "@/types/work";

/** legacy 3-section work (overview/challenge/solution) 를 단일 마크다운 content 로 직렬화 */
function assembleContent(work: Work, lang: "ko" | "en"): string {
  const overview = lang === "ko" ? work.overview_ko : work.overview_en;
  const challenge = lang === "ko" ? work.challenge_ko : work.challenge_en;
  const solution = lang === "ko" ? work.solution_ko : work.solution_en;
  if (!overview && !challenge && !solution) return "";

  const parts: string[] = [];
  if (overview) {
    parts.push(`## Overview\n\n${overview}`);
    if (work.overview_image) parts.push(`\n\n![Overview](${work.overview_image})`);
  }
  if (challenge) {
    parts.push(`## Challenges\n\n${challenge}`);
    if (work.challenge_image) parts.push(`\n\n![Challenges](${work.challenge_image})`);
  }
  if (solution) {
    parts.push(`## Solutions\n\n${solution}`);
    if (work.solution_image) parts.push(`\n\n![Solutions](${work.solution_image})`);
  }
  return parts.join("\n\n");
}

export function workToFormData(work: Work): WorkFormData {
  const contentKo = work.content_ko || assembleContent(work, "ko");
  const contentEn = work.content_en || assembleContent(work, "en");

  return {
    slug: work.slug || "",
    title: work.title,
    subtitle_ko: work.subtitle_ko,
    subtitle_en: work.subtitle_en,
    categories_ko: Array.isArray(work.categories_ko) ? work.categories_ko : [],
    categories_en: Array.isArray(work.categories_en) ? work.categories_en : [],
    nature_ko: work.nature_ko || "",
    nature_en: work.nature_en || "",
    year: work.year,
    description_ko: work.description_ko,
    description_en: work.description_en,
    role_ko: work.role_ko,
    role_en: work.role_en,
    contributions_ko: work.contributions_ko ?? {},
    contributions_en: work.contributions_en ?? {},
    tech: work.tech,
    tech_notes: work.tech_notes ?? {},
    image: work.image,
    content_ko: contentKo,
    content_en: contentEn,
    content_type: work.content_type || "markdown",
    team_members: work.team_members ?? [],
    gallery: work.gallery,
    live_url: work.live_url,
    github_url: work.github_url,
    published: work.published,
    sort_order: work.sort_order || 1,
    scheduled_at: work.scheduled_at ?? null,
    related_post_ids: [],
  };
}

export const defaultForm: WorkFormData = {
  slug: "",
  title: "",
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
  contributions_ko: {},
  contributions_en: {},
  tech: [],
  tech_notes: {},
  image: "",
  content_ko: "",
  content_en: "",
  content_type: "markdown",
  team_members: [],
  gallery: [],
  live_url: "",
  github_url: "",
  published: false,
  sort_order: 1,
  scheduled_at: null,
  related_post_ids: [],
};

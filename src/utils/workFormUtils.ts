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
    role_ko: work.role_ko,
    role_en: work.role_en,
    contributions_ko: work.contributions_ko ?? {},
    contributions_en: work.contributions_en ?? {},
    tech: work.tech,
    tech_notes: work.tech_notes ?? {},
    image: work.image,
    icon: work.icon ?? "",
    content_ko: contentKo,
    content_en: contentEn,
    content_type: work.content_type || "markdown",
    team_members: work.team_members ?? [],
    gallery: work.gallery,
    gallery_notes: work.gallery_notes ?? {},
    live_url: work.live_url,
    github_url: work.github_url,
    published: work.published,
    sort_order: work.sort_order || 1,
    is_pinned: work.is_pinned ?? false,
    scheduled_at: work.scheduled_at ?? null,
    related_post_ids: [],
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
  contributions_ko: {},
  contributions_en: {},
  tech: [],
  tech_notes: {},
  image: "",
  icon: "",
  content_ko: "",
  content_en: "",
  content_type: "richtext",
  team_members: [],
  gallery: [],
  gallery_notes: {},
  live_url: "",
  github_url: "",
  published: false,
  sort_order: 0, // 새 작업물 — 0 이면 맨 뒤(정렬 목록 표시·저장 모두, #873)
  is_pinned: false,
  scheduled_at: null,
  related_post_ids: [],
};

/** 소유자(본인) 계정에 연결된 팀원의 author_id — resolvePostAuthors 의 OWNER_AUTHOR_ID 와 같다 */
const OWNER_ID = "owner";

/**
 * 작업물의 "내 역할·담당 업무"(role_*, contributions_*)는 팀원 목록의 본인 항목이 기준이다.
 * 편집기에는 따로 적는 칸이 없고, 저장·미리보기 때 본인 팀원 값으로 채운다 — 목록 카드·상세 정보 칸이 이 값을 읽는다.
 * 본인 팀원이 없으면(직접 뺀 경우) 원래 값을 그대로 둔다.
 */
export function syncOwnerRole(form: WorkFormData): WorkFormData {
  const owner = form.team_members.find((m) => m.author_id === OWNER_ID);
  if (!owner) return form;
  return {
    ...form,
    role_ko: owner.role_ko ?? "",
    role_en: owner.role_en ?? "",
    contributions_ko: owner.contributions_ko ?? {},
    contributions_en: owner.contributions_en ?? {},
  };
}

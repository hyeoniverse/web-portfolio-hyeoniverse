import type { Work, WorkFormData } from "@/types/work";

export function workToFormData(work: Work): WorkFormData {
  let contentKo = work.content_ko || "";
  let contentEn = work.content_en || "";

  if (!contentKo && (work.overview_ko || work.challenge_ko || work.solution_ko)) {
    const parts: string[] = [];
    if (work.overview_ko) {
      parts.push(`## Overview\n\n${work.overview_ko}`);
      if (work.overview_image) parts.push(`\n\n![Overview](${work.overview_image})`);
    }
    if (work.challenge_ko) {
      parts.push(`## Challenges\n\n${work.challenge_ko}`);
      if (work.challenge_image) parts.push(`\n\n![Challenges](${work.challenge_image})`);
    }
    if (work.solution_ko) {
      parts.push(`## Solutions\n\n${work.solution_ko}`);
      if (work.solution_image) parts.push(`\n\n![Solutions](${work.solution_image})`);
    }
    contentKo = parts.join("\n\n");
  }

  if (!contentEn && (work.overview_en || work.challenge_en || work.solution_en)) {
    const parts: string[] = [];
    if (work.overview_en) {
      parts.push(`## Overview\n\n${work.overview_en}`);
      if (work.overview_image) parts.push(`\n\n![Overview](${work.overview_image})`);
    }
    if (work.challenge_en) {
      parts.push(`## Challenges\n\n${work.challenge_en}`);
      if (work.challenge_image) parts.push(`\n\n![Challenges](${work.challenge_image})`);
    }
    if (work.solution_en) {
      parts.push(`## Solutions\n\n${work.solution_en}`);
      if (work.solution_image) parts.push(`\n\n![Solutions](${work.solution_image})`);
    }
    contentEn = parts.join("\n\n");
  }

  return {
    number: work.number,
    title: work.title,
    subtitle_ko: work.subtitle_ko,
    subtitle_en: work.subtitle_en,
    category_ko: work.category_ko,
    category_en: work.category_en,
    year: work.year,
    description_ko: work.description_ko,
    description_en: work.description_en,
    role_ko: work.role_ko,
    role_en: work.role_en,
    tech: work.tech,
    image: work.image,
    size: work.size,
    content_ko: contentKo,
    content_en: contentEn,
    content_type: work.content_type || "markdown",
    team_members: work.team_members ?? [],
    gallery: work.gallery,
    live_url: work.live_url,
    github_url: work.github_url,
    published: work.published,
    sort_order: work.sort_order || 1,
  };
}

export const defaultForm: WorkFormData = {
  number: "",
  title: "",
  subtitle_ko: "",
  subtitle_en: "",
  category_ko: "",
  category_en: "",
  year: new Date().getFullYear().toString(),
  description_ko: "",
  description_en: "",
  role_ko: "",
  role_en: "",
  tech: [],
  image: "",
  size: "medium",
  content_ko: "",
  content_en: "",
  content_type: "markdown",
  team_members: [],
  gallery: [],
  live_url: "",
  github_url: "",
  published: false,
  sort_order: 1,
};

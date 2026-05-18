import type { Project, CardSize, LocalizedText } from "@/data/projects";

export interface TeamMember {
  name: string;
  role_ko: string;
  role_en: string;
  url?: string;
}

/** DB row shape — flat columns for ko/en */
export interface Work {
  id: string;
  number: string;
  title: string;
  subtitle_ko: string;
  subtitle_en: string;
  category_ko: string;
  category_en: string;
  year: string;
  description_ko: string;
  description_en: string;
  role_ko: string;
  role_en: string;
  tech: string[];
  image: string;
  size: CardSize;
  /* ── Detail content (single content field) ── */
  content_ko: string;
  content_en: string;
  content_type: "markdown" | "richtext";
  /* ── Legacy separate sections (backward compat) ── */
  overview_ko: string;
  overview_en: string;
  overview_image: string;
  challenge_ko: string;
  challenge_en: string;
  challenge_image: string;
  solution_ko: string;
  solution_en: string;
  solution_image: string;
  team_members: TeamMember[];
  gallery: string[];
  live_url: string;
  github_url: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  /** 휴지통 자동 영구삭제 ISO timestamp */
  purge_after?: string | null;
  summary_ko: string;
  summary_en: string;
  /** ISO timestamp — null/없음=즉시 발행, 미래=cron 이 도달 시 published=true */
  scheduled_at?: string | null;
  related_post_ids?: string[];
}

/** Editor form — uses content_ko/en only (no legacy fields) */
export interface WorkFormData {
  number: string;
  title: string;
  subtitle_ko: string;
  subtitle_en: string;
  category_ko: string;
  category_en: string;
  year: string;
  description_ko: string;
  description_en: string;
  role_ko: string;
  role_en: string;
  tech: string[];
  image: string;
  size: CardSize;
  content_ko: string;
  content_en: string;
  content_type: "markdown" | "richtext";
  team_members: TeamMember[];
  gallery: string[];
  live_url: string;
  github_url: string;
  published: boolean;
  sort_order: number;
  scheduled_at?: string | null;
  /** 양방향 연결: 이 작품이 참조하는 글 ID 목록 */
  related_post_ids?: string[];
}

/**
 * Combine legacy overview/challenge/solution into single content.
 * Used when migrating old data that has separate section fields.
 */
function buildLegacyContent(
  overview: string,
  challenge: string,
  solution: string,
  overviewImage?: string,
  challengeImage?: string,
  solutionImage?: string,
): string {
  const parts: string[] = [];

  if (overview) {
    parts.push(`## Overview\n\n${overview}`);
    if (overviewImage) parts.push(`\n\n![Overview](${overviewImage})`);
  }
  if (challenge) {
    parts.push(`## Challenges\n\n${challenge}`);
    if (challengeImage) parts.push(`\n\n![Challenges](${challengeImage})`);
  }
  if (solution) {
    parts.push(`## Solutions\n\n${solution}`);
    if (solutionImage) parts.push(`\n\n![Solutions](${solutionImage})`);
  }

  return parts.join("\n\n");
}

/** Convert DB Work row → front-end Project shape */
export function workToProject(w: Work): Project {
  const loc = (ko: string, en: string): LocalizedText => ({ ko, en });

  // Use content_ko/en if present; otherwise combine legacy fields
  const contentKo = w.content_ko ||
    buildLegacyContent(w.overview_ko, w.challenge_ko, w.solution_ko, w.overview_image, w.challenge_image, w.solution_image);
  const contentEn = w.content_en ||
    buildLegacyContent(w.overview_en, w.challenge_en, w.solution_en, w.overview_image, w.challenge_image, w.solution_image);

  const teamMembers = (w.team_members ?? []).map((m) => ({
    name: m.name,
    role: loc(m.role_ko, m.role_en),
    url: m.url || undefined,
  }));

  return {
    id: w.id,
    number: w.number,
    title: w.title,
    subtitle: loc(w.subtitle_ko, w.subtitle_en),
    category: loc(w.category_ko, w.category_en),
    year: w.year,
    description: loc(w.description_ko, w.description_en),
    role: loc(w.role_ko, w.role_en),
    tech: w.tech,
    image: w.image,
    size: w.size,
    content: loc(contentKo, contentEn),
    contentType: w.content_type || "markdown",
    teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
    gallery: w.gallery,
    liveUrl: w.live_url || undefined,
    githubUrl: w.github_url || undefined,
    summary: (w.summary_ko || w.summary_en) ? loc(w.summary_ko, w.summary_en) : undefined,
  };
}

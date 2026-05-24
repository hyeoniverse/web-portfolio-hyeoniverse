import type { Project, CardSize, LocalizedText } from "@/data/projects";

export interface TeamMember {
  /** ko display name (필수) */
  name: string;
  /** en display name (선택 — 없으면 name 으로 fallback) */
  name_en?: string;
  role_ko: string;
  role_en: string;
  url?: string;
  email?: string;
  /** 명시적으로 지정한 프사 URL. 없으면 url/email 에서 자동 derive */
  avatar_url?: string;
  /** 기여 항목 — 역할별로 그룹화 (key: 역할 이름, value: 작업 항목 배열). ko/en 독립 */
  contributions_ko?: Record<string, string[]>;
  contributions_en?: Record<string, string[]>;
}

/** DB row shape — flat columns for ko/en */
export interface Work {
  id: string;
  slug: string;
  number: string;
  title: string;
  subtitle_ko: string;
  subtitle_en: string;
  /** 결과물 형태 — 웹앱·라이브러리·도구 등. 여러 개 가능 (multi-select) */
  categories_ko: string[];
  categories_en: string[];
  /** 제작 동기 — 토이 프로젝트 / 클론 코딩 / 사이드 / 학교 / 공모전 / 오픈소스 / 스터디 등 (단일) */
  nature_ko: string;
  nature_en: string;
  year: string;
  description_ko: string;
  description_en: string;
  role_ko: string;
  role_en: string;
  /** 작업 내용 — 본인의 역할별 그룹. key: 역할 이름, value: 작업 항목 배열. ko/en 독립 */
  contributions_ko?: Record<string, string[]>;
  contributions_en?: Record<string, string[]>;
  tech: string[];
  /** 기술별 메모 — 기술마다 ko/en 단일 설명 (TagNotesEditor 와 동일 패턴) */
  tech_notes?: Record<string, { ko: string; en: string }>;
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
  slug: string;
  title: string;
  subtitle_ko: string;
  subtitle_en: string;
  categories_ko: string[];
  categories_en: string[];
  nature_ko: string;
  nature_en: string;
  year: string;
  description_ko: string;
  description_en: string;
  role_ko: string;
  role_en: string;
  contributions_ko: Record<string, string[]>;
  contributions_en: Record<string, string[]>;
  tech: string[];
  tech_notes: Record<string, { ko: string; en: string }>;
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
    name_en: m.name_en || undefined,
    role: loc(m.role_ko, m.role_en),
    url: m.url || undefined,
    email: m.email || undefined,
    avatar_url: m.avatar_url || undefined,
    contributions: {
      ko: m.contributions_ko ?? {},
      en: m.contributions_en ?? {},
    },
  }));

  const hasContributions =
    (w.contributions_ko && Object.keys(w.contributions_ko).length > 0) ||
    (w.contributions_en && Object.keys(w.contributions_en).length > 0);

  return {
    id: w.id,
    slug: w.slug || "",
    number: w.number,
    title: w.title,
    subtitle: loc(w.subtitle_ko, w.subtitle_en),
    categories: {
      ko: w.categories_ko ?? [],
      en: w.categories_en ?? [],
    },
    // legacy 단일 category — categories[0] 으로 fallback. 신규 호출부는 categories 사용 권장
    category: loc(w.categories_ko?.[0] ?? "", w.categories_en?.[0] ?? ""),
    nature: (w.nature_ko || w.nature_en) ? loc(w.nature_ko, w.nature_en) : undefined,
    year: w.year,
    description: loc(w.description_ko, w.description_en),
    role: loc(w.role_ko, w.role_en),
    contributions: hasContributions
      ? {
          ko: w.contributions_ko ?? {},
          en: w.contributions_en ?? {},
        }
      : undefined,
    tech: w.tech,
    tech_notes: w.tech_notes && Object.keys(w.tech_notes).length > 0 ? w.tech_notes : undefined,
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

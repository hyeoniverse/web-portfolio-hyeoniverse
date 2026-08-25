import type { Project, LocalizedText } from "@/data/projects";
import { formatProjectNumber } from "@/utils/formatProjectNumber";
import { getCardSize } from "@/utils/getCardSize";

export interface TeamMember {
  /**
   * 연결된 사이트 저자 프로필 id (site.config 의 authors).
   *
   * 이 값이 있으면 그 계정은 **이 작업물의 편집자**가 된다 — 작업물에는 author_ids 가 없어
   * 소유권을 팀원 목록으로 표현한다. 서버의 canEditWork · RLS 의 can_edit_work 가 같은 규칙을 쓴다.
   * 외부 협업자처럼 사이트 계정이 없는 사람은 이 값 없이 이름만 적는다.
   */
  author_id?: string;
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

/** DB row shape — flat columns for ko/en.
 *  표시 번호 (#01 등) 는 sort_order 에서 derive — 별도 number 컬럼 없음 (single source of truth). */
export interface Work {
  id: string;
  slug: string;
  title: string;      // 국문/기본 제목
  title_en: string;   // 영문 제목 (빈 값이면 title 로 fallback)
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
  tech_notes?: Record<string, LocalizedText>;
  image: string;
  /** 페이지 아이콘(이모지 또는 이미지 URL) — 커버 배너 상단 (posts.icon 미러) */
  icon: string;
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
  related_series_ids?: string[];
}

/** Editor form — uses content_ko/en only (no legacy fields).
 *  표시 번호는 sort_order 에서 derive, 별도 number 필드 없음. */
export interface WorkFormData {
  slug: string;
  title: string;
  title_en: string;
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
  tech_notes: Record<string, LocalizedText>;
  image: string;
  /** 페이지 아이콘(이모지 또는 이미지 URL) — 커버 배너 상단 (posts.icon 미러) */
  icon: string;
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
  /** 관련 시리즈 ID 목록 */
  related_series_ids?: string[];
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

/**
 * Convert editor form → front-end Project shape (preview 용).
 * WorkFormData 에 없는 DB 전용 필드(id/slug/타임스탬프/legacy 섹션 등)는
 * 빈 값/기본값으로 채운 뒤 workToProject 로 변환 — 변환 로직 재사용.
 */
export function workFormToProject(form: WorkFormData): Project {
  const work: Work = {
    id: "preview",
    slug: form.slug || "",
    title: form.title,
    title_en: form.title_en,
    subtitle_ko: form.subtitle_ko,
    subtitle_en: form.subtitle_en,
    categories_ko: form.categories_ko,
    categories_en: form.categories_en,
    nature_ko: form.nature_ko,
    nature_en: form.nature_en,
    year: form.year,
    description_ko: form.description_ko,
    description_en: form.description_en,
    role_ko: form.role_ko,
    role_en: form.role_en,
    contributions_ko: form.contributions_ko,
    contributions_en: form.contributions_en,
    tech: form.tech,
    tech_notes: form.tech_notes,
    image: form.image,
    icon: form.icon,
    content_ko: form.content_ko,
    content_en: form.content_en,
    content_type: form.content_type,
    // legacy 분리 섹션 — 폼엔 없음 (content_ko/en 사용하므로 빈 값)
    overview_ko: "",
    overview_en: "",
    overview_image: "",
    challenge_ko: "",
    challenge_en: "",
    challenge_image: "",
    solution_ko: "",
    solution_en: "",
    solution_image: "",
    team_members: form.team_members,
    gallery: form.gallery,
    live_url: form.live_url,
    github_url: form.github_url,
    published: form.published,
    sort_order: form.sort_order,
    created_at: "",
    updated_at: "",
    summary_ko: "",
    summary_en: "",
    scheduled_at: form.scheduled_at,
    related_post_ids: form.related_post_ids,
    related_series_ids: form.related_series_ids,
  };
  return workToProject(work);
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
    // display number — DB sort_order 에서 derive (단일 source of truth, 화면 표시 번호 = 정렬 순서)
    number: formatProjectNumber(w.sort_order),
    // 제목은 필수(항상 표시) — 한쪽만 있으면 반대 언어로 fallback (T 는 빈 문자열을 fallback 안 함)
    title: loc(w.title || w.title_en, w.title_en || w.title),
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
    icon: w.icon,
    // card size (Flow 레이아웃) — sort_order 에서 cycle derive (single source of truth)
    size: getCardSize(w.sort_order),
    content: loc(contentKo, contentEn),
    contentType: w.content_type || "markdown",
    teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
    gallery: w.gallery,
    liveUrl: w.live_url || undefined,
    githubUrl: w.github_url || undefined,
    summary: (w.summary_ko || w.summary_en) ? loc(w.summary_ko, w.summary_en) : undefined,
  };
}

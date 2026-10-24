import type { Project, LocalizedText } from "@/data/projects";
import { formatProjectNumber } from "@/utils/formatProjectNumber";
import { getCardSize } from "@/utils/getCardSize";

/** DB row shape — flat columns for ko/en.
 *  표시 번호 (#01 등) 는 sort_order 에서 derive — 별도 number 컬럼 없음 (single source of truth).
 *  상세는 랜딩(landing)으로 그린다 — 본문 · 갤러리 · 팀원은 posts '프로젝트' 글로 옮겼다. */
export interface Work {
  id: string;
  slug: string;
  title: string;      // 국문/기본 제목
  /** 원문 칸(ko)이 쓰인 언어(#1425) — 비어 있으면 ko */
  source_lang?: string | null;
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
  /** 내 역할 — 랜딩 머리 · 목록 카드에 나온다 */
  role_ko: string;
  role_en: string;
  tech: string[];
  image: string;
  /** 작성자 — site.config authors 의 id. 글(posts.author_ids)처럼 편집 권한을 정한다(canEditWork · RLS can_edit_work) */
  author_ids?: string[];
  /** 랜딩 페이지 데이터(lib/workLanding) — 비면 저장소의 기본 데이터 · 카드 정보로 만든 기본 랜딩 */
  landing?: unknown;
  live_url: string;
  github_url: string;
  published: boolean;
  sort_order: number;
  /** 홈 Selected Works 랭킹 신호 (posts 미러) — 핀 · 조회수 · 좋아요 */
  is_pinned: boolean;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  /** 휴지통 자동 영구삭제 ISO timestamp */
  purge_after?: string | null;
  /** ISO timestamp — null/없음=즉시 발행, 미래=cron 이 도달 시 published=true */
  scheduled_at?: string | null;
}

/** Editor form — 표시 번호는 sort_order 에서 derive, 별도 number 필드 없음. */
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
  tech: string[];
  image: string;
  /** 랜딩 페이지 데이터(lib/workLanding) — null 이면 저장소 기본 데이터 · 카드 정보로 만든 기본 랜딩 */
  landing: unknown;
  live_url: string;
  github_url: string;
  published: boolean;
  sort_order: number;
  /** 홈 Selected Works 핀 — 켜면 랭킹 최상단 (조회수·좋아요는 읽기전용이라 폼에 없음) */
  is_pinned: boolean;
  scheduled_at?: string | null;
}

/**
 * Convert editor form → front-end Project shape (preview 용).
 * WorkFormData 에 없는 DB 전용 필드(id/slug/타임스탬프 등)는 빈 값/기본값으로 채운 뒤 workToProject 로 변환.
 */
export function workFormToProject(form: WorkFormData): Project {
  const work: Work = {
    ...form,
    id: "preview",
    slug: form.slug || "",
    view_count: 0,
    like_count: 0,
    created_at: "",
    updated_at: "",
  };
  return workToProject(work);
}

/** Convert DB Work row → front-end Project shape */
export function workToProject(w: Work): Project {
  const loc = (ko: string, en: string): LocalizedText => ({ ko, en });
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
    tech: w.tech,
    image: w.image,
    // card size (Flow 레이아웃) — sort_order 에서 cycle derive (single source of truth)
    size: getCardSize(w.sort_order),
    landing: w.landing ?? undefined,
    liveUrl: w.live_url || undefined,
    githubUrl: w.github_url || undefined,
  };
}

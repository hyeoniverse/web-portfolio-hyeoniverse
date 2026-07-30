import type { LocalizedText } from "@/types/common";

/** 시리즈 제목(ko/en) 최대 길이 — UI 입력·폼 검사·API·DB CHECK 전 레이어 공통 */
export const SERIES_TITLE_MAX = 80;

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  content_type: "markdown" | "richtext";
  excerpt: string;
  cover_image: string;
  /** 커버 세로 위치 % (object-position, 0~100). 기본 50 */
  cover_position?: number;
  /** 커버 확대 배율 (scale, 1~2.5). 기본 1 */
  cover_zoom?: number;
  /** 페이지 아이콘(이모지 또는 이미지 URL) — 커버 배너 상단 */
  icon?: string;
  tags: string[];
  /** 태그별 설명 — 태그당 단일 ko/en 쌍 (Record<tag, {ko,en}>) */
  tag_notes?: Record<string, LocalizedText>;
  category: string;
  is_pinned: boolean;
  published: boolean;
  language: "ko" | "en";
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  /** 낙관적 동시성 제어 버전 — 저장 시 baseVersion 으로 전송 */
  version?: number;
  title_en: string;
  content_en: string;
  excerpt_en: string;
  post_number: number;
  series_id: string | null;
  series_order: number;
  series?: { title: string; title_en: string } | null;
  summary_ko: string;
  summary_en: string;
  github_url: string;
  deleted_at?: string | null;
  /** 휴지통 자동 영구삭제 ISO timestamp — cron 이 도달 시 hard delete */
  purge_after?: string | null;
  /** ISO timestamp — null/없음=즉시 발행, 미래=cron 이 도달 시 published=true */
  scheduled_at?: string | null;
  related_work_ids?: string[];
  /** 작성자 id 목록 — site.config authors 의 id 참조. 비어있으면 기본 작성자로 표시 */
  author_ids?: string[];
}

export interface PostFormData {
  title: string;
  slug: string;
  content: string;
  content_type: "markdown" | "richtext";
  excerpt: string;
  cover_image: string;
  /** 커버 세로 위치 % (object-position, 0~100). 기본 50 */
  cover_position?: number;
  /** 커버 확대 배율 (scale, 1~2.5). 기본 1 */
  cover_zoom?: number;
  /** 페이지 아이콘(이모지 또는 이미지 URL) */
  icon: string;
  tags: string[];
  /** 태그별 설명 — 태그당 단일 ko/en 쌍 */
  tag_notes: Record<string, LocalizedText>;
  category: string;
  is_pinned: boolean;
  published: boolean;
  language: "ko" | "en";
  title_en: string;
  content_en: string;
  excerpt_en: string;
  series_id: string | null;
  series_order: number;
  github_url: string;
  scheduled_at?: string | null;
  /** 양방향 연결: 이 글이 참조하는 작품 ID 목록 (저장 시 post_work_relations 동기화) */
  related_work_ids?: string[];
  /** 작성자 id 목록 — site.config authors 의 id 참조 */
  author_ids?: string[];
}

export interface Series {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image: string;
  category: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  title_en: string;
  description_en: string;
  sort_order: number;
  post_count?: number;
  /** 소속 글들의 cover 이미지 (모자이크 미리보기 용, 최대 4개) */
  thumbs?: string[];
  /** 소속 글들의 미리보기 (deck hover 용, 최대 4개) — title + cover + 메타 + slug (deck 클릭 시 글로 이동) */
  previews?: {
    id: string;
    slug: string;
    title: string;
    title_en: string | null;
    cover_image: string | null;
    created_at: string;
    excerpt: string | null;
    excerpt_en: string | null;
  }[];
  /** cover/thumbs 둘 다 없을 때 Unsplash 에서 자동 가져온 cover URL */
  auto_cover_url?: string;
}

/** 시리즈 내 포스트 항목 (순서 관리용) */
export interface SeriesPostItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  series_order: number;
  series_id?: string | null;
  post_number?: number;
}

export interface Comment {
  id: string;
  post_id?: string;
  work_id?: string;
  parent_id: string | null;
  nickname: string;
  content: string;
  is_admin: boolean;
  is_deleted?: boolean;
  /** 'self' | 'admin' — tombstone 표시 주체 */
  deleted_by?: "self" | "admin" | null;
  like_count: number;
  created_at: string;
  updated_at?: string | null;
  /** 익명 commenter 식별 hash — 본인이 단 댓글 표시 / 본인만 수정·삭제 권한 체크에 사용 */
  commenter_hash?: string;
  replies?: Comment[];
}


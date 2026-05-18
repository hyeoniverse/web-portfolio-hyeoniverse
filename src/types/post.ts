export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  content_type: "markdown" | "richtext";
  excerpt: string;
  cover_image: string;
  tags: string[];
  category: string;
  is_pinned: boolean;
  published: boolean;
  language: "ko" | "en";
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
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
}

export interface PostFormData {
  title: string;
  slug: string;
  content: string;
  content_type: "markdown" | "richtext";
  excerpt: string;
  cover_image: string;
  tags: string[];
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
  /** 소속 글들의 미리보기 (deck hover 용, 최대 4개) — title + cover + 메타 */
  previews?: {
    id: string;
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


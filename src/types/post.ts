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
  post_count?: number;
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
  replies?: Comment[];
}

export interface CommentFormData {
  post_id?: string;
  work_id?: string;
  parent_id?: string;
  nickname: string;
  password: string;
  content: string;
}

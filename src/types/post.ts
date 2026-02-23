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
  series_id: string | null;
  series_order: number;
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

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  nickname: string;
  content: string;
  is_admin: boolean;
  created_at: string;
  replies?: Comment[];
}

export interface CommentFormData {
  post_id: string;
  parent_id?: string;
  nickname: string;
  password: string;
  content: string;
}

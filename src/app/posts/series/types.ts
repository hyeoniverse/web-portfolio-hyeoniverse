import type { Series } from "@/types/post";

/** 시리즈 인덱스 한 항목 — SSR 이 글 수와 첫 글 커버를 붙여 준다 */
export type SeriesEntry = Series & { post_count: number; first_cover: string | null };

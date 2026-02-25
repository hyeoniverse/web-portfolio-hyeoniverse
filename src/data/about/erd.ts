import type { ErdTable, ErdRelation, ErdDesignNote } from "./types";

export const erdTables: ErdTable[] = [
  {
    name: "posts",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "title / title_en", type: "TEXT" },
      { name: "slug", type: "TEXT" },
      { name: "category", type: "TEXT" },
      { name: "series_id", type: "UUID", fk: "series.id" },
      { name: "published", type: "BOOL" },
      { name: "like_count", type: "INT" },
    ],
  },
  {
    name: "series",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "title / title_en", type: "TEXT" },
      { name: "slug", type: "TEXT" },
      { name: "category", type: "TEXT" },
    ],
  },
  {
    name: "comments",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "post_id", type: "UUID", fk: "posts.id" },
      { name: "parent_id", type: "UUID" },
      { name: "nickname", type: "TEXT" },
      { name: "password", type: "TEXT" },
    ],
  },
  {
    name: "likes",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "target_type", type: "TEXT" },
      { name: "target_id", type: "TEXT" },
      { name: "ip", type: "TEXT" },
    ],
  },
  {
    name: "works",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "title", type: "TEXT" },
      { name: "category_ko / _en", type: "TEXT" },
      { name: "tech", type: "TEXT[]" },
      { name: "published", type: "BOOL" },
    ],
  },
  {
    name: "site_settings",
    columns: [
      { name: "id", type: "TEXT", pk: true },
      { name: "config", type: "JSONB" },
      { name: "updated_at", type: "TIMESTAMPTZ" },
    ],
  },
];

export const erdRelations: ErdRelation[] = [
  {
    from: "posts",
    fromField: "series_id",
    to: "series",
    toField: "id",
    label: "N:1",
  },
  {
    from: "comments",
    fromField: "post_id",
    to: "posts",
    toField: "id",
    label: "N:1",
  },
  {
    from: "likes",
    fromField: "target_id",
    to: "posts",
    toField: "id",
    label: "N:1",
  },
  {
    from: "likes",
    fromField: "target_id",
    to: "works",
    toField: "id",
    label: "N:1",
  },
];

export const erdDesignNotes: ErdDesignNote[] = [
  {
    title: {
      ko: "IP 기반 좋아요",
      en: "IP-Based Likes",
    },
    description: {
      ko: "로그인 없이 IP로 좋아요를 식별합니다. UNIQUE(target_type, target_id, ip) 제약으로 DB 레벨 중복 차단.",
      en: "Identify likes by IP without login. UNIQUE(target_type, target_id, ip) constraint for DB-level dedup.",
    },
  },
  {
    title: {
      ko: "다형성 좋아요",
      en: "Polymorphic Likes",
    },
    description: {
      ko: "target_type으로 Posts/Works를 구분하여 단일 likes 테이블로 관리합니다.",
      en: "Single likes table handles both Posts and Works via target_type discriminator.",
    },
  },
  {
    title: {
      ko: "JSONB 블롭 저장",
      en: "JSONB Blob Storage",
    },
    description: {
      ko: "프로필·사이트 설정은 깊이 중첩된 이중 언어 구조여서 JSONB 통째 저장이 유연합니다.",
      en: "Profile and site settings use deeply nested bilingual structures — JSONB blob is more flexible than individual columns.",
    },
  },
  {
    title: {
      ko: "동기화 컬럼",
      en: "Synced Column",
    },
    description: {
      ko: "posts.like_count를 별도 컬럼에 동기화하여 목록 조회 시 JOIN을 회피합니다.",
      en: "posts.like_count synced to a dedicated column to avoid JOINs on list queries.",
    },
  },
];

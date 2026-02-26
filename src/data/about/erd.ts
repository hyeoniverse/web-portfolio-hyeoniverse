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
      { name: "password_hash", type: "TEXT" },
      { name: "commenter_hash", type: "TEXT" },
    ],
  },
  {
    name: "likes",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "target_type", type: "TEXT CHECK" },
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
      ko: "통합 좋아요 테이블",
      en: "Unified Likes Table",
    },
    description: {
      ko: "모든 좋아요(포스트, 작업물, 댓글)를 단일 likes 테이블에서 target_type('post'|'work'|'post_comment'|'work_comment')으로 구분합니다. UNIQUE(target_type, target_id, ip) 하나로 전체 중복을 차단하고, 새 엔티티 추가 시 CHECK 값만 추가하면 됩니다.",
      en: "All likes (posts, works, comments) use a single likes table with target_type ('post'|'work'|'post_comment'|'work_comment'). One UNIQUE(target_type, target_id, ip) constraint handles all dedup, and adding new entities only requires a CHECK value.",
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
      ko: "선택적 카운트 캐싱",
      en: "Selective Count Caching",
    },
    description: {
      ko: "Posts만 목록에서 좋아요 수를 표시하므로 posts.like_count 캐시 컬럼에 동기화합니다. Works와 댓글은 상세 페이지에서만 조회하므로 실시간 COUNT(*) 쿼리로 충분합니다. 인덱스가 적용된 상태에서 수천 건까지 성능 차이가 없습니다.",
      en: "Only Posts display like counts in list views, so posts.like_count is synced as a cache column. Works and comments are viewed on detail pages only, so real-time COUNT(*) queries suffice. With indexes, there's no performance difference up to thousands of rows.",
    },
  },
  {
    title: {
      ko: "익명 댓글 이중 인증",
      en: "Anonymous Comment Dual Auth",
    },
    description: {
      ko: "commenter_hash(브라우저 UUID→SHA-256)로 같은 브라우저에서 자동 인증, password_hash(bcrypt)로 다른 기기에서 fallback 인증. 하나만 쓰면 브라우저 종속 또는 매번 입력이 필요하지만, 병행하면 UX와 보안 모두 확보됩니다.",
      en: "commenter_hash (browser UUID → SHA-256) enables auto-auth on the same browser; password_hash (bcrypt) provides fallback on other devices. Either alone has drawbacks — browser lock-in or constant input — but together they balance UX and security.",
    },
  },
  {
    title: {
      ko: "다층 입력 보안",
      en: "Multi-Layer Input Security",
    },
    description: {
      ko: "모든 공개 API에 UUID 포맷·길이 제한·제어문자 제거·이메일 검증을 적용. SQL Injection은 Supabase 파라미터화 쿼리, XSS는 React JSX 이스케이프로 방지합니다.",
      en: "All public APIs enforce UUID format, length limits, control char stripping, and email validation. SQL injection prevented by Supabase parameterized queries; XSS by React JSX escaping.",
    },
  },
];

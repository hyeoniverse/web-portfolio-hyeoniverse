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
      { name: "deleted_at", type: "TIMESTAMPTZ" },
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
  {
    name: "site_visits",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "ip", type: "TEXT" },
      { name: "date", type: "DATE" },
    ],
  },
  {
    name: "work_comments",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "work_id", type: "UUID", fk: "works.id" },
      { name: "parent_id", type: "UUID" },
      { name: "nickname", type: "TEXT" },
      { name: "password_hash", type: "TEXT" },
      { name: "commenter_hash", type: "TEXT" },
    ],
  },
  {
    name: "admin_notifications",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "type", type: "TEXT" },
      { name: "title / message", type: "TEXT" },
      { name: "metadata", type: "JSONB" },
      { name: "read", type: "BOOL" },
    ],
  },
  {
    name: "revisions",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "entity_type", type: "TEXT CHECK" },
      { name: "entity_id", type: "UUID" },
      { name: "snapshot", type: "JSONB" },
      { name: "title", type: "TEXT" },
      { name: "created_at", type: "TIMESTAMPTZ" },
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
  {
    from: "work_comments",
    fromField: "work_id",
    to: "works",
    toField: "id",
    label: "N:1",
  },
  {
    from: "likes",
    fromField: "target_id",
    to: "comments",
    toField: "id",
    label: "N:1",
  },
  {
    from: "likes",
    fromField: "target_id",
    to: "work_comments",
    toField: "id",
    label: "N:1",
  },
  {
    from: "revisions",
    fromField: "entity_id",
    to: "posts",
    toField: "id",
    label: "N:1",
  },
  {
    from: "revisions",
    fromField: "entity_id",
    to: "works",
    toField: "id",
    label: "N:1",
  },
];

export const erdDesignNotes: ErdDesignNote[] = [
  {
    title: {
      ko: "회원가입 없이 좋아요",
      en: "Likes Without Sign-Up",
    },
    tag: "UNIQUE (target_type, target_id, ip)",
    description: {
      ko: "likes 테이블에 (target_type, target_id, ip) 복합 UNIQUE 제약 조건을 걸어서, 같은 IP에서 같은 콘텐츠에 중복 좋아요를 DB 레벨에서 차단합니다. 애플리케이션 로직에 의존하지 않으므로, 동시 요청이 와도 race condition 없이 정합성이 유지됩니다.",
      en: "A composite UNIQUE constraint on (target_type, target_id, ip) in the likes table prevents duplicate likes at the database level. Since this doesn't rely on application logic, data integrity is maintained without race conditions even under concurrent requests.",
    },
    relatedTable: "likes",
  },
  {
    title: {
      ko: "좋아요 테이블 하나로 통합",
      en: "One Table for All Likes",
    },
    tag: "Polymorphic Association + CHECK",
    description: {
      ko: "posts, works, comments 각각에 좋아요 테이블을 만드는 대신, target_type 컬럼으로 구분하는 다형적 연관(Polymorphic Association) 패턴을 사용합니다. CHECK 제약으로 허용된 타입만 입력되고, 새 콘텐츠 유형 추가 시 CHECK 값만 확장하면 됩니다.",
      en: "Instead of creating separate like tables for posts, works, and comments, we use a Polymorphic Association pattern with a target_type discriminator. A CHECK constraint ensures only valid types are inserted, and adding a new content type only requires extending the CHECK values.",
    },
    relatedTable: "likes",
  },
  {
    title: {
      ko: "설정은 통째로 저장",
      en: "Settings Stored as a Bundle",
    },
    tag: "JSONB + Schema-on-Read",
    description: {
      ko: "site_settings의 config 컬럼을 JSONB 타입으로 두고, 한·영 구조를 포함한 전체 설정을 하나의 문서로 저장합니다. 스키마 변경 없이 필드를 자유롭게 추가/삭제할 수 있고, JSONB 연산자(->, ->>, @>)로 특정 키만 부분 조회도 가능합니다.",
      en: "The config column in site_settings uses JSONB type, storing the entire configuration—including bilingual structures—as a single document. Fields can be freely added or removed without schema migrations, and JSONB operators (->, ->>, @>) enable efficient partial queries on specific keys.",
    },
    relatedTable: "site_settings",
  },
  {
    title: {
      ko: "필요한 곳만 숫자 캐싱",
      en: "Count Caching Where It Matters",
    },
    tag: "Denormalization + RPC Trigger",
    description: {
      ko: "posts.like_count는 의도적 비정규화입니다. 목록 API에서 매번 COUNT 집계하면 N+1 문제가 생기므로, Supabase RPC 함수가 좋아요 토글 시 like_count를 원자적으로 증감합니다. works나 comments는 상세 페이지에서만 조회하므로 실시간 COUNT로 충분합니다.",
      en: "posts.like_count is an intentional denormalization. Running COUNT aggregation on every list API call would cause N+1 problems, so a Supabase RPC function atomically increments/decrements like_count on each toggle. Works and comments are only viewed on detail pages, where real-time COUNT is efficient enough.",
    },
    relatedTable: "posts",
  },
  {
    title: {
      ko: "비밀번호 없이도 내 댓글 인식",
      en: "Your Comments, Recognized Automatically",
    },
    tag: "SHA-256 Hash + Dual Auth",
    description: {
      ko: "댓글 작성 시 브라우저의 고유 식별자(닉네임 + User-Agent 등)를 SHA-256 해싱한 commenter_hash를 저장합니다. 같은 브라우저에서는 해시 비교로 자동 인식하고, 다른 기기에서는 password_hash(bcrypt)로 검증합니다. 이중 인증 경로로 편의성과 보안을 동시에 확보합니다.",
      en: "When posting a comment, a commenter_hash is stored by SHA-256 hashing the browser's unique identifier (nickname + User-Agent, etc.). On the same browser, automatic recognition works via hash comparison; on different devices, password_hash (bcrypt) provides verification. This dual authentication path achieves both convenience and security.",
    },
    relatedTable: "comments",
  },
  {
    title: {
      ko: "외부 입력 다중 검증",
      en: "Multi-Layer Input Validation",
    },
    tag: "Zod Schema + DOMPurify + RLS",
    description: {
      ko: "API Route에서 Zod 스키마로 타입·형식·길이를 1차 검증하고, HTML 입력은 DOMPurify로 XSS를 제거합니다. DB 레벨에서는 Supabase RLS(Row Level Security) 정책이 권한 밖 접근을 차단하여, 클라이언트→서버→DB 3계층 방어를 구성합니다.",
      en: "API Routes validate types, formats, and lengths using Zod schemas as the first layer. HTML inputs are sanitized with DOMPurify to prevent XSS. At the database level, Supabase RLS (Row Level Security) policies block unauthorized access, forming a three-layer defense across client → server → database.",
    },
    relatedTable: "comments",
  },
  {
    title: {
      ko: "리비전은 기기·탭 상관없이",
      en: "Revisions Across Devices & Tabs",
    },
    tag: "Polymorphic JSONB Snapshot",
    description: {
      ko: "revisions 테이블은 entity_type('post'|'work')으로 구분하는 다형적 구조입니다. 에디터 자동저장 시 폼 전체를 JSONB snapshot으로 저장하되, 이전과 동일하면 저장을 건너뛰어 중복을 방지합니다. 목록 조회 시에는 snapshot을 제외해 가볍게 가져오고, 상세 보기에서 카테고리·태그 등 메타 항목까지 diff 비교를 표시합니다. 엔티티당 50개 초과 시 자동 정리되고 개별 삭제도 가능합니다.",
      en: "The revisions table uses a polymorphic structure distinguished by entity_type ('post'|'work'). On auto-save, the entire form is stored as a JSONB snapshot, with deduplication skipping saves when content hasn't changed. List queries exclude snapshots for lightweight fetching, while detail views show diff comparisons including metadata like category and tags. Revisions exceeding 50 per entity are auto-pruned oldest-first, and individual deletion is supported.",
    },
    relatedTable: "revisions",
  },
  {
    title: {
      ko: "배열 타입으로 유연한 태깅",
      en: "Flexible Tagging with Array Type",
    },
    tag: "TEXT[] + @> Operator",
    description: {
      ko: "works.tech 컬럼을 TEXT[] 배열 타입으로 두고, 별도 조인 테이블 없이 다중 기술 태그를 관리합니다. @> 연산자로 특정 기술 포함 여부를 빠르게 확인하고, unnest()로 개별 요소를 풀어 집계할 수도 있습니다. 태그가 독립 엔티티가 아닌 속성에 가까우므로, 조인 비용 없이 단순하게 처리할 수 있습니다.",
      en: "The works.tech column uses a TEXT[] array type to manage multiple tech tags without a separate join table. The @> operator quickly checks for inclusion, and unnest() can expand elements for aggregation. This strategy keeps things simple without join overhead when tags are closer to attributes than independent entities.",
    },
    relatedTable: "works",
  },
  {
    title: {
      ko: "시리즈-카테고리 자동 동기화",
      en: "Auto-Synced Series Category",
    },
    tag: "FK + Application-Level Sync",
    description: {
      ko: "posts.series_id FK로 시리즈를 참조하면, 해당 시리즈의 카테고리가 포스트에 자동 적용됩니다. 프론트에서는 시리즈 선택 시 카테고리 필드를 잠금 처리하고, 해제하면 수동 선택으로 돌아갑니다. DB에서는 FK로 참조 무결성만 보장하고, 동기화 로직은 애플리케이션 레이어에서 처리합니다.",
      en: "When posts.series_id references a series via FK, the series' category is automatically applied to the post. The frontend locks the category field when a series is selected and restores manual selection on deselection. The database only ensures referential integrity via FK, while sync logic is handled at the application layer for flexibility.",
    },
    relatedTable: "series",
  },
];

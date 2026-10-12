/* About 개편 — 구조 장. 그래프 · 흐름 · API · ERD 의 값은 관리자 설정(siteConfig.about)이 먼저이고, 비어 있으면
   기존 About 이 쓰던 코드 기본값(src/data/about/*, panels/archDiagramData)을 쓴다. 여기에는 장면의 글만 둔다.
   묶음 설명은 README 의 기술 스택 · 한눈에 보기 표와 그래프 노드에서 옮겼다. */
import type { L10n } from "./showcase";

export const architectureChapter = {
  eyebrow: { ko: "04 — 구조", en: "04 — Architecture" } satisfies L10n,
  title: {
    ko: "화면 뒤에서 무엇이 어떻게 이어져 있는지.",
    en: "What sits behind the screens, and how it connects.",
  } satisfies L10n,
};

/** 기술 그래프 — 스크롤하는 만큼 묶음 하나씩 불이 들어온다. key 는 그래프 노드의 group */
export const stackScene = {
  label: { ko: "기술 그래프", en: "Tech graph" } satisfies L10n,
  title: { ko: "요청 하나가 지나가는 길", en: "The path of a single request" } satisfies L10n,
  groups: [
    {
      key: "frontend",
      title: { ko: "프론트엔드", en: "Frontend" },
      body: {
        ko: "Next.js 16 App Router 위의 React 19와 TypeScript. 스타일은 CSS Modules와 3층 디자인 토큰, 편집기는 Plate.js.",
        en: "React 19 and TypeScript on the Next.js 16 App Router. Styling with CSS Modules and three-layer design tokens; the editor is Plate.js.",
      },
    },
    {
      key: "animation",
      title: { ko: "애니메이션 · 3D", en: "Animation · 3D" },
      body: {
        ko: "GSAP ScrollTrigger로 스크롤 장면을, Framer Motion으로 작은 움직임을, Three.js · React Three Fiber로 3D를, Lenis로 부드러운 스크롤을 맡깁니다.",
        en: "GSAP ScrollTrigger for scroll scenes, Framer Motion for small motion, Three.js and React Three Fiber for 3D, Lenis for smooth scrolling.",
      },
    },
    {
      key: "backend",
      title: { ko: "API", en: "API" },
      body: {
        ko: "별도 서버 없이 Next.js API Routes로 엔드포인트를 둡니다. 쓰기 요청은 Origin을 확인하고(운영은 fail-closed), 관리자 요청은 역할을 확인합니다.",
        en: "Endpoints live in Next.js API Routes, no separate server. Writes check Origin (fail-closed in production) and admin calls check roles.",
      },
    },
    {
      key: "db",
      title: { ko: "데이터베이스", en: "Database" },
      body: {
        ko: "Supabase의 PostgreSQL · Auth · Storage · Realtime · pg_cron. 권한은 RLS 4단계(소유자 · 관리자 · 저자 · 방문자)로 DB가 판정합니다.",
        en: "Supabase PostgreSQL, Auth, Storage, Realtime and pg_cron. Permissions are decided by the database with four RLS tiers (owner, admin, author, visitor).",
      },
    },
    {
      key: "deploy",
      title: { ko: "배포", en: "Deploy" },
      body: {
        ko: "Vercel에서 SSR과 ISR로 그립니다. 글 목록 · 상세는 미리 그려 두고 정해진 간격으로 다시 만듭니다.",
        en: "Rendered on Vercel with SSR and ISR. Post lists and details are pre-rendered and regenerated on an interval.",
      },
    },
    {
      key: "external",
      title: { ko: "외부 서비스", en: "External services" },
      body: {
        ko: "댓글은 giscus를 고를 수 있고, 메일은 Resend로 보냅니다. AI · 이미지 공급자는 기능마다 대체 순서를 둡니다.",
        en: "Comments can use giscus, and mail goes through Resend. AI and image providers each have a fallback order per feature.",
      },
    },
  ],
};

/** 기술 그래프 범례 */
export const stackKey = [
  { k: "star", text: { ko: "별 하나 = 기술 하나", en: "One star = one technology" } },
  { k: "line", text: { ko: "선 = 함께 맞물려 쓰이는 관계", en: "Line = used together" } },
  { k: "now", text: { ko: "분홍 = 지금 보고 있는 묶음", en: "Pink = the group you're on" } },
];

export const flowScene = {
  label: { ko: "사용자 흐름", en: "User flows" } satisfies L10n,
  title: { ko: "누가, 어디서, 무엇을 하는지", en: "Who does what, and where" } satisfies L10n,
};

export const apiScene = {
  now: { ko: "지금 묶음", en: "Now" } satisfies L10n,
  /** 범례 — k 는 그림 기호 종류 */
  key: [
    { k: "ray", text: { ko: "빛줄기 하나 = 리소스 하나", en: "One ray = one resource" } },
    { k: "star", text: { ko: "별 하나 = 엔드포인트 하나 (오른쪽 목록의 한 줄)", en: "One star = one endpoint (one row on the right)" } },
  ],
  label: { ko: "API", en: "API" } satisfies L10n,
  title: { ko: "엔드포인트", en: "endpoints" } satisfies L10n,
  groupsUnit: { ko: "리소스", en: "resources" } satisfies L10n,
  hint: {
    ko: "몇 초마다 바퀴가 돌며 '지금 묶음' 표시에 맞물린 묶음이 오른쪽 카드에 열립니다. 빛줄기를 누르면 그 묶음으로, 마우스를 올리면 멈춥니다.",
    en: "Every few seconds the wheel turns and the group at the 'Now' marker opens in the card. Tap a ray to jump; hover to pause.",
  } satisfies L10n,
  /* ── 아래는 생성 지도(src/data/generated/apiMap.ts)의 이름표. 숫자 · 목록은 모두 생성 파일에서 온다 ── */
  overviewLead: {
    ko: "가운데 /api 에서 리소스(경로 앞부분)마다 빛줄기가 뻗고, 별 하나가 엔드포인트 하나입니다. 별의 색은 그 엔드포인트를 부를 수 있는 권한입니다. 바깥 궤도의 01~08 은 요청 하나가 서버에서 처리되는 단계이고, 리소스마다 대표 요청 하나가 그 단계를 차례로 지납니다.",
    en: "A ray per resource (path prefix) spreads from /api; each star is one endpoint, coloured by the access it needs. Stations 01–08 on the outer orbit are the stages a request goes through on the server; for each resource, one representative request walks those stages.",
  } satisfies L10n,
  /** 접근 등급 — 핸들러 본문의 가드 호출로 정했다(lib/about/apiMap) */
  access: {
    public: { ko: "공개", en: "Public" },
    "signed-in": { ko: "로그인", en: "Signed in" },
    author: { ko: "저자", en: "Author" },
    admin: { ko: "관리자", en: "Admin" },
    owner: { ko: "소유자", en: "Owner" },
    cron: { ko: "크론", en: "Cron" },
  } satisfies Record<string, L10n>,
  accessLabel: { ko: "누가 부를 수 있나", en: "Who can call" } satisfies L10n,
  /** 외부 서비스 — 가져온 모듈 · 호출 주소로 알아봤다 */
  services: {
    ai: { ko: "AI 모델", en: "AI models" },
    translate: { ko: "번역", en: "Translation" },
    tts: { ko: "음성 합성", en: "Text-to-speech" },
    storage: { ko: "Storage", en: "Storage" },
    mail: { ko: "메일(Resend)", en: "Mail (Resend)" },
    github: { ko: "GitHub", en: "GitHub" },
    photos: { ko: "사진(Unsplash · Pexels)", en: "Photos (Unsplash · Pexels)" },
    weather: { ko: "날씨(Open-Meteo)", en: "Weather (Open-Meteo)" },
    fonts: { ko: "Google Fonts", en: "Google Fonts" },
  } satisfies Record<string, L10n>,
  servicesLabel: { ko: "외부 서비스", en: "External services" } satisfies L10n,
  tablesLabel: { ko: "테이블", en: "Tables" } satisfies L10n,
  rpcLabel: { ko: "RPC", en: "RPC" } satisfies L10n,
  routeFiles: { ko: "route.ts", en: "route.ts" } satisfies L10n,
  none: { ko: "없음", en: "None" } satisfies L10n,
  /** 작은 리소스를 접은 것(lib/about/apiMap 의 MIN_GROUP) */
  etcGroup: { ko: "그 밖", en: "Other" } satisfies L10n,
  adminEtcGroup: { ko: "admin · 그 밖", en: "admin · other" } satisfies L10n,
  foldedLabel: { ko: "접은 리소스", en: "Folded" } satisfies L10n,
};

export const erdScene = {
  label: { ko: "DB 설계", en: "Database design" } satisfies L10n,
  title: { ko: "테이블과 관계", en: "Tables and relations" } satisfies L10n,
  tables: { ko: "테이블", en: "tables" } satisfies L10n,
  relations: { ko: "관계", en: "relations" } satisfies L10n,
  hint: {
    ko: "목록에서 테이블을 고르면 그 테이블과 연결된 테이블만 남고, 설계 메모가 옆에 나옵니다. 빈 곳을 누르면 전체 보기로 돌아가고, 확대는 단추나 Ctrl + 휠로 합니다.",
    en: "Pick a table to keep only it and its connected tables, with its design notes beside. Click empty space for the full view; zoom with the buttons or Ctrl + wheel.",
  } satisfies L10n,
  index: { ko: "테이블 목록", en: "Table list" } satisfies L10n,
  showAll: { ko: "전체 보기", en: "Show all" } satisfies L10n,
  notesFor: { ko: "설계 메모", en: "Design notes" } satisfies L10n,
  notesEmpty: { ko: "이 테이블에는 따로 적은 설계 메모가 없습니다.", en: "No design notes for this table." } satisfies L10n,
  notesPick: { ko: "목록에서 테이블을 고르면 그 테이블의 설계 메모가 여기에 나옵니다.", en: "Pick a table from the list to read its design notes here." } satisfies L10n,
  notes: { ko: "설계 메모", en: "Design notes" } satisfies L10n,
  notesTitle: { ko: "표 뒤에 숨은 결정 여섯", en: "Six decisions behind the tables" } satisfies L10n,
  problem: { ko: "문제", en: "Problem" } satisfies L10n,
  fix: { ko: "해결", en: "Fix" } satisfies L10n,
};

/** ERD 목록의 묶음 — 테이블 이름으로 나눈다. 여기 없는 이름(관리자에서 새로 붙인 테이블)은 '그 밖' 으로 */
export const erdGroups: { label: L10n; tables: string[] }[] = [
  {
    label: { ko: "콘텐츠", en: "Content" },
    tables: ["posts", "series", "works", "post_work_relations", "series_work_relations", "revisions", "cover_image_history", "calendars", "content_translations"],
  },
  {
    label: { ko: "반응", en: "Reactions" },
    tables: ["comments", "work_comments", "likes", "comment_reactions", "comment_reports", "custom_emojis", "poll_votes"],
  },
  {
    label: { ko: "운영", en: "Operations" },
    tables: ["site_settings", "page_views", "service_logs", "traffic_excluded_ips", "admin_notifications", "applied_migrations", "demo_usage"],
  },
  {
    label: { ko: "보안 · 권한", en: "Security" },
    tables: ["admin_known_devices", "admin_login_attempts", "author_invites"],
  },
];
export const erdOtherGroup: L10n = { ko: "그 밖", en: "Other" };
/** DB 설계 장면에서 스크롤로 차례로 훑는 테이블 — 묶음마다 중심 테이블(전체 보기 다음 단계부터 하나씩) */
export const erdTour = ["posts", "works", "comments", "likes", "site_settings", "author_invites"];

/* ── API 요청 여정 — 대표 요청 다섯 개가 실제로 지나가는 단계. 단계와 실패 코드는 코드에서 확인했다(file 칸).
   layer 는 위 정거장 줄의 자리, fail 은 그 단계에서 막힐 때의 응답 ── */

export const journeyLayers = [
  { key: "client", label: { ko: "브라우저", en: "Browser" } },
  { key: "proxy", label: { ko: "프록시", en: "Proxy" } },
  { key: "auth", label: { ko: "로그인", en: "Auth" } },
  { key: "check", label: { ko: "검사", en: "Checks" } },
  { key: "ext", label: { ko: "AI 공급자", en: "AI providers" } },
  { key: "db", label: { ko: "DB", en: "DB" } },
  { key: "side", label: { ko: "알림 · 캐시", en: "Notify · cache" } },
  { key: "response", label: { ko: "응답", en: "Response" } },
] as const;

export type JourneyLayer = (typeof journeyLayers)[number]["key"];

export interface JourneyStep {
  layer: JourneyLayer;
  title: L10n;
  body: L10n;
  fail?: string;
  file: string;
}

export interface Journey {
  key: string;
  label: L10n;
  method: string;
  path: string;
  /** 배경 지도에서 밝힐 묶음 이름(backendItems 의 name) */
  group: string;
  steps: JourneyStep[];
}

export const PROXY_STEP: JourneyStep = {
  layer: "proxy",
  title: { ko: "출처 확인", en: "Origin check" },
  body: {
    ko: "쓰기 요청은 Origin이 이 사이트인지 먼저 봅니다. 운영에서는 확인할 수 없으면 막습니다(fail-closed).",
    en: "Every write request is checked for this site's Origin first. In production, anything unverifiable is blocked (fail-closed).",
  },
  fail: "403 Cross-origin request blocked",
  file: "src/proxy.ts",
};

export const journeys: Journey[] = [
  {
    key: "edit",
    label: { ko: "글 수정", en: "Edit a post" },
    method: "PATCH",
    path: "/api/posts/[id]",
    group: "Posts API",
    steps: [
      { layer: "client", title: { ko: "저장 누름", en: "Save" }, body: { ko: "편집기는 처음 불러온 글의 version 을 함께 보냅니다.", en: "The editor sends the version it loaded along with the changes." }, file: "src/app/admin/(dashboard)/posts" },
      PROXY_STEP,
      { layer: "auth", title: { ko: "로그인 확인", en: "Session" }, body: { ko: "세션으로 사용자를 확인하고, 역할이 바뀌었으면 토큰을 새로 받습니다.", en: "The session identifies the user; stale role claims trigger a token refresh." }, fail: "401 UNAUTHORIZED", file: "src/lib/api/requireAuth.ts" },
      { layer: "check", title: { ko: "편집 권한 · 길이", en: "Access · length" }, body: { ko: "소유자 · 관리자 또는 이 글에 등록된 저자만 고칠 수 있고, 제목 길이를 봅니다.", en: "Only the owner, an admin or a listed author may edit; title length is checked." }, fail: "403 POST_OWN_ONLY · 400 POST_TITLE_TOO_LONG", file: "src/lib/api/requirePostAccess.ts" },
      { layer: "db", title: { ko: "버전 조건 저장", en: "Versioned update" }, body: { ko: "version 이 그대로일 때만 고칩니다. 다른 탭에서 먼저 저장했다면 덮어쓰지 않고 알려 줍니다. RLS 와 제목 길이 CHECK 가 한 번 더 막습니다.", en: "The update only applies if the version is unchanged — a save from another tab is reported instead of overwritten. RLS and a title-length CHECK guard it again." }, fail: "409 version_conflict", file: "src/app/api/posts/[id]/route.ts" },
      { layer: "side", title: { ko: "캐시 갱신", en: "Revalidate" }, body: { ko: "글 목록 · 상세 · 태그 페이지의 미리 그린 화면을 새로 만들게 합니다.", en: "Pre-rendered list, detail and tag pages are revalidated." }, file: "src/app/api/posts/[id]/route.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "고친 글을 돌려줍니다.", en: "Returns the updated post." }, file: "src/app/api/posts/[id]/route.ts" },
    ],
  },
  {
    key: "comment",
    label: { ko: "댓글 쓰기", en: "Post a comment" },
    method: "POST",
    path: "/api/comments",
    group: "Comments API",
    steps: [
      { layer: "client", title: { ko: "로그인 없이 작성", en: "No login" }, body: { ko: "닉네임과 비밀번호만으로 씁니다. 비밀번호는 나중에 고치거나 지울 때 씁니다.", en: "Just a nickname and password — the password is for editing or deleting later." }, file: "src/components/comments" },
      PROXY_STEP,
      { layer: "check", title: { ko: "입력 검사", en: "Validation" }, body: { ko: "내용을 정리하고, 이메일 · 닉네임 형식과 비밀번호 길이를 봅니다.", en: "Content is sanitized; email and nickname format and password length are checked." }, fail: "400 PASSWORD_TOO_SHORT", file: "src/lib/api/commentHandler.ts" },
      { layer: "check", title: { ko: "비밀번호 해시", en: "Hash" }, body: { ko: "비밀번호는 bcrypt 해시로만 남깁니다.", en: "The password is stored only as a bcrypt hash." }, file: "src/lib/api/commentHandler.ts" },
      { layer: "db", title: { ko: "서버만 쓰는 저장", en: "Server-only insert" }, body: { ko: "공개 읽기 정책을 없애 두어, 댓글은 서버를 거쳐서만 읽고 씁니다.", en: "With the public read policy removed, comments are read and written only through the server." }, file: "supabase/setup.sql" },
      { layer: "side", title: { ko: "알림 · 메일", en: "Notify · mail" }, body: { ko: "답글이면 원래 댓글 쓴 사람에게 메일을, 관리자에게는 알림을 보냅니다. 실패해도 응답은 막지 않습니다.", en: "Replies email the original commenter and notify the admin — without blocking the response if that fails." }, file: "src/lib/adminNotify.ts" },
      { layer: "response", title: { ko: "201 Created", en: "201 Created" }, body: { ko: "비밀번호 해시는 빼고 돌려줍니다.", en: "Returned without the password hash." }, file: "src/lib/api/commentHandler.ts" },
    ],
  },
  {
    key: "like",
    label: { ko: "좋아요", en: "Like" },
    method: "POST",
    path: "/api/posts/[id]/like",
    group: "Posts API",
    steps: [
      { layer: "client", title: { ko: "하트 누름", en: "Tap the heart" }, body: { ko: "로그인은 필요 없습니다.", en: "No login needed." }, file: "src/components/ui/HeartIcon" },
      PROXY_STEP,
      { layer: "check", title: { ko: "IP 로 구분", en: "Identify by IP" }, body: { ko: "글 id 형식을 보고, 요청한 IP 로 누가 눌렀는지 구분합니다.", en: "The id format is checked and the request IP identifies who liked it." }, fail: "400 Invalid id", file: "src/lib/api/likeHandler.ts" },
      { layer: "db", title: { ko: "토글", en: "Toggle" }, body: { ko: "있으면 지우고 없으면 넣습니다. (대상, IP) 유니크 인덱스가 중복을 막습니다.", en: "Delete if present, insert if not; a (target, IP) unique index blocks duplicates." }, file: "supabase/setup.sql" },
      { layer: "db", title: { ko: "개수 맞추기", en: "Recount" }, body: { ko: "다시 세어 글의 like_count 를 맞춥니다.", en: "Recounts and syncs the post's like_count." }, file: "src/lib/api/likeHandler.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "개수와 눌림 여부를 돌려줍니다.", en: "Returns the count and whether it's liked." }, file: "src/lib/api/likeHandler.ts" },
    ],
  },
  {
    key: "settings",
    label: { ko: "설정 저장", en: "Save settings" },
    method: "PATCH",
    path: "/api/admin/settings",
    group: "Admin API",
    steps: [
      { layer: "client", title: { ko: "저장 누름", en: "Save" }, body: { ko: "설정 화면이 한 탭 또는 섹션 하나를 보냅니다.", en: "The settings page sends a tab or a single section." }, file: "src/app/admin/(dashboard)/settings" },
      { ...PROXY_STEP, title: { ko: "출처 · 관리자 확인", en: "Origin · admin gate" }, body: { ko: "출처를 보고, /api/admin 은 프록시에서 로그인까지 확인합니다.", en: "Origin is checked, and /api/admin requires a signed-in user already at the proxy." }, fail: "403 · 401 Unauthorized" },
      { layer: "auth", title: { ko: "로그인 확인", en: "Session" }, body: { ko: "핸들러에서 세션을 한 번 더 확인합니다.", en: "The handler checks the session again." }, fail: "401 UNAUTHORIZED", file: "src/app/api/admin/settings/route.ts" },
      { layer: "check", title: { ko: "필수값 · 모양 검사", en: "Required · shape" }, body: { ko: "제목 · 이름 · 테마 색 다섯 · giscus 같은 비울 수 없는 값과 About ERD 의 모양을 봅니다.", en: "Required values — title, name, five theme colors, giscus — and the About ERD's shape are validated." }, fail: "400", file: "src/lib/api/validateRequiredSettings.ts" },
      { layer: "check", title: { ko: "역할", en: "Role" }, body: { ko: "소유자가 아니면 자기 저자 정보만 바꿀 수 있습니다.", en: "Non-owners may change only their own author entry." }, fail: "403 SETTINGS_OWNER_ONLY", file: "src/app/api/admin/settings/route.ts" },
      { layer: "db", title: { ko: "저장 · DB CHECK", en: "Save · DB CHECK" }, body: { ko: "site_settings 에 저장하고, DB 의 CHECK 가 같은 필수값을 한 번 더 막습니다(UI · API · DB 세 겹).", en: "Saved to site_settings, where a DB CHECK guards the same required values again — UI, API and DB." }, file: "supabase/setup.sql" },
      { layer: "side", title: { ko: "캐시 · 알림", en: "Revalidate · notify" }, body: { ko: "사이트 전체를 새로 그리게 하고, 바뀐 항목을 관리자 알림으로 남깁니다.", en: "The whole site is revalidated and the changed keys are logged as an admin notification." }, file: "src/app/api/admin/settings/route.ts" },
      { layer: "response", title: { ko: "200 OK", en: "200 OK" }, body: { ko: "저장된 설정을 돌려줍니다.", en: "Returns the saved settings." }, file: "src/app/api/admin/settings/route.ts" },
    ],
  },
  {
    key: "translate",
    label: { ko: "자동 번역", en: "Auto-translate" },
    method: "POST",
    path: "/api/admin/translate",
    group: "Translation / AI Summary API",
    steps: [
      { layer: "client", title: { ko: "EN 으로 전환", en: "Switch to EN" }, body: { ko: "편집기가 비어 있는 영어 칸에 들어갈 원문을 모아 보냅니다.", en: "The editor sends the source text for every empty English field." }, file: "src/app/admin/(dashboard)/posts" },
      { ...PROXY_STEP, title: { ko: "출처 · 관리자 확인", en: "Origin · admin gate" }, body: { ko: "출처를 보고, 프록시에서 로그인까지 확인합니다.", en: "Origin is checked and a signed-in user is required at the proxy." }, fail: "403 · 401 Unauthorized" },
      { layer: "auth", title: { ko: "로그인 확인", en: "Session" }, body: { ko: "핸들러에서 세션을 한 번 더 확인합니다.", en: "The handler checks the session again." }, fail: "401", file: "src/app/api/admin/translate/route.ts" },
      { layer: "check", title: { ko: "공급자 순서", en: "Provider order" }, body: { ko: "설정의 기본 공급자(기본 DeepL) 다음에 대체 순서를 잇고, 꺼진 공급자는 건너뜁니다.", en: "The configured provider (DeepL by default) comes first, then the fallback order, skipping disabled ones." }, file: "src/lib/api/translationProviders.ts" },
      { layer: "ext", title: { ko: "차례로 호출", en: "Fallback loop" }, body: { ko: "공급자마다 아직 못 받은 글만 넘깁니다. 같은 원인으로 거듭 실패하면 자동으로 꺼지고 기록 · 알림이 남습니다.", en: "Each provider gets only what's still untranslated. Repeated failures of the same kind switch it off, with a log and a notification." }, file: "src/lib/ai/health.ts" },
      { layer: "response", title: { ko: "200 · 502", en: "200 · 502" }, body: { ko: "받은 번역과 실패한 칸을 돌려줍니다. 아무것도 못 받으면 원인 코드와 함께 실패를 알립니다.", en: "Returns translations plus failed fields; if nothing came back, a failure with a reason code." }, fail: "502 TRANSLATION_FAILED", file: "src/lib/api/translationProviders.ts" },
    ],
  },
];

export const journeyScene = {
  lead: {
    ko: "요청 하나가 어디를 거쳐 가는지, 실제 코드 순서대로.",
    en: "Where a single request goes, in the order the code runs.",
  } satisfies L10n,
  failLabel: { ko: "여기서 막히면", en: "If blocked here" } satisfies L10n,
  rayBody: {
    ko: "이 요청은 이 빛줄기의 별 하나입니다. 이제 바깥 궤도의 정거장을 차례로 지나갑니다.",
    en: "This request is one star on this ray. Now it travels the stations on the outer orbit.",
  } satisfies L10n,
  overview: { ko: "전체 보기", en: "Overview" } satisfies L10n,
  /** 리소스 목록 끝 — 다음 걸음에 처리 단계를 따라갈 대표 요청 */
  nextLabel: { ko: "다음 · 대표 요청의 처리 단계", en: "Next · lifecycle of a sample request" } satisfies L10n,
  overviewBody: {
    ko: "가운데 /api 에서 묶음마다 빛줄기가 뻗고, 별 하나가 엔드포인트 하나입니다. 바깥 궤도는 요청이 지나가는 정거장입니다. 빛줄기를 누르면 그 묶음의 엔드포인트가 펼쳐집니다.",
    en: "Rays spread from /api, one per group; each star is one endpoint. The outer orbit holds the stations a request passes through. Tap a ray to unfold its endpoints.",
  } satisfies L10n,
  overviewButton: { ko: "전체 보기", en: "Overview" } satisfies L10n,
  play: { ko: "재생", en: "Play" } satisfies L10n,
  hintIdle: { ko: "지도를 누르면 휠로 확대 · 끌어서 이동", en: "Click the map to zoom with the wheel · drag to pan" } satisfies L10n,
  hintActive: { ko: "휠로 확대 · 끌어서 이동 · 밖으로 나가면 페이지 스크롤", en: "Wheel to zoom · drag to pan · leave to scroll the page" } satisfies L10n,
  zoomIn: { ko: "확대", en: "Zoom in" } satisfies L10n,
  zoomOut: { ko: "축소", en: "Zoom out" } satisfies L10n,
  pause: { ko: "멈춤", en: "Pause" } satisfies L10n,
};

/* ── 설계 메모 — 원래 메모(data/about/erd.ts 의 erdDesignNotes)에서 여섯을 골라 요약 · 문제 · 해결 · 근거로 줄였다.
   내용은 원문과 코드(posts/[id] route, likeHandler, setup.sql) 그대로 ── */
export interface KeyNote {
  /** 도식 종류 — NoteArt 가 그린다 */
  art: "conflict" | "roles" | "daily" | "likes" | "hashes" | "data";
  /** 도식 아래 한 줄 */
  caption: L10n;
  short: L10n;
  headline: L10n;
  problem: L10n;
  fix: L10n;
  proof: string;
}

export const keyNotes: KeyNote[] = [
  {
    art: "conflict",
    caption: { ko: "덮어쓰지 않고 409 로 멈춘 뒤 고르게 합니다.", en: "Stops with 409 and lets you choose — no overwrite." },
    short: { ko: "덮어쓰기 대신 409", en: "409, not overwrite" },
    headline: { ko: "늦게 저장한 쪽이 먼저 저장한 글을 지우지 못한다", en: "A late save can't erase an earlier one" },
    problem: { ko: "두 탭에서 같은 글을 고치면 나중 저장이 앞선 저장을 조용히 덮어씁니다.", en: "Edit one post in two tabs and the later save silently overwrites the earlier one." },
    fix: { ko: "불러온 version 이 그대로일 때만 저장하고, 아니면 409 로 알려 덮어쓰기 · 새로 불러오기를 고르게 합니다.", en: "Save only if the loaded version still matches; otherwise answer 409 and let the user overwrite or reload." },
    proof: "UPDATE posts … WHERE version = baseVersion",
  },
  {
    art: "roles",
    caption: { ko: "역할은 서버만 쓰는 app_metadata 에 있습니다.", en: "Roles live in server-only app_metadata." },
    short: { ko: "역할은 서버만 쓴다", en: "Roles are server-only" },
    headline: { ko: "권한은 브라우저가 바꿀 수 없는 곳에 둔다", en: "Permissions live where the browser can't touch them" },
    problem: { ko: "역할을 일반 테이블에 두면 클라이언트 요청으로 조작될 여지가 생깁니다.", en: "Keep roles in a regular table and a client request might tamper with them." },
    fix: { ko: "역할은 로그인 뒤 auth.users.app_metadata(service_role 전용)에 저장하고, 초대 테이블은 대기열로만 씁니다.", en: "Roles are written to auth.users.app_metadata (service role only) after sign-in; the invites table is just a queue." },
    proof: "auth.users.app_metadata.role",
  },
  {
    art: "daily",
    caption: { ko: "같은 IP 가 같은 페이지를 30분 안에 다시 보면 한 번으로 셉니다.", en: "The same IP viewing the same page within 30 minutes counts once." },
    short: { ko: "30분에 한 번", en: "Once per 30 minutes" },
    headline: { ko: "조회 기록은 하나, 같은 페이지는 30분에 한 번", en: "One view log, the same page once per 30 minutes" },
    problem: { ko: "방문 · 글 조회 · 작업물 조회를 테이블마다 다른 기준으로 세면 화면마다 숫자가 다르고, 새로고침이나 동시 요청으로 숫자가 부풉니다.", en: "Counting visits, post views and project views in separate tables with different rules makes every screen disagree, and refreshes or overlapping requests inflate the numbers." },
    fix: { ko: "page_views 한 테이블에 페이지마다 한 줄을 남깁니다. 같은 IP · 경로의 30분 안 조회는 앞 줄을 돌려주고, 동시 요청은 advisory lock 으로 줄 세웁니다. 날짜는 DB 가 Asia/Seoul 로 계산하는 생성 컬럼입니다.", en: "page_views stores one row per page view. A repeat view of the same path by the same IP within 30 minutes returns the earlier row, and an advisory lock serializes concurrent requests. The date is a generated column computed in Asia/Seoul by the database." },
    proof: "pg_advisory_xact_lock · viewed_at > now() - interval '30 minutes'",
  },
  {
    art: "likes",
    caption: { ko: "글 · 작업물 좋아요가 테이블 하나, 규칙 하나를 씁니다.", en: "Post and work likes share one table and one rule." },
    short: { ko: "좋아요 한 테이블", en: "One likes table" },
    headline: { ko: "좋아요는 종류가 달라도 테이블 하나로", en: "Different kinds of likes, one table" },
    problem: { ko: "글 · 작업물마다 좋아요 테이블을 따로 두면 같은 규칙을 여러 벌 관리해야 합니다.", en: "A likes table per post and work means maintaining the same rules more than once." },
    fix: { ko: "한 테이블에 대상 종류를 CHECK 로 제한해 두고, (대상, IP) 유니크로 중복을 한 번에 막습니다.", en: "One table restricts target type with a CHECK, and a (target, IP) unique index blocks duplicates once." },
    proof: "CHECK (target_type IN ('post','work',…))",
  },
  {
    art: "hashes",
    caption: { ko: "인증은 비밀번호 해시, 아바타는 표시용 해시.", en: "Auth by password hash; avatar by display hash." },
    short: { ko: "댓글의 두 해시", en: "Two comment hashes" },
    headline: { ko: "로그인 없는 댓글은 비밀번호 해시로만 인증한다", en: "Anonymous comments authenticate by password hash only" },
    problem: { ko: "가입 없이 쓰는 댓글이라 누구 것인지 증명할 방법이 필요합니다.", en: "Without accounts, a comment still needs a way to prove whose it is." },
    fix: { ko: "수정 · 삭제는 bcrypt password_hash 로만 확인하고, commenter_hash 는 아바타 · 닉네임 표시에만 씁니다.", en: "Edits and deletes check only the bcrypt password_hash; commenter_hash just picks the avatar and nickname." },
    proof: "password_hash = 인증 · commenter_hash = 표시",
  },
  {
    art: "data",
    caption: { ko: "스키마 파일이 바뀌면 이 그림도 다음 빌드에 바뀝니다.", en: "Change the schema file and this diagram follows on the next build." },
    short: { ko: "그림도 스키마에서", en: "Drawn from the schema" },
    headline: { ko: "이 ERD 는 손으로 그리지 않고 스키마에서 만든다", en: "This ERD is generated from the schema, not drawn" },
    problem: { ko: "코드에 손으로 적은 그림은 마이그레이션이 쌓이는 동안 조용히 낡습니다.", en: "A diagram written by hand goes stale as migrations pile up." },
    fix: { ko: "빌드할 때 setup.sql 을 SQL 파서로 읽어 그림을 만들고, 어긋나면 테스트가 실패합니다. 관리자에서 SQL 을 붙여 넣으면 그 그림이 대신 쓰입니다.", en: "Each build parses setup.sql into the diagram and a test fails on drift; SQL pasted in the admin overrides it." },
    proof: "supabase/setup.sql → data/generated/erdSchema.ts",
  },
];

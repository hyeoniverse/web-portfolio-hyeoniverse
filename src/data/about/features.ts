import type { DesignFeature } from "./types";

export const designFeatures: DesignFeature[] = [
  {
    icon: "01",
    title: "Infinite Scroll Loop",
    description: {
      ko: "페이지 끝에 도달해도 끊김 없이 처음으로 돌아가는 무한 스크롤을 구현했습니다. 마지막과 첫 섹션 사이에 Bridge Section을 삽입해 루프 이음새가 자연스럽습니다.",
      en: "Scroll reaches the end and seamlessly loops back to the beginning. A bridge section between the last and first panels keeps the loop seam invisible.",
    },
    tech: ["Lenis", "Infinite Scroll", "Bridge Section"],
    image: "/images/screenshots/pc/home-dark.png",
  },
  {
    icon: "02",
    title: "i18n Bilingual System",
    description: {
      ko: "한국어/영어 전환을 지원하는 다국어 시스템입니다. Context API 기반으로 모든 UI가 즉시 전환되며, 어드민 콘텐츠도 이중 언어를 지원합니다. DeepL/Google/Gemini/Claude API 기반 자동 번역도 제공합니다.",
      en: "A bilingual system with instant Korean/English switching via Context API. Admin content supports dual languages, with auto-translation powered by DeepL/Google/Gemini/Claude API.",
    },
    tech: ["Context API", "JSON Locale", "Bilingual Content", "DeepL/Gemini/Claude"],
    image: "/images/screenshots/pc/feat-i18n.png",
  },
  {
    icon: "03",
    title: "Performance Optimization",
    description: {
      ko: "성능 분석을 통해 모바일 Lighthouse 점수를 60점에서 98점으로 끌어올리고, 페이지 용량을 70% 줄였습니다.",
      en: "Boosted mobile Lighthouse score from 60 to 98 and reduced page size by 70% through targeted optimization.",
    },
    tech: ["Font Subsetting", "Lazy Loading", "font-display", "browserslist"],
    image: "https://images.unsplash.com/photo-1557920982-fe9c098511d2?w=800&q=80",
  },
  {
    icon: "04",
    title: "Works Horizontal Gallery",
    description: {
      ko: "작품들을 좌우로 스크롤하며 감상할 수 있는 가로 갤러리입니다. GSAP 기반 양방향 무한 래핑과 한/영 레이아웃 분기를 지원합니다.",
      en: "Browse works in a horizontal gallery with GSAP-powered infinite wrapping in both directions and layout branching for Korean/English.",
    },
    tech: ["GSAP", "Infinite Wrapping", "i18n Layout", "Responsive"],
    image: "/images/screenshots/pc/feat-works.png",
  },
  {
    icon: "05",
    title: "Dark / Light Theme",
    description: {
      ko: "다크 모드와 라이트 모드를 전환하면 모든 요소가 부드럽게 테마에 맞춰 변합니다. 시스템 설정 감지와 사용자 선택 기억을 동시에 지원합니다.",
      en: "Switch between dark and light modes — every element smoothly transitions. Respects system preferences while remembering user choice.",
    },
    tech: ["CSS Variables", "data-theme", "prefers-color-scheme", "localStorage"],
    image: "/images/screenshots/pc/feat-colors.png",
  },
  {
    icon: "06",
    title: "3D Scroll Torus",
    description: {
      ko: "스크롤하면 화면 위를 떠다니는 금속 느낌의 3D 도넛 오브젝트입니다. 리사주 곡선 경로를 따라 움직이며 테마에 따라 질감이 바뀝니다.",
      en: "A metallic 3D torus floats along a Lissajous curve path as you scroll, with its texture adapting to the current theme.",
    },
    tech: ["Three.js", "React Three Fiber", "Lissajous Curve", "Environment Map"],
    image: "/images/screenshots/pc/feat-torus.png",
  },
  {
    icon: "07",
    title: "Posts & Series",
    description: {
      ko: "Supabase 기반 블로그 시스템. 노션식 Plate.js 에디터(요소별 floating toolbar·슬래시 메뉴·블록 도구)와 Markdown/Rich Text 전환, 시리즈 발행, 카테고리별 책 모양 카드 탐색, 검색·태그 필터, 커버 이미지(프리셋/Unsplash/AI 생성), 발행 시 Gemini/OpenAI/Claude AI 자동 요약(ko+en)을 지원합니다.",
      en: "A full blog system on Supabase. A Notion-style Plate.js editor (per-element floating toolbar, slash menu, block tools) with Markdown/Rich Text switching, series publishing, book-shaped category browsing, search/tag filtering, cover images (presets/Unsplash/AI generation), and Gemini/OpenAI/Claude auto-summary (ko+en) on publish.",
    },
    tech: ["Supabase", "Plate.js", "Series", "Canvas API", "AI Cover", "AI Summary"],
    image: "/images/screenshots/pc/feat-series.png",
  },
  {
    icon: "08",
    title: "Comment System",
    description: {
      ko: "게스트 대댓글 시스템입니다. 닉네임+비밀번호로 작성하고, 본문은 마크다운 에디터(작성/미리보기 탭 + 서식 툴바)로 씁니다. 댓글마다 giscus식 고정 8종 이모지 반응을 달 수 있고, 관리자 답변 시 이메일 알림이 발송됩니다. 어드민에서 자체 댓글 대신 giscus(GitHub Discussions)로 전환할 수도 있습니다.",
      en: "A guest threaded comment system. Write with nickname + password using a markdown editor (write/preview tabs + formatting toolbar). Each comment takes a fixed giscus-style set of 8 emoji reactions, and the admin gets an email on replies. The admin can also swap the built-in system for giscus (GitHub Discussions).",
    },
    tech: ["Supabase", "Markdown", "DOMPurify", "Emoji Reactions", "giscus"],
    image: "/images/screenshots/pc/feat-comment.png",
  },
  {
    icon: "09",
    title: "Admin CMS",
    description: {
      ko: "로그인 버튼 없이 URL 직접 접속 방식의 숨겨진 어드민입니다. 포스트·작품·프로필을 이중 언어로 CRUD하고, 테마·폰트·사이트 설정을 실시간으로 변경할 수 있습니다. DB 미연결 시 정적 데이터로 자동 fallback됩니다.",
      en: "A hidden admin accessed via direct URL — no visible login button. Full CRUD for posts, works, and profiles in dual languages, plus real-time theme, font, and site settings. Auto-falls back to static data when DB is unavailable.",
    },
    tech: ["Supabase Auth", "Next.js Middleware", "JSONB", "Static Fallback"],
    image: "/images/screenshots/pc/feat-admin.png",
  },
  {
    icon: "10",
    title: "Editor Block Extensions",
    description: {
      ko: "에디터를 확장한 인터랙티브 블록 모음입니다. IP 기반 중복 방지 투표 블록과 탭 블록을 본문에 삽입할 수 있고, 이모지 picker와 서버사이드 코드 하이라이팅을 지원합니다. 여기에 캘린더(월/주/일/타임라인 4뷰), 자유배치 다이어그램, 코드 플레이그라운드, `@` 날짜 멘션, `[[` 포스트 내부 링크 블록을 더했습니다.",
      en: "A set of interactive blocks extending the editor. Insert IP-deduped poll blocks and tab blocks into content, with an emoji picker and server-side code highlighting — plus a calendar (month/week/day/timeline views), free-placement diagrams, a code playground, `@` date mentions, and `[[` internal post links.",
    },
    tech: ["Plate.js", "Poll Block", "Calendar", "Diagram", "Playground", "Date Mention"],
    image: "https://images.unsplash.com/photo-1542435503-956c469947f6?w=800&q=80",
  },
  {
    icon: "11",
    title: "Collaborative Safety",
    description: {
      ko: "같은 글을 여러 탭이나 기기에서 열어도 저장이 서로를 덮어쓰지 않습니다. Realtime presence로 다른 세션이 편집 중이면 배너로 알리고, 저장 시점에 충돌이 감지되면 덮어쓰기·최신 불러오기·취소 중에서 고르게 합니다.",
      en: "Saves never clobber each other, even with the same post open across tabs or devices. Realtime presence warns with a banner when another session is editing, and on a save-time conflict you choose: overwrite, reload the latest, or cancel.",
    },
    tech: ["Optimistic Locking", "Realtime Presence", "409 Conflict", "Autosave"],
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
  },
  {
    icon: "12",
    title: "Post Browsing & Taxonomy",
    description: {
      ko: "게시물을 6가지 레이아웃(매거진/그리드/리스트/컴팩트/메이슨리/피처드)으로 볼 수 있습니다. 카테고리는 2단계 트리로 다중 선택되고, 시리즈·태그·히스토리 인덱스와 작성자 여러 명 표기를 지원합니다.",
      en: "Browse posts in six layouts (magazine/grid/list/compact/masonry/featured). Categories form a two-level tree with multi-select, alongside series, tag, and history indexes, plus multi-author attribution.",
    },
    tech: ["6 Layouts", "2-Level Categories", "Multi-Author", "Facets"],
    image: "/images/screenshots/pc/posts-light.png",
  },
];

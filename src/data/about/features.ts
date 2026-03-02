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
    image: "https://images.unsplash.com/photo-1663856542282-bf5647286f63?w=800&q=80",
  },
  {
    icon: "02",
    title: "i18n Bilingual System",
    description: {
      ko: "한국어/영어 전환을 지원하는 다국어 시스템입니다. Context API 기반으로 모든 UI가 즉시 전환되며, 어드민 콘텐츠도 이중 언어를 지원합니다. DeepL API 기반 자동 번역도 제공합니다.",
      en: "A bilingual system with instant Korean/English switching via Context API. Admin content supports dual languages, with DeepL API-powered auto-translation.",
    },
    tech: ["Context API", "JSON Locale", "Bilingual Content", "DeepL API"],
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
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
    image: "https://images.unsplash.com/photo-1762928289094-197055a5d5c3?w=800&q=80",
  },
  {
    icon: "05",
    title: "Dark / Light Theme",
    description: {
      ko: "다크 모드와 라이트 모드를 전환하면 모든 요소가 부드럽게 테마에 맞춰 변합니다. 시스템 설정 감지와 사용자 선택 기억을 동시에 지원합니다.",
      en: "Switch between dark and light modes — every element smoothly transitions. Respects system preferences while remembering user choice.",
    },
    tech: ["CSS Variables", "data-theme", "prefers-color-scheme", "localStorage"],
    image: "https://images.unsplash.com/photo-1764610144010-6914d3672533?w=800&q=80",
  },
  {
    icon: "06",
    title: "3D Scroll Torus",
    description: {
      ko: "스크롤하면 화면 위를 떠다니는 금속 느낌의 3D 도넛 오브젝트입니다. 리사주 곡선 경로를 따라 움직이며 테마에 따라 질감이 바뀝니다.",
      en: "A metallic 3D torus floats along a Lissajous curve path as you scroll, with its texture adapting to the current theme.",
    },
    tech: ["Three.js", "React Three Fiber", "Lissajous Curve", "Environment Map"],
    image: "https://images.unsplash.com/photo-1639542270103-0e94fc28be38?w=800&q=80",
  },
  {
    icon: "07",
    title: "Posts & Series",
    description: {
      ko: "Supabase 기반 블로그 시스템. Markdown/Rich Text 전환 에디터, 시리즈 발행, 카테고리별 책 모양 카드 탐색, 검색·태그 필터, 커버 이미지(프리셋/Unsplash/AI 생성)를 지원합니다.",
      en: "A full blog system on Supabase. Switchable Markdown/Rich Text editor, series publishing, book-shaped category browsing, search/tag filtering, and cover images (presets/Unsplash/AI generation).",
    },
    tech: ["Supabase", "Tiptap", "Series", "Canvas API", "AI Cover"],
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80",
  },
  {
    icon: "08",
    title: "Comment & Like System",
    description: {
      ko: "게스트 대댓글과 IP 기반 좋아요 시스템입니다. 닉네임+비밀번호로 댓글을 작성하고, 쓰레드 형태의 대댓글을 지원하며, 관리자 답변 시 이메일 알림이 발송됩니다.",
      en: "Guest threaded comments with IP-based likes. Post comments via nickname + password, with threaded replies and email notifications when the admin responds.",
    },
    tech: ["Supabase", "Threaded Replies", "IP Likes", "Email Notify"],
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
  },
  {
    icon: "09",
    title: "Admin CMS",
    description: {
      ko: "로그인 버튼 없이 URL 직접 접속 방식의 숨겨진 어드민입니다. 포스트·작품·프로필을 이중 언어로 CRUD하고, 테마·폰트·사이트 설정을 실시간으로 변경할 수 있습니다. DB 미연결 시 정적 데이터로 자동 fallback됩니다.",
      en: "A hidden admin accessed via direct URL — no visible login button. Full CRUD for posts, works, and profiles in dual languages, plus real-time theme, font, and site settings. Auto-falls back to static data when DB is unavailable.",
    },
    tech: ["Supabase Auth", "Next.js Middleware", "JSONB", "Static Fallback"],
    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80",
  },
];

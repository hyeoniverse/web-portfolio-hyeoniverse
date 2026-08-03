import type {
  OverviewStat,
  StructureItem,
  UserFlow,
  FlowNode,
  FlowEdge,
} from "./types";

export const projectOverview = {
  description: {
    ko: "Claude와 함께 만든 풀스택 포트폴리오. Next.js 16 App Router를 기반으로 GSAP·Framer Motion 애니메이션, Lenis 무한 스크롤, Supabase 블로그까지 직접 설계하고 구현했습니다.",
    en: "A full-stack portfolio built alongside Claude. Designed and implemented from scratch — Next.js 16 App Router, GSAP & Framer Motion animations, Lenis infinite scroll, and a Supabase-powered blog.",
  },
  highlights: [
    "Next.js 16",
    "GSAP ScrollTrigger",
    "Framer Motion",
    "Lenis Smooth Scroll",
    "Three.js (R3F)",
    "CSS Variables",
    "Supabase",
    "i18n (KO/EN)",
    "IP-Based Likes",
    "Dark/Light Theme",
  ],
  stats: [
    {
      value: "5 Wks+",
      label: { ko: "개발 기간\n(2/5 – 3/12)", en: "Dev Period\n(2/5 – 3/12)" },
    },
    { value: "50+", label: { ko: "컴포넌트", en: "Components" } },
    { value: "15+", label: { ko: "커스텀 훅", en: "Custom Hooks" } },
    { value: "98", label: { ko: "Lighthouse", en: "Lighthouse" } },
    { value: "2", label: { ko: "언어 지원", en: "Languages" } },
    { value: "15+", label: { ko: "라이브러리", en: "Libraries" } },
  ] as OverviewStat[],
};

export const projectStructure: StructureItem[] = [
  {
    path: "src/",
    description: { ko: "소스 코드 루트", en: "Source code root" },
    indent: 0,
  },
  {
    path: "app/",
    description: {
      ko: "Next.js App Router — 페이지 & API 라우트",
      en: "Next.js App Router — pages & API routes",
    },
    indent: 1,
  },
  {
    path: "(home)/",
    description: {
      ko: "랜딩 페이지 — Hero, About, Works, CTA 등 7개 섹션",
      en: "Landing page — 7 sections: Hero, About, Works, CTA, etc.",
    },
    indent: 2,
  },
  {
    path: "works/",
    description: {
      ko: "프로젝트 갤러리 + [id] 상세 페이지 (좋아요)",
      en: "Project gallery + [id] detail pages (likes)",
    },
    indent: 2,
  },
  {
    path: "posts/",
    description: {
      ko: "블로그 목록 + [slug] 상세 (좋아요·댓글)",
      en: "Blog list + [slug] detail (likes & comments)",
    },
    indent: 2,
  },
  {
    path: "profile/",
    description: {
      ko: "프로필 페이지 — 소개 & 철학",
      en: "Profile page — introduction & philosophy",
    },
    indent: 2,
  },
  {
    path: "about/",
    description: {
      ko: "이 페이지 — 개발 과정 & 기술 문서",
      en: "This page — development process & technical docs",
    },
    indent: 2,
  },
  {
    path: "admin/",
    description: {
      ko: "어드민 대시보드 — 포스트/작업물 CRUD, 설정(콘텐츠·프로필·계정). 계정 탭에서 멤버 관리(초대·역할)를 하며, 역할(소유자/편집자/저자)에 따라 접근 가능한 탭이 갈린다. 미리보기는 공개 상세와 동일한 아티클 뷰 재사용 (single source of truth)",
      en: "Admin dashboard — posts/works CRUD, settings (content, profile, account). The account tab handles member management (invite, roles); accessible tabs branch by role (owner/editor/author). Preview reuses the same article view as the public detail page (single source of truth)",
    },
    indent: 2,
  },
  {
    path: "api/",
    description: {
      ko: "API 라우트 — posts, comments, comment-reactions, likes, contact, cover, calendars, custom-emojis, upload/signed-url, admin(authors 멤버·초대, me). GitHub OAuth 콜백은 app/auth/callback 에서 인가 검사 후 세션 확정 — 소유자 첫 로그인이면 owner 역할을 app_metadata 에 1회 못박음(claim-and-close)",
      en: "API routes — posts, comments, comment-reactions, likes, contact, cover, calendars, custom-emojis, upload/signed-url, admin (authors members/invites, me). The GitHub OAuth callback lives at app/auth/callback and finalizes the session after an authorization check — on the owner's first login it pins the owner role into app_metadata once (claim-and-close)",
    },
    indent: 2,
  },
  {
    path: "components/",
    description: {
      ko: "재사용 가능한 UI 컴포넌트 라이브러리",
      en: "Reusable UI component library",
    },
    indent: 1,
  },
  {
    path: "layout/",
    description: {
      ko: "Navigation, Footer, ContactDrawer, DetailLayout",
      en: "Navigation, Footer, ContactDrawer, DetailLayout",
    },
    indent: 2,
  },
  {
    path: "effects/",
    description: {
      ko: "StaggerText, Parallax, CursorTrail, FontMorph, ScrollTorus",
      en: "StaggerText, Parallax, CursorTrail, FontMorph, ScrollTorus",
    },
    indent: 2,
  },
  {
    path: "ui/",
    description: {
      ko: "Button, Modal, Typography, OptimizedImage, Chip, HighlightInput, FontPicker, HighlightedText, LetterFilter, MediaThumb, SearchCapsule, ColorPicker (mobile sheet)",
      en: "Button, Modal, Typography, OptimizedImage, Chip, HighlightInput, FontPicker, HighlightedText, LetterFilter, MediaThumb, SearchCapsule, ColorPicker (mobile sheet)",
    },
    indent: 2,
  },
  {
    path: "posts/",
    description: {
      ko: "PostEditor, MarkdownRenderer, PostArticleView (상세·미리보기 공용 아티클 뷰), CoverImagePicker (Presets / Local files / Unsplash / Pexels / AI / History — 모바일 sheet 자동 전환)",
      en: "PostEditor, MarkdownRenderer, PostArticleView (shared article view for detail & preview), CoverImagePicker (Presets / Local files / Unsplash / Pexels / AI / History — auto-switches to mobile sheet)",
    },
    indent: 2,
  },
  {
    path: "works/",
    description: {
      ko: "WorkArticleView (상세·미리보기 공용 — Header/Body/Team 슬롯) — 미리보기는 workFormToProject 로 폼을 Project 로 변환해 동일 뷰 재사용",
      en: "WorkArticleView (shared by detail & preview — Header/Body/Team slots) — preview reuses the same view via workFormToProject (form → Project)",
    },
    indent: 2,
  },
  {
    path: "admin/",
    description: {
      ko: "어드민 패널 컴포넌트 — AdminNotFound (편집 페이지 공용 not-found 상태) 등",
      en: "Admin panel components — AdminNotFound (shared not-found state for edit pages), etc.",
    },
    indent: 2,
  },
  {
    path: "comments/",
    description: {
      ko: "댓글 — CommentEditor (마크다운 작성/미리보기 탭 + 서식 툴바), CommentMarkdown (marked → DOMPurify sanitize), 이모지 반응, Giscus (admin 에서 system ↔ giscus provider 전환, 미설정 시 시스템 댓글로 폴백)",
      en: "Comments — CommentEditor (markdown write/preview tabs + formatting toolbar), CommentMarkdown (marked → DOMPurify sanitize), emoji reactions, Giscus (admin switches provider system ↔ giscus, falling back to system comments when unset)",
    },
    indent: 2,
  },
  {
    path: "hooks/",
    description: {
      ko: "30개 커스텀 훅 — useMagnetic, useScrollVelocity, useHorizontalScroll, usePostPresence (Supabase Realtime presence 로 같은 글을 편집 중인 다른 세션 감지) 등",
      en: "30 custom hooks — useMagnetic, useScrollVelocity, useHorizontalScroll, usePostPresence (detects other sessions editing the same post via Supabase Realtime presence), etc.",
    },
    indent: 1,
  },
  {
    path: "lib/",
    description: {
      ko: "서버 사이드 로직 — Supabase 클라이언트, API 공통 핸들러, Posts SSR 쿼리, favicon (route 의 SVG 생성과 admin 미리보기가 같은 resolveFavicon 공유), directUpload (signed URL 로 Storage 직접 업로드 — 서버리스 본문 크기 제한 우회), categoryTree, tagMeta · autoCoverImage · searchQuery · searchHighlight · videoCompress 유틸",
      en: "Server-side logic — Supabase clients, API shared handlers, Posts SSR queries, favicon (the route's SVG generation and the admin preview share one resolveFavicon), directUpload (direct-to-Storage upload via signed URL, bypassing the serverless body-size limit), categoryTree, plus tagMeta · autoCoverImage · searchQuery · searchHighlight · videoCompress utilities",
    },
    indent: 1,
  },
  {
    path: "stores/",
    description: {
      ko: "Zustand 상태 관리 — contact, modal, pageTransition, profileSection, sound, toast",
      en: "Zustand state management — contact, modal, pageTransition, profileSection, sound, toast",
    },
    indent: 1,
  },
  {
    path: "providers/",
    description: {
      ko: "Context Providers — Theme, Language, Lenis, reCAPTCHA, SiteConfig, SearchHighlight, PageTransition",
      en: "Context Providers — Theme, Language, Lenis, reCAPTCHA, SiteConfig, SearchHighlight, PageTransition",
    },
    indent: 1,
  },
  {
    path: "types/",
    description: {
      ko: "TypeScript 타입 정의 — Post, Comment 등",
      en: "TypeScript type definitions — Post, Comment, etc.",
    },
    indent: 1,
  },
  {
    path: "config/",
    description: {
      ko: "사이트 설정 — site.config.ts",
      en: "Site configuration — site.config.ts",
    },
    indent: 1,
  },
  {
    path: "animations/",
    description: {
      ko: "Framer Motion 프리셋 — fade, slide, scale, spring 등 7개 카테고리",
      en: "Framer Motion presets — 7 categories: fade, slide, scale, spring, etc.",
    },
    indent: 1,
  },
  {
    path: "styles/",
    description: {
      ko: "디자인 토큰, 베이스 스타일, 애니메이션, 유틸리티",
      en: "Design tokens, base styles, animations, utilities",
    },
    indent: 1,
  },
  {
    path: "data/",
    description: {
      ko: "정적 데이터 — projects, services, profile, about",
      en: "Static data — projects, services, profile, about",
    },
    indent: 1,
  },
  {
    path: "locales/",
    description: {
      ko: "i18n 번역 파일 — ko.json, en.json",
      en: "i18n translation files — ko.json, en.json",
    },
    indent: 1,
  },
];

/* ── helper: 노드/엣지 빌더 ── */
const n = (
  id: string,
  type: "start" | "action" | "decision" | "end",
  row: number,
  col: number,
  ko: string,
  en: string,
  y?: number,
): FlowNode => ({
  id,
  type,
  label: { ko, en },
  row,
  col,
  ...(y != null && { y }),
});

const e = (
  from: string,
  to: string,
  label?: string,
  noArrow?: boolean,
): FlowEdge => ({
  from,
  to,
  ...(label && { label }),
  ...(noArrow && { noArrow }),
});

export const userFlows: UserFlow[] = [
  /* ── 1. Visitor Journey ── */
  {
    title: "Visitor",
    persona: {
      ko: "처음 방문한 사용자 · 검색이나 링크를 통해 유입됨",
      en: "First-time visitor · arrived via search or shared link",
    },
    description: {
      ko: "BGM 선택 후 랜딩 페이지를 스크롤하며 Works Bubble에서 프로젝트를 보거나, CTA에서 연락을 남기는 흐름",
      en: "Choose BGM, scroll the landing page, explore projects via Works Bubble, or reach out via the CTA section",
    },
    nodes: [
      /* row 0: BGM 수직 체인 */
      n("start", "start", 0, 3, "사이트에 접속", "Land on Site"),
      n("bgm_q", "decision", 0, 4, "BGM\n켤까?", "Enable\nBGM?"),
      n("bgm_on", "action", 0, 5, "BGM 재생", "Play BGM"),
      /* row 1 */
      n(
        "scroll",
        "action",
        1,
        4,
        "스크롤 내려서\n탐색",
        "Scroll Down\nand Explore",
      ),
      /* row 2: No 수직 체인 */
      n(
        "works_q",
        "decision",
        2,
        3,
        "Selected Works\n발견?",
        "Found\nSelected Works?",
      ),
      n("cta", "action", 2, 4, "CTA까지 스크롤", "Scroll to CTA"),
      n("contact_q", "decision", 2, 5, "연락\n할까?", "Want to\ncontact?"),
      n("touch", "action", 2, 6, "Get in Touch\n클릭", "Click\nGet in Touch"),
      /* row 3+: Yes 수평 체인 */
      n("end_email", "end", 3, 6, "이메일 전송", "Send Email"),
      n("detail", "action", 3, 3, "상세페이지 열람", "View Detail Page"),
      n(
        "menu_q",
        "decision",
        3,
        4,
        "다른 메뉴도\n확인할까?",
        "Check other\nmenus?",
      ),
      n("nav", "action", 4, 4, "Navigation 메뉴 클릭", "Click Nav Menu"),
      n("end_leave", "end", 3, 5, "사이트 이탈", "Leave Site"),
      n("end_page", "end", 5, 4, "페이지 이동", "Navigate Away"),
    ],
    edges: [
      e("start", "bgm_q"),
      e("bgm_q", "bgm_on", "Yes"),
      e("bgm_q", "scroll", "No"),
      e("bgm_on", "scroll"),
      e("scroll", "works_q"),
      e("works_q", "detail", "Yes"),
      e("works_q", "cta", "No"),
      e("cta", "contact_q"),
      e("contact_q", "touch", "Yes"),
      e("contact_q", "menu_q", "No"),
      e("touch", "end_email"),
      e("detail", "menu_q"),
      e("menu_q", "nav", "Yes"),
      e("menu_q", "end_leave", "No"),
      e("nav", "end_page"),
    ],
  },

  /* ── 2. Posts Reading ── */
  {
    title: "Posts",
    persona: {
      ko: "기술 블로그를 탐색 중인 독자",
      en: "Reader browsing tech blog posts",
    },
    description: {
      ko: "게시물 목록을 탐색하며 마음에 드는 게시물을 읽고, 좋아요·댓글을 남기는 흐름",
      en: "Browse the post list, read a post you like, and leave likes or comments",
    },
    nodes: [
      n("start", "start", 1, 3, "Posts\n페이지 방문", "Visit Posts Page"),
      n(
        "found_q",
        "decision",
        1,
        4,
        "마음에 드는\n게시물 발견?",
        "Found a post\nyou like?",
      ),
      n("next_page", "action", 1, 5, "다음 페이지", "Next Page"),
      n("click", "action", 2, 4, "게시물 클릭", "Click Post"),
      n("read", "action", 4, 4, "게시물 읽기", "Read Article"),
      n("react_q", "decision", 4, 5, "피드백\n할까?", "Leave\nfeedback?"),
      n("engage", "action", 4, 6, "좋아요 · 댓글 남기기", "Like & Comment"),
      n("end_next", "end", 5, 5, "다음 게시물", "Next Post"),
    ],
    edges: [
      e("start", "found_q"),
      e("found_q", "click", "Yes"),
      e("found_q", "next_page", "No"),
      e("next_page", "found_q"),
      e("click", "read"),
      e("read", "react_q"),
      e("react_q", "engage", "Yes"),
      e("react_q", "end_next", "No"),
      e("engage", "end_next"),
    ],
  },

  /* ── 3. Works Exploration ── */
  {
    title: "Works",
    persona: {
      ko: "포트폴리오를 평가하러 온 채용 담당자",
      en: "Recruiter evaluating portfolio work",
    },
    description: {
      ko: "가로 스크롤 갤러리에서 프로젝트를 골라 Live Demo를 보거나, GitHub에서 코드를 확인하는 흐름",
      en: "Pick a project from the horizontal gallery, try the live demo, or check the code on GitHub",
    },
    nodes: [
      /* row 1: 수직 체인 (루프백 여백 확보) */
      n("start", "start", 1, 3, "Works 페이지\n방문", "Visit Works Page"),
      n("browse", "action", 1, 4, "Works 페이지 둘러보기", "Browse Works Page"),
      n(
        "gallery",
        "decision",
        1,
        5,
        "궁금한 프로젝트\n발견?",
        "Found an\ninteresting project?",
      ),
      /* row 2: Yes 분기 */
      n("detail", "action", 2, 3, "상세 페이지 열람", "View Detail Page"),
      n("demo_q", "decision", 2, 4, "직접\n사용해볼까?", "Try it\nlive?"),
      n("github", "action", 2, 5, "GitHub 버튼 클릭", "Click GitHub"),
      n(
        "end_github",
        "action",
        2,
        6,
        "Readme, 코드 살펴보기",
        "Read README & Code",
      ),
      /* row 4: demo Yes 체인 */
      n("visit", "action", 4, 4, "Live Demo 클릭", "Click Live Demo"),
      n(
        "like_q",
        "decision",
        4,
        5,
        "작업물이\n마음에 들까?",
        "Like the\nproject?",
      ),
      n("like", "action", 4, 6, "♥ 좋아요 누르기", "Press ♥ Like"),
      n("end", "end", 6, 5, "다음 작품으로", "Next Project"),
    ],
    edges: [
      e("start", "browse"),
      e("browse", "gallery"),
      e("gallery", "detail", "Yes"),
      e("gallery", "browse", "No"),
      e("detail", "demo_q"),
      e("demo_q", "visit", "Yes"),
      e("demo_q", "github", "No"),
      e("github", "end_github"),
      e("visit", "like_q"),
      e("like_q", "like", "Yes"),
      e("like_q", "end", "No"),
      e("like", "end"),
      e("end_github", "like_q"),
    ],
  },

  /* ── 4. Profile Journey ── */
  {
    title: "Profile",
    persona: {
      ko: "개발자의 배경과 철학이 궁금한 방문자",
      en: "Visitor curious about the developer's background and philosophy",
    },
    description: {
      ko: "프로필 페이지에서 자기소개를 읽고, 3D Bunny Showcase를 감상하며, 연락을 남기는 흐름",
      en: "Read the self-introduction, enjoy the 3D Bunny Showcase, and reach out via contact",
    },
    nodes: [
      n("start", "start", 0, 3, "Profile\n페이지 방문", "Visit Profile Page"),
      n("read", "action", 0, 4, "자기소개 읽기", "Read Introduction"),
      n("more_q", "decision", 1, 3, "더\n알아볼까?", "Learn\nmore?"),
      n("contact_q", "decision", 1, 4, "연락\n할까?", "Want to\ncontact?"),
      n("touch", "action", 1, 5, "Get in Touch\n클릭", "Click\nGet in Touch"),
      n("nav", "action", 2, 3, "네비게이션 메뉴 클릭", "Click Nav Menu"),
      n("end_nav", "end", 3, 3, "다른 페이지 이동", "Navigate to Other Page"),
      n("end_leave", "end", 2, 4, "사이트 이탈", "Leave Site"),
      n("end_sent", "end", 2, 5, "메시지 전송", "Message Sent"),
    ],
    edges: [
      e("start", "read"),
      e("read", "more_q"),
      e("more_q", "nav", "Yes"),
      e("nav", "end_nav"),
      e("more_q", "contact_q", "No"),
      e("contact_q", "touch", "Yes"),
      e("contact_q", "end_leave", "No"),
      e("touch", "end_sent"),
    ],
  },

  /* ── 5. Contact Message ── */
  {
    title: "Contact",
    persona: {
      ko: "프로젝트 의뢰를 위해 연락하는 클라이언트",
      en: "Client reaching out for a project",
    },
    description: {
      ko: "Get in Touch 버튼으로 Drawer를 열고, 이름·이메일·메시지를 채워 reCAPTCHA를 거쳐 전송하는 흐름",
      en: "Open the drawer via Get in Touch, fill in name, email, and message, pass reCAPTCHA, and send",
    },
    nodes: [
      n("start", "start", 0, 3, "Get in Touch\n클릭", "Click\nGet in Touch"),
      n("open", "action", 0, 4, "Drawer 슬라이드 인", "Drawer Slides In"),
      n(
        "form",
        "action",
        0,
        5,
        "이름 · 이메일 · 제목 입력",
        "Enter Name · Email · Subject",
      ),
      n("msg", "action", 0, 6, "메시지 작성", "Write Message"),
      n(
        "attach_q",
        "decision",
        1,
        3,
        "파일 첨부\n지원?",
        "File Attach\nAvailable?",
      ),
      n("file_q", "decision", 2, 3, "파일\n첨부할까?", "Attach\na file?"),
      n("skip", "action", 2, 4, "첨부 없이 진행", "Continue w/o File"),
      n("upload", "action", 3, 3, "PDF · DOC 업로드", "Upload PDF · DOC"),
      n(
        "captcha",
        "action",
        2,
        5,
        "개인정보 동의 · reCAPTCHA",
        "Privacy · reCAPTCHA",
      ),
      n("send", "action", 2, 6, "Submit 버튼 클릭", "Click Submit"),
      n("end", "end", 3, 6, "전송 완료!", "Message Sent!"),
    ],
    edges: [
      e("start", "open"),
      e("open", "form"),
      e("form", "msg"),
      e("msg", "attach_q"),
      e("attach_q", "file_q", "Yes"),
      e("attach_q", "skip", "No"),
      e("file_q", "upload", "Yes"),
      e("file_q", "skip", "No"),
      e("upload", "captcha"),
      e("skip", "captcha"),
      e("captcha", "send"),
      e("send", "end"),
    ],
  },

  /* ── 6. Comment Interaction ── */
  {
    title: "Comment",
    persona: {
      ko: "글에 공감해서 댓글을 남기는 독자",
      en: "Engaged reader leaving a comment",
    },
    description: {
      ko: "게시물 하단에서 댓글을 작성하고, 다른 댓글을 번역·이모지 반응하거나, 비밀번호로 수정·삭제하는 흐름",
      en: "Write a comment, translate or react to others, or edit/delete your own with a password",
    },
    nodes: [
      n("start", "start", 0, 3, "게시물 하단\n도착", "Reach\nPost Bottom"),
      n("write", "action", 0, 4, "댓글 작성 · 등록", "Write & Submit"),
      n(
        "manage_q",
        "decision",
        0,
        5,
        "내 댓글\n수정·삭제?",
        "Edit/Delete\nmy comment?",
      ),
      n(
        "read_q",
        "decision",
        0,
        6,
        "다른 댓글\n읽을까?",
        "Read other\ncomments?",
      ),
      n("manage", "action", 1, 3, "비밀번호 입력", "Enter Password"),
      n("end", "end", 2, 3, "수정·삭제 완료", "Edit/Delete Done"),
      n("translate", "action", 1, 5, "자동 번역·읽기", "Auto Translate · Read"),
      n(
        "like_q",
        "decision",
        1,
        6,
        "반응하고 싶은\n댓글 발견?",
        "Found a comment\nto react to?",
      ),
      n("like", "action", 2, 6, "이모지 반응 남기기", "Leave an emoji reaction"),
      n("end_done", "end", 3, 6, "피드백 완료", "Feedback Done"),
    ],
    edges: [
      e("start", "write"),
      e("write", "manage_q"),
      e("manage_q", "manage", "Yes"),
      e("manage_q", "read_q", "No"),
      e("manage", "end"),
      e("read_q", "translate", "Yes"),
      e("translate", "like_q"),
      e("like_q", "like", "Yes"),
      e("like", "end_done"),
      e("like_q", "read_q", "No"),
    ],
  },

  /* ── 7. Admin/Settings ── */
  {
    title: "Admin/Settings",
    persona: {
      ko: "사이트 설정을 미세 조정 중인 관리자",
      en: "Admin fine-tuning site settings",
    },
    description: {
      ko: "로그인 후 Settings로 리다이렉션되어 콘텐츠·프로필·계정 설정을 수정하고 저장 또는 초기화하는 흐름",
      en: "After login, redirect to Settings to modify content, profile, or account settings, then save or reset",
    },
    nodes: [
      n(
        "start",
        "start",
        0,
        3,
        "/admin/login\n페이지 접속",
        "Go to\n/admin/login",
      ),
      n(
        "login",
        "action",
        0,
        4,
        "이메일 · 비밀번호\n입력",
        "Enter Email\n& Password",
      ),
      n("auth_q", "decision", 0, 5, "인증\n성공?", "Auth\npassed?"),
      n("denied", "end", 0, 6, "접근 거부", "Access Denied"),
      n(
        "settings",
        "action",
        1,
        3,
        "Settings\n리다이렉션",
        "Redirect\nto Settings",
      ),
      n("edit_q", "decision", 1, 4, "수정할\n설정 존재?", "Settings\nto edit?"),
      n(
        "end_leave",
        "end",
        1,
        5,
        "Posts · Works\n페이지로 이동",
        "Go to Posts ·\nWorks Page",
      ),
      n("edit", "action", 2, 3, "내용 수정", "Edit Content"),
      n("like_q", "decision", 2, 4, "마음에\n드나?", "Satisfied?"),
      n("reset", "action", 2, 5, "초기화 클릭", "Click Reset"),
      n("save", "action", 3, 3, "전체 저장 클릭", "Click Save All"),
      n("end_saved", "end", 4, 3, "저장 완료\n새로고침", "Saved\nRefreshed"),
      n("end_reset", "end", 3, 5, "초기화 완료", "Reset Done"),
    ],
    edges: [
      e("start", "login"),
      e("login", "auth_q"),
      e("auth_q", "settings", "Yes"),
      e("auth_q", "denied", "No"),
      e("settings", "edit_q"),
      e("edit_q", "edit", "Yes"),
      e("edit_q", "end_leave", "No"),
      e("edit", "like_q"),
      e("like_q", "save", "Yes"),
      e("like_q", "reset", "No"),
      e("save", "end_saved"),
      e("reset", "end_reset"),
    ],
  },

  /* ── 8. Admin/Settings/Appearance ── */
  {
    title: "Admin/Settings/Appearance",
    persona: {
      ko: "나만의 테마를 만들고 싶은 사용자",
      en: "Power user crafting a custom theme",
    },
    description: {
      ko: "설정 페이지에서 Appearance 탭을 열고, 테마 프리셋과 Google Fonts를 골라 실시간으로 미리보는 과정",
      en: "Open the Appearance tab in settings, pick a theme preset and Google Font, and preview in real-time",
    },
    nodes: [
      n("start", "start", 0, 3, "Settings 열기", "Open Settings"),
      n("tab", "action", 0, 4, "Appearance\n탭 선택", "Select\nAppearance"),
      n(
        "theme_q",
        "decision",
        1,
        3,
        "테마 색\n바꿀까?",
        "Change theme\ncolor?",
      ),
      n("font_q", "decision", 1, 5, "폰트\n바꿀까?", "Change\nfont?"),
      n("keep", "action", 0, 5, "현재 테마 유지", "Keep Current"),
      n("preset", "action", 2, 3, "프리셋 카드 클릭", "Click Preset Card"),
      n("custom", "action", 2, 4, "커스텀 테마 색 설정", "Custom Theme Color"),
      n(
        "preset_font",
        "action",
        2,
        5,
        "프리셋 폰트 선택",
        "Select Preset Font",
      ),
      n(
        "font",
        "action",
        2,
        6,
        "Google Fonts\n검색 및 입력",
        "Search & Enter\nGoogle Fonts",
      ),
      n("end", "end", 4, 5, "커스텀 적용 완료", "Custom Applied", 148),
      n("end_keep", "end", 0, 6, "설정 닫기", "Close Settings"),
    ],
    edges: [
      e("start", "tab"),
      e("tab", "theme_q"),
      e("theme_q", "preset", "Yes"),
      e("theme_q", "custom", "Yes"),
      e("theme_q", "font_q", "No"),
      e("keep", "end_keep"),
      e("font_q", "font", "Yes"),
      e("font_q", "preset_font"),
      e("font_q", "keep", "No"),
      e("preset", "end"),
      e("custom", "end"),
      e("font", "end"),
      e("preset_font", "end"),
    ],
  },

  /* ── 8. Admin/Posts · Works ── */
  {
    title: "Admin/Posts · Works",
    persona: {
      ko: "게시물과 작업물을 관리하는 사이트 소유자",
      en: "Site owner managing posts & works",
    },
    description: {
      ko: "대시보드에서 게시물·작업물을 작성·수정·삭제하거나 발행을 취소하는 콘텐츠 관리 흐름",
      en: "Manage content from the dashboard — create, edit, delete posts/works, or unpublish them",
    },
    nodes: [
      n("start", "start", 0, 3, "Posts · Works\n접속", "Open Posts ·\nWorks"),
      n("dashboard", "action", 0, 6, "대시보드 열람", "Browse Dashboard", 148),
      n("create", "decision", 1, 3, "새 게시물\n작성?", "Write new\npost?"),
      n("edit", "decision", 1, 4, "게시물\n수정?", "Edit\npost?"),
      n("delete_q", "decision", 1, 5, "게시물\n삭제?", "Delete\npost?"),
      n(
        "unpublish",
        "decision",
        1,
        6,
        "게시물\n발행 취소?",
        "Unpublish\npost?",
      ),
      n("end_editor", "action", 2, 3, "에디터 진입", "Open Editor"),
      n("write", "action", 2, 4, "글 작성 및 수정", "Write & Edit"),
      n("uncheck", "action", 2, 6, "체크박스 해제", "Uncheck Checkbox"),
      n(
        "cover_q",
        "decision",
        3,
        4,
        "커버 이미지\n선택?",
        "Select cover\nimage?",
      ),
      n("end_unpub", "end", 3, 6, "임시저장으로\n전환", "Switch to\nDraft"),
      n("attach_q", "decision", 4, 3, "이미지\n첨부?", "Attach\nimage?"),
      n(
        "preset_q",
        "decision",
        4,
        4,
        "프리셋 이미지\n사용?",
        "Use preset\nimage?",
      ),
      n(
        "ai_q",
        "decision",
        4,
        5,
        "AI 생성 이미지\n사용?",
        "Use AI-generated\nimage?",
      ),
      n("del_click", "action", 4, 6, "삭제 버튼 클릭", "Click Delete"),
      n("keyword", "action", 5, 5, "키워드 입력", "Enter Keywords"),
      n("del_conf", "decision", 5, 6, "정말로\n삭제?", "Really\ndelete?"),
      n("generate", "action", 6, 5, "이미지 생성", "Generate Image"),
      n("del_title", "action", 6, 6, "제목 입력", "Enter Title"),
      n("upload_done", "end", 7, 4, "업로드 완료", "Upload Done", 40),
      n("end_del", "end", 7, 6, "삭제 완료", "Deleted"),
    ],
    edges: [
      e("start", "dashboard"),
      e("dashboard", "unpublish"),
      e("create", "edit", undefined, true),
      e("edit", "delete_q", undefined, true),
      e("delete_q", "unpublish", undefined, true),
      e("create", "end_editor", "Yes"),
      e("edit", "end_editor", "Yes"),
      e("end_editor", "write"),
      e("write", "cover_q"),
      e("cover_q", "preset_q", "Yes"),
      e("cover_q", "upload_done", "No"),
      e("attach_q", "preset_q", undefined, true),
      e("preset_q", "ai_q", undefined, true),
      e("attach_q", "upload_done"),
      e("preset_q", "upload_done"),
      e("ai_q", "keyword", "Yes"),
      e("keyword", "generate"),
      e("generate", "upload_done"),
      e("delete_q", "del_click", "Yes"),
      e("del_click", "del_conf"),
      e("del_conf", "del_title", "Yes"),
      e("del_conf", "dashboard", "No"),
      e("del_title", "end_del"),
      e("unpublish", "uncheck", "Yes"),
      e("uncheck", "end_unpub"),
      e("unpublish", "dashboard", "No"),
    ],
  },
];

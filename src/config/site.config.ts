/**
 * =============================================================================
 * 사이트 설정
 * =============================================================================
 *
 * 포트폴리오의 메인 설정 파일입니다.
 * 아래 값들을 수정하여 자신의 정보로 사이트를 커스터마이즈하세요.
 *
 * 수정 후 변경 사항은 사이트 전체에 반영됩니다.
 * =============================================================================
 */

export const siteConfig = {
  // ---------------------------------------------------------------------------
  // 개인 정보
  // ---------------------------------------------------------------------------
  personal: {
    name: "Kim JeongHyeon", // 전체 이름
    nickname: "HYEON", // 표시 이름 / 닉네임
    role: "Frontend Focused Fullstack Developer", // 직함
    location: "Seoul, KR", // 위치
    status: "Open to Opportunities", // 현재 상태 (예: "채용 가능", "구직 중")
    profileImage: "/images/profile_pic.webp", // 프로필 사진 경로 (works detail TEAM 등에 사용)
  },

  // ---------------------------------------------------------------------------
  // 브랜드 / 사이트 아이덴티티
  // ---------------------------------------------------------------------------
  brand: {
    logoText: "H", // 숏 로고 텍스트 (이미지 미사용 시)
    logoFullText: "HYEONIVERSE", // 풀 로고 텍스트 (이미지 미사용 시, 로딩 화면)
    logoColor: "", // 라이트 모드 로고 색상 (빈 문자열 = 기본 텍스트 색상)
    logoColorDark: "", // 다크 모드 로고 색상 (빈 문자열 = 기본 텍스트 색상)
    logoGlitch: true, // 로고 글리치 효과 on/off
    logoDifference: true, // 네비 mix-blend-mode: difference on/off (배경에 따라 자동 반전)
    faviconShape: "circle" as "circle" | "square" | "none", // 브라우저 탭 favicon 배경 모양
    logoShortUrl: "", // 빈 문자열 = 텍스트 로고(logoText) 사용
    logoShortDarkUrl: "", // 다크 모드 숏 로고 (빈 문자열 = logoShortUrl 사용)
    logoFullUrl: "", // 빈 문자열 = 텍스트 로고(displayName) 사용
    logoFullDarkUrl: "", // 다크 모드 풀 로고 (빈 문자열 = logoFullUrl 사용)
    // 로고 색상 프리셋 — 관리자가 추가/삭제 가능. 빈 light/dark = "기본 텍스트 색상" 의미
    logoColorPresets: [
      { name: "Default", light: "", dark: "" },
      { name: "Accent", light: "#d40063", dark: "#ff4d8d" },
      { name: "Navy", light: "#1c3d5a", dark: "#a8c8e8" },
      { name: "Forest", light: "#2a4035", dark: "#b0be97" },
      { name: "Warm", light: "#5c3a1a", dark: "#f5cac3" },
      { name: "Coral", light: "#c44536", dark: "#ffa07a" },
      { name: "Violet", light: "#5b2c6f", dark: "#d4a5f5" },
      { name: "Teal", light: "#1a6b5a", dark: "#7eddd3" },
      { name: "Gold", light: "#8b6914", dark: "#f6d860" },
    ] as { name: string; light: string; dark: string }[],
  },

  // ---------------------------------------------------------------------------
  // 연락처 & 소셜 링크
  // ---------------------------------------------------------------------------
  contact: {
    email: "hyeoniverse.dev@gmail.com", // 기본 연락 이메일
  },

  // ---------------------------------------------------------------------------
  // 이메일 서비스 설정
  // ---------------------------------------------------------------------------
  // 이메일 서비스 제공자 선택: "web3forms" | "formspree" | "emailjs"
  // .env.local에 해당하는 환경 변수를 설정해야 합니다
  //
  // Web3Forms의 경우:
  //   NEXT_PUBLIC_WEB3FORMS_KEY=your_access_key
  //
  // Formspree의 경우:
  //   NEXT_PUBLIC_FORMSPREE_ID=your_form_id
  //
  // EmailJS의 경우:
  //   NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
  //   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
  //   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
  // ---------------------------------------------------------------------------
  emailService: {
    provider: "formspree" as "web3forms" | "formspree" | "emailjs",
    // 파일 첨부 지원:
    // - Web3Forms: 유료 플랜만 (최대 10MB)
    // - Formspree: 무료 (최대 10MB)
    // - EmailJS: Base64 인코딩 (최대 500KB)
    enableFileUpload: false,
  },

  // ---------------------------------------------------------------------------
  // reCAPTCHA 설정
  // ---------------------------------------------------------------------------
  // version: "v3" (보이지 않음, 권장) | "v2" (체크박스)
  // .env.local에 NEXT_PUBLIC_RECAPTCHA_SITE_KEY를 설정하세요
  // Google reCAPTCHA 콘솔에서 올바른 키 유형을 생성해야 합니다
  // ---------------------------------------------------------------------------
  recaptcha: {
    enabled: true,
    version: "v3" as "v2" | "v3",
  },

  // 소셜 링크 (순서 변경·추가 가능, 최대 6개 표시)
  // platform: github | linkedin | blog | twitter | instagram | youtube | behance | dribbble | custom
  socialLinks: [
    { platform: "github", url: "https://github.com" },
    { platform: "linkedin", url: "https://linkedin.com" },
    { platform: "blog", url: "https://velog.io" },
  ] as { platform: string; url: string; label?: string; icon?: string }[],

  // ---------------------------------------------------------------------------
  // SEO 및 메타데이터
  // ---------------------------------------------------------------------------
  metadata: {
    title: "HYEONIVERSE",
    description:
      "Frontend developer creating interactive web experiences with React, Next.js, and TypeScript.",
    keywords:
      "frontend developer, portfolio, React, Next.js, TypeScript, web development, UI/UX",
    author: "Kim JeongHyeon",
    locale: "ko_KR",
  },

  // ---------------------------------------------------------------------------
  // 사이트 콘텐츠
  // ---------------------------------------------------------------------------
  hero: {
    headline: ["Creative", "Developer", "Problem Solver"], // 메인 헤드라인 (각 항목 = 새 줄, 3번째 앞에 & 자동 추가)
    headline_ko: ["Creative", "Developer", "Problem Solver"],
    subtext: ["Based in Seoul, KR", "Open to Opportunities"],
    subtext_ko: ["Based in Seoul, KR", "Open to Opportunities"],
    scrollLabel: "Scroll down",
    scrollLabel_ko: "Scroll down",
  },

  // 홈 페이지 3D 오브젝트 활성화 토글 (Three.js 번들 약 300KB)
  home3d: {
    scrollTorus: true, // 스크롤 따라다니는 메탈릭 토러스
    coffeeCup: true,   // CTA 섹션의 3D 커피잔 + 라떼아트
  },

  // 홈 Intro 섹션 — {중괄호} 안의 텍스트가 하이라이트 처리됨
  homeIntro: {
    tagline:
      "I craft digital experiences where {aesthetics} meet {functionality}.",
    tagline_ko: "{미학}과 {기능}이 만나는 디지털 경험을 만듭니다.",
    description:
      "Focused on creating memorable interactions through thoughtful {design} and clean {code}.",
    description_ko:
      "세심한 {디자인}과 깔끔한 {코드}로 기억에 남는 인터랙션을 만드는 데 집중합니다.",
  },

  // 홈 Services 섹션
  services: {
    label: "What I Do",
    label_ko: "What I Do",
    items: [
      {
        num: "01",
        title: "Web Development",
        title_ko: "Web Development",
        desc: "React, Next.js, TypeScript",
        desc_ko: "React, Next.js, TypeScript",
      },
      {
        num: "02",
        title: "UI/UX Design",
        title_ko: "UI/UX Design",
        desc: "Figma, Prototyping, Systems",
        desc_ko: "Figma, Prototyping, Systems",
      },
      {
        num: "03",
        title: "Motion Design",
        title_ko: "Motion Design",
        desc: "GSAP, Framer Motion, CSS",
        desc_ko: "GSAP, Framer Motion, CSS",
      },
      {
        num: "04",
        title: "Brand Identity",
        title_ko: "Brand Identity",
        desc: "Visual Language, Guidelines",
        desc_ko: "Visual Language, Guidelines",
      },
    ],
  },

  // 홈 Marquee 섹션
  marquee: {
    words: ["CREATIVE", "FRONTEND", "DEVELOPER", "INNOVATOR"],
    words_ko: ["CREATIVE", "FRONTEND", "DEVELOPER", "INNOVATOR"],
  },

  cta: {
    label: "Reach out anytime!",
    label_ko: "Reach out anytime!",
    title: ["Up for a", "coffee chat?"],
    title_ko: ["Up for a", "coffee chat?"],
    buttonText: "Get in touch",
    buttonText_ko: "Get in touch",
    resumeUrl: "/docs/resume.pdf",
    resumeButtonText: "Download Resume",
    resumeButtonText_ko: "이력서 다운로드",
  },

  footer: {
    copyright: `HYEON © ${new Date().getFullYear()}, All Rights Reserved`,
    copyright_ko: `HYEON © ${new Date().getFullYear()}, All Rights Reserved`,
    musicCreditTitle: "Ghost Duet",
    musicCreditArtist: "Louie Zong  ",
    musicCreditUrl: "https://www.youtube.com/channel/UCdkkQvJoB0kGgYHCYwSkdww",
  },

  // ---------------------------------------------------------------------------
  // 배경 음악
  // ---------------------------------------------------------------------------
  bgm: {
    url: "/sounds/Louie Zong - Ghost Duet.mp3",
  },

  // ---------------------------------------------------------------------------
  // 미디어 업로드
  // ---------------------------------------------------------------------------
  media: {
    // 파일 형식별 최대 업로드 크기 (MB)
    limits: {
      "image/jpeg": 5,
      "image/png": 5,
      "image/webp": 5,
      "image/svg+xml": 2,
      "image/gif": 10,
      "video/mp4": 50,
      "video/webm": 50,
      "audio/mpeg": 20,
      "audio/wav": 20,
      "audio/ogg": 20,
      "application/pdf": 20,
      "application/zip": 50,
      _default: 20, // 기타 파일
    } as Record<string, number>,
    // 차단 확장자
    blockedExtensions: [
      "exe", "bat", "cmd", "com", "msi", "scr", "pif",
      "sh", "bash", "csh", "ksh",
      "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1",
      "dll", "sys", "drv",
    ] as string[],
  },

  // ---------------------------------------------------------------------------
  // 로딩 화면
  // ---------------------------------------------------------------------------
  loading: {
    displayName: "Hyeoniverse", // 로딩 화면에 표시되는 이름
  },

  // ---------------------------------------------------------------------------
  // 테마 색상 커스터마이징
  // ---------------------------------------------------------------------------
  theme: {
    accentColor: "#d40063", // 브랜드 액센트 색상
    lightBg: "#f5f5f0", // 라이트 모드 배경
    lightText: "#1a1a1a", // 라이트 모드 텍스트
    darkBg: "#0a0a0a", // 다크 모드 배경
    darkText: "#f5f5f0", // 다크 모드 텍스트
  },

  // ---------------------------------------------------------------------------
  // 타이포그래피
  // ---------------------------------------------------------------------------
  typography: {
    headingFont: "Instrument Serif", // Display/Heading 폰트
    bodyFont: "Space Grotesk", // Body/UI 폰트
    monoFont: "JetBrains Mono", // Monospace 폰트
  },

  // ---------------------------------------------------------------------------
  // Posts 페이지
  // ---------------------------------------------------------------------------
  posts: {
    bannerLayout: "fullwidth" as "fullwidth" | "split" | "cards" | "ticker",
    bannerStyle: "editorial" as
      | "editorial"
      | "minimal"
      | "cinematic"
      | "magazine",
    bannerTransition: "cylinder" as "default" | "cylinder",
    perPage: 10,
    adminPerPage: 20,
    categories: [
      { ko: "프론트엔드", en: "Frontend", description: "" },
      { ko: "백엔드", en: "Backend", description: "" },
      { ko: "DevOps", en: "DevOps", description: "" },
      { ko: "알고리즘", en: "Algorithm", description: "" },
      { ko: "CS", en: "CS", description: "" },
      { ko: "도구·생산성", en: "Tools & Productivity", description: "" },
      { ko: "회고", en: "Retrospective", description: "" },
      { ko: "일상", en: "Life", description: "" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Works 페이지
  // ---------------------------------------------------------------------------
  works: {
    layout: "flow" as "flow" | "fullscreen" | "cinematic" | "grid" | "split" | "cylinder",
    adminPerPage: 20,
    categories: [
      { ko: "웹앱", en: "Web App", description: "" },
      { ko: "모바일 앱", en: "Mobile App", description: "" },
      { ko: "데스크탑 앱", en: "Desktop App", description: "" },
      { ko: "라이브러리", en: "Library", description: "" },
      { ko: "도구", en: "Tool", description: "" },
      { ko: "디자인 시스템", en: "Design System", description: "" },
      { ko: "게임", en: "Game", description: "" },
      { ko: "API · 백엔드", en: "Backend", description: "" },
      { ko: "AI / ML", en: "AI / ML", description: "" },
      { ko: "자동화", en: "Automation", description: "" },
      { ko: "확장 프로그램", en: "Extension", description: "" },
      { ko: "인터랙티브 / 비주얼", en: "Interactive / Visual", description: "" },
    ],
    infiniteScroll: true,
    introLabel: "Junior Frontend Developer",
    introLabel_ko: "Junior Frontend Developer",
    introTitle: "My Projects",
    introTitle_ko: "My Projects",
    introTagline: "A Growing Developer's Journey",
    introTagline_ko: "성장하는 개발자의 기록",
    introDesc:
      "A passionate junior frontend developer dedicated to creating user-centered, interactive web experiences.",
    introDesc_ko:
      "사용자 중심의 인터랙티브한 웹 경험을 만드는 것에 열정을 가진 신입 프론트엔드 개발자입니다.",
    introDetail:
      "Showcasing projects built through self-driven learning and hands-on practice. Explore the problem-solving process and technical growth behind each one.",
    introDetail_ko:
      "개인 프로젝트와 학습 과정에서 쌓아온 작업물들을 소개합니다. 각 프로젝트에 담긴 문제 해결 과정과 기술적 성장을 확인해 주세요.",
    introQuote: "Every line of code today shapes who I become tomorrow",
    introQuote_ko: "매일 한 줄의 코드가 내일의 나를 만든다",
    introScope: "React · Next.js · TypeScript · GSAP · Framer Motion",
    introScope_ko: "React · Next.js · TypeScript · GSAP · Framer Motion",
    // Fullscreen / Split / Grid 레이아웃 인트로 배경 영상 URL.
    // 빈 문자열 = "/intro-bg.mp4" (로컬 public/) fallback. 100MB 초과 자산은 외부 CDN 권장.
    introVideoUrl: "",
    statsProjects: "Projects",
    statsProjects_ko: "프로젝트",
    statsClients: "Tech Stack",
    statsClients_ko: "기술 스택",
  },

  // ---------------------------------------------------------------------------
  // AI 커버 이미지 생성
  // ---------------------------------------------------------------------------
  // provider: "nanobanana" | "huggingface"
  //
  // NanoBanana (Gemini 2.5 Flash):
  //   NANOBANANA_API_KEY=your_api_key  (https://nanobananaapi.ai/api-key)
  //
  // Hugging Face (FLUX.1-schnell 등):
  //   HUGGINGFACE_API_KEY=your_token  (https://huggingface.co/settings/tokens)
  // ---------------------------------------------------------------------------
  aiCover: {
    enabled: true,
    provider: "nanobanana" as "nanobanana" | "huggingface",
    fallback: {
      enabled: false,
      priority: [] as ("nanobanana" | "huggingface")[],
      excluded: [] as ("nanobanana" | "huggingface")[],
    },
  },

  // ---------------------------------------------------------------------------
  // AI 요약 설정
  // ---------------------------------------------------------------------------
  // provider: "gemini" | "openai" | "claude"
  //
  // Gemini (기본):
  //   GEMINI_API_KEY=your_key  (https://aistudio.google.com/apikey)
  //
  // OpenAI:
  //   OPENAI_API_KEY=your_key  (https://platform.openai.com/api-keys)
  //
  // Claude:
  //   ANTHROPIC_API_KEY=your_key  (https://console.anthropic.com/settings/keys)
  // ---------------------------------------------------------------------------
  aiSummary: {
    enabled: true,
    provider: "gemini" as "gemini" | "openai" | "claude",
    // 폴백 설정: 기본 제공자 실패 시 순서대로 시도
    fallback: {
      enabled: false,
      priority: [] as ("gemini" | "openai" | "claude")[],
      excluded: [] as ("gemini" | "openai" | "claude")[],
    },
  },

  // ---------------------------------------------------------------------------
  // 번역 설정
  // ---------------------------------------------------------------------------
  // provider: "gemini" | "google" | "deepl" | "claude"
  //
  // Gemini (기본):
  //   GEMINI_API_KEY=your_key  (https://aistudio.google.com/apikey)
  //
  // Google Cloud Translation:
  //   GOOGLE_TRANSLATE_API_KEY=your_key  (https://console.cloud.google.com)
  //
  // DeepL:
  //   DEEPL_API_KEY=your_key  (https://www.deepl.com/pro-api)
  //
  // Claude:
  //   ANTHROPIC_API_KEY=your_key  (https://console.anthropic.com/settings/keys)
  // ---------------------------------------------------------------------------
  translation: {
    enabled: true,
    provider: "deepl" as "gemini" | "google" | "deepl" | "claude",
    // 폴백 설정: 기본 제공자 실패 시 순서대로 시도
    fallback: {
      enabled: false,
      priority: [] as ("gemini" | "google" | "deepl" | "claude")[],
      excluded: [] as ("gemini" | "google" | "deepl" | "claude")[],
    },
  },

  // ---------------------------------------------------------------------------
  // Profile 페이지
  // ---------------------------------------------------------------------------
  profile: {
    bunnyCollisionSound: true,
    infiniteScroll: true,
    title: "About Me",
    title_ko: "About Me",
    intro:
      "Frontend-focused fullstack developer. I like learning by building things myself.",
    intro_ko:
      "프론트엔드 중심 풀스택 개발자. 직접 만들어보면서 배우는 걸 좋아합니다.",
    bioHighlight: "I started coding because I liked making things.",
    bioHighlight_ko: "만드는 게 좋아서 개발을 시작했습니다.",
    bioText1:
      "Studied CS in college and got into web dev along the way. Worked on both frontend and backend, but frontend clicked the most — seeing results on screen right away just fits me.",
    bioText1_ko:
      "대학에서 컴퓨터공학을 전공하면서 웹 개발에 관심을 갖게 됐고, 프론트엔드부터 백엔드까지 직접 만져보면서 공부했습니다. 특히 화면에 바로 결과가 보이는 프론트엔드 쪽이 잘 맞았습니다.",
    bioText2:
      "Built this portfolio from scratch, picking up GSAP and Framer Motion in the process. I learn best by jumping in and figuring things out as I go.",
    bioText2_ko:
      "이 포트폴리오도 직접 기획부터 개발까지 했고, 그 과정에서 GSAP, Framer Motion 같은 애니메이션 라이브러리도 익혔습니다. 모르는 건 부딪혀보면서 배우는 편입니다.",
    bioText3: "",
    bioText3_ko: "",
    statsYearsValue: "4+",
    statsYears: "Projects",
    statsYears_ko: "프로젝트",
    statsProjectsValue: "6+",
    statsProjects: "Tech Stack",
    statsProjects_ko: "기술 스택",
    statsClientsValue: "100%",
    statsClients: "Passion",
    statsClients_ko: "열정",
  },

  // ---------------------------------------------------------------------------
  // About 페이지
  // ---------------------------------------------------------------------------
  about: {
    // 무한 스크롤 활성화 여부 (false: 끝에서 멈춤)
    infiniteScroll: true,
  },

  // ---------------------------------------------------------------------------
  // 댓글 이메일 알림 수신 여부 (기본: 미수신)
  // ---------------------------------------------------------------------------
  commentEmailNotify: false,

  // ---------------------------------------------------------------------------
  // 비밀번호 정책
  // ---------------------------------------------------------------------------
  // "secure": 8자 이상 + 대문자·소문자·숫자·특수문자 포함
  // "default": Supabase 기본 (6자 이상)
  passwordPolicy: "secure" as "secure" | "default",

  // ---------------------------------------------------------------------------
  // DatePicker 스타일 ("spinner" | "calendar")
  // ---------------------------------------------------------------------------
  datePickerStyle: "spinner" as "spinner" | "calendar",

  // ---------------------------------------------------------------------------
  // Tag descriptions — /posts/tags/[tag] hero 에 표시 (선택, 빈 값이면 안 보임)
  // key 는 tag name, value 는 설명 텍스트
  // ---------------------------------------------------------------------------
  tagDescriptions: {} as Record<string, string>,
} as const;

// 컴포넌트에서 사용하기 위한 타입 내보내기
export type SiteConfig = typeof siteConfig;

// Mutable version for runtime (DB overrides) — widens literal types
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T;
type DeepWritable<T> = {
  -readonly [K in keyof T]: T[K] extends readonly (infer U)[]
    ? Widen<U>[]
    : T[K] extends object
      ? DeepWritable<T[K]>
      : Widen<T[K]>;
};
export type SiteConfigData = DeepWritable<SiteConfig>;

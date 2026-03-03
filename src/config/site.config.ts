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
  },

  // ---------------------------------------------------------------------------
  // 브랜드 / 사이트 아이덴티티
  // ---------------------------------------------------------------------------
  brand: {
    name: "HYEONIVERSE", // 전체 브랜드명 (네비게이션, 경력 섹션에서 사용)
    splitName: ["HYEONI", "VERSE"], // 히어로 화면 표시용 분리된 브랜드명
    tagline: "Creative Digital Agency",
    logoShortUrl: "", // 빈 문자열 = 텍스트 로고("H") 사용
    logoFullUrl: "", // 빈 문자열 = 텍스트 로고(displayName) 사용
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

  social: {
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    blog: "https://velog.io",
  },

  // 소셜 링크 (순서 변경·추가 가능, 최대 6개 표시)
  // platform: github | linkedin | blog | twitter | instagram | youtube | behance | dribbble | custom
  socialLinks: [
    { platform: "github", url: "https://github.com" },
    { platform: "linkedin", url: "https://linkedin.com" },
    { platform: "blog", url: "https://velog.io" },
  ] as { platform: string; url: string; label?: string }[],

  // ---------------------------------------------------------------------------
  // SEO 및 메타데이터
  // ---------------------------------------------------------------------------
  metadata: {
    title: "Hyeoniverse",
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

  // 홈 About 섹션 — {중괄호} 안의 텍스트가 하이라이트 처리됨
  homeAbout: {
    intro:
      "I craft digital experiences where {aesthetics} meet {functionality}.",
    intro_ko: "{미학}과 {기능}이 만나는 디지털 경험을 만듭니다.",
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
    categories: [
      { ko: "프론트엔드", en: "Frontend" },
      { ko: "백엔드", en: "Backend" },
      { ko: "DevOps", en: "DevOps" },
      { ko: "알고리즘", en: "Algorithm" },
      { ko: "CS", en: "CS" },
      { ko: "도구·생산성", en: "Tools & Productivity" },
      { ko: "회고", en: "Retrospective" },
      { ko: "일상", en: "Life" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Works 페이지
  // ---------------------------------------------------------------------------
  works: {
    categories: [
      { ko: "웹", en: "Web" },
      { ko: "모바일", en: "Mobile" },
      { ko: "풀스택", en: "Full Stack" },
      { ko: "오픈소스", en: "Open Source" },
      { ko: "사이드 프로젝트", en: "Side Project" },
      { ko: "클론", en: "Clone" },
      { ko: "AI/ML", en: "AI/ML" },
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
    provider: "nanobanana" as "nanobanana" | "huggingface",
  },

  // ---------------------------------------------------------------------------
  // 번역 설정
  // ---------------------------------------------------------------------------
  // provider: "gemini" | "google" | "deepl"
  //
  // Gemini (기본):
  //   GEMINI_API_KEY=your_key  (https://aistudio.google.com/apikey)
  //
  // Google Cloud Translation:
  //   GOOGLE_TRANSLATE_API_KEY=your_key  (https://console.cloud.google.com)
  //
  // DeepL:
  //   DEEPL_API_KEY=your_key  (https://www.deepl.com/pro-api)
  // ---------------------------------------------------------------------------
  translation: {
    provider: "deepl" as "gemini" | "google" | "deepl",
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
    bioText3:
      "The little bunny floating around is my portfolio companion — it follows your cursor, reacts to scrolling, and comments on each section. Say hi!",
    bioText3_ko:
      "화면 위를 떠다니는 토끼는 이 포트폴리오의 마스코트입니다. 커서를 따라다니고, 스크롤에 반응하며, 각 섹션마다 한마디씩 남깁니다. 인사해 주세요!",
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
    // 디자인 컨셉 패널 전환 모드: "strip" (수평 마키) | "stack" (레이어 슬라이드 아웃)
    designConceptTransition: "strip" as "strip" | "stack",
    // 무한 스크롤 활성화 여부 (false: 끝에서 멈춤)
    infiniteScroll: true,
  },

  // ---------------------------------------------------------------------------
  // 댓글 이메일 알림 수신 여부 (기본: 미수신)
  // ---------------------------------------------------------------------------
  commentEmailNotify: false,
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

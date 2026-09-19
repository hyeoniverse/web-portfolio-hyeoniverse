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

import type { Author } from "@/types/author";
import type { LocalizedText } from "@/types/common";
import type { BackendItem, UserFlow, TroubleShootingItem, ErdTable, ErdRelation } from "@/data/about/types";
import type { CustomFont } from "@/lib/customFonts";

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
  // 작성자(Author) 목록 — 게시물의 author_ids 가 여기 id 를 참조. admin 설정에서 관리.
  // ---------------------------------------------------------------------------
  authors: [
    {
      id: "owner",
      name: "Kim JeongHyeon",
      avatar: "/images/profile_pic.webp",
      role: "Frontend Focused Fullstack Developer",
      email: "hyeoniverse.dev@gmail.com",
      bio: "",
      links: [{ platform: "github", url: "https://github.com/hyeoniverse" }],
    },
  ] as Author[],

  // ---------------------------------------------------------------------------
  // 브랜드 / 사이트 아이덴티티
  // ---------------------------------------------------------------------------
  brand: {
    logoText: "H", // 숏 로고 텍스트 (이미지 미사용 시)
    logoFullText: "HYEONIVERSE", // 풀 로고 텍스트 (이미지 미사용 시, 로딩 화면)
    logoColor: "", // 라이트 모드 로고 색상 (빈 문자열 = 기본 텍스트 색상)
    logoColorDark: "", // 다크 모드 로고 색상 (빈 문자열 = 기본 텍스트 색상)
    logoFontStretch: "0.8", // 로고/favicon 글자 장평 (폰트 가로 너비) — scaleX 배수. default 0.8 (좁아야 예쁨)
    logoFont: "'Instrument Serif', serif", // 로고 폰트 (CSS font-family string). 기본 = Instrument Serif
    logoGlitch: true, // 로고 글리치 효과 on/off
    logoDifference: true, // 네비 mix-blend-mode: difference on/off (배경에 따라 자동 반전)
    faviconShape: "circle" as "circle" | "square" | "none", // 브라우저 탭 favicon 배경 모양
    faviconRadius: "", // 배경 모서리 반경 override (0~16, viewBox 0~32 기준). 빈 값 = shape 기본값(circle=16/square=4)
    faviconBgRatio: "1", // 배경 종횡비 w/h (0.5~2). 1=정사각, >1=가로 길쭉(타원/직사각), <1=세로 길쭉. 콘텐츠는 중심 고정
    faviconWeight: "light" as "light" | "regular" | "bold", // favicon 텍스트 weight (default 가장 얇은 light)
    faviconBgLight: "", // 라이트 favicon 배경색 (빈 값 = preset.dark 자동 사용)
    faviconBgDark: "", // 다크 favicon 배경색 (빈 값 = preset.light 자동 사용)
    faviconBorderWidth: "0", // 배경 테두리 두께 (px, viewBox 0~32 기준). 0 = 없음
    faviconBorderColorLight: "", // 라이트 favicon 테두리색 (빈 값 = 없음)
    faviconBorderColorDark: "", // 다크 favicon 테두리색 (빈 값 = 없음)
    faviconFontSize: "20", // favicon 텍스트 폰트 크기 (px, viewBox 0~32 기준). 8~30 clamp
    faviconColor: "", // 라이트 favicon 글자색 override (빈 값 = preset 자동 계산)
    faviconColorDark: "", // 다크 favicon 글자색 override (빈 값 = preset 자동 계산)
    // favicon 텍스트 그림자 — enabled=false 면 미적용 (하위호환). angle: 나침반식 0=위, 시계방향 (135=우하단)
    faviconTextShadow: { enabled: false, inset: false, size: "md", custom: "", color: "", angle: "135" } as { enabled: boolean; inset: boolean; size: "sm" | "md" | "lg" | "custom"; custom: string; color: string; angle: string },
    // favicon 배경(rect) 그림자 — 32×32 라 outer 공간 없어 inset 기본. enabled=false 면 미적용
    faviconBgShadow: { enabled: false, inset: true, size: "md", custom: "", color: "", angle: "135" } as { enabled: boolean; inset: boolean; size: "sm" | "md" | "lg" | "custom"; custom: string; color: string; angle: string },
    // 업로드 favicon(이미지) 전용 — 텍스트 favicon 과 별도. 배경색 빈 값 = 투명(로고만)
    faviconImageBgLight: "", // 업로드 favicon 배경색 (라이트, 빈 값 = 투명)
    faviconImageBgDark: "", // 업로드 favicon 배경색 (다크, 빈 값 = 투명)
    // 업로드 favicon 로고 그림자(드롭)
    faviconImageShadow: { enabled: false, inset: false, size: "md", custom: "", color: "", angle: "135" } as { enabled: boolean; inset: boolean; size: "sm" | "md" | "lg" | "custom"; custom: string; color: string; angle: string },
    // 업로드 favicon 배경(rect) 그림자 — 배경색 있을 때만 의미
    faviconImageBgShadow: { enabled: false, inset: true, size: "md", custom: "", color: "", angle: "135" } as { enabled: boolean; inset: boolean; size: "sm" | "md" | "lg" | "custom"; custom: string; color: string; angle: string },
    // nav + 로딩스크린 로고 그림자(드롭) — favicon 과 별개. 미설정 시 faviconImageShadow 로 fallback(기존 동작 보존)
    logoShadow: { enabled: false, inset: false, size: "md", custom: "", color: "", angle: "135" } as { enabled: boolean; inset: boolean; size: "sm" | "md" | "lg" | "custom"; custom: string; color: string; angle: string },
    logoShortUrl: "", // 빈 문자열 = 텍스트 로고(logoText) 사용
    logoShortDarkUrl: "", // 다크 모드 숏 로고 (빈 문자열 = logoShortUrl 사용)
    logoFullUrl: "", // 빈 문자열 = 텍스트 로고(displayName) 사용
    logoFullDarkUrl: "", // 다크 모드 풀 로고 (빈 문자열 = logoFullUrl 사용)
    // 업로드 로고 리컬러 — 업로드 이미지를 마스크로 이 색을 입혀 표시(모노 로고용). 빈 값 = 원본 그대로
    logoShortColor: "", // 숏 로고(라이트) 리컬러 색
    logoShortColorDark: "", // 숏 로고(다크) 리컬러 색
    logoFullColor: "", // 풀 로고(라이트) 리컬러 색
    logoFullColorDark: "", // 풀 로고(다크) 리컬러 색
    // 로고 색상 프리셋 — 관리자가 추가/삭제 가능. 빈 light/dark = "기본 텍스트 색상" 의미
    logoColorPresets: [
      { name: "Default", light: "", dark: "" },
      { name: "Accent", light: "#7a0038", dark: "#ffb0d0" },
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
    // 콘텐츠 작성 기본 언어 — admin 폼에서 어느 언어를 필수 항목 기준으로 둘지 결정.
    // (방문자에게 보이는 언어와 무관 — 그건 LanguageProvider 가 브라우저/토글로 처리)
    defaultLanguage: "ko" as "ko" | "en",
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

  // ---------------------------------------------------------------------------
  // 홈 Selected Works 섹션 — 원(버블) 그리드를 무엇으로 채울지
  // ---------------------------------------------------------------------------
  // source:
  //   auto   — 작업물 → 표지 있는 발행 글 → GitHub 저장소 순으로 있는 것을 쓴다(기본)
  //   works  — 작업물만. 발행된 작업물이 없으면 섹션을 그리지 않는다
  //   posts  — 표지 있는 발행 글만
  //   github — 아래 repos 에 고른 저장소만
  //
  // repos: github 소스가 쓸 저장소. 고른 순서가 화면 순서다.
  //   표지·제목·설명을 비우면 GitHub 이 주는 값(이름·주 언어)과 언어 색 버블로 돌아간다.
  // ---------------------------------------------------------------------------
  homeWorks: {
    source: "auto" as "auto" | "works" | "posts" | "github",
    repos: [] as {
      /** GitHub 저장소 이름. 조직 저장소는 `owner/name` */
      name: string;
      /** 직접 고른 것인가. false 면 자동으로 나가는 저장소의 내용만 손봐 둔 것이다 */
      picked?: boolean;
      /** 자동 목록에서 빼 둔 것 — 자동으로 뽑혔지만 내보내지 않는다 */
      hidden?: boolean;
      /** 원을 채울 표지 이미지. 비우면 주 언어 색 버블 */
      cover?: string;
      /** 표지를 원 안에서 어디에 맞출지 — 가로·세로 퍼센트. 비우면 가운데 */
      coverX?: number;
      coverY?: number;
      /** 표지 배율 — 1 이 원을 꽉 채우는 크기. 1 아래로 줄이면 그만큼 빈자리가 남는다 */
      coverZoom?: number;
      /** 포인터를 올렸을 때 드러나는 표지. 비우면 기본 표지를 그대로 쓴다 */
      coverHover?: string;
      hoverX?: number;
      hoverY?: number;
      hoverZoom?: number;
      title?: string;
      title_ko?: string;
      /** 대표 기술 한 마디 — 원 아래 줄에 들어간다. 비우면 저장소의 주 언어 */
      tech?: string;
      /** 예전 설정 호환 — 지금 화면은 tech 만 쓴다 */
      description?: string;
      description_ko?: string;
    }[],
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
    /* 올린 파일이 없으면 비운다 — 여기에 예시 파일을 적어 두면 설정에서 이력서를 지워도
       이 값이 되살아나 내려받기 단추가 계속 보인다(빈 문자열은 기본값을 덮지 못한다) */
    resumeUrl: "",
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
    // 파일 형식별 최대 업로드 크기 (MB) — 확장자 키.
    // (브라우저 MIME 은 드문 형식에서 빈 값이라, 업로드 검증의 신뢰 가능한 키는 확장자다)
    limits: {
      // image
      jpg: 5, jpeg: 5, png: 5, webp: 5, svg: 2, gif: 10,
      // video
      mp4: 200, webm: 200, mov: 200, // MOV (iOS 흔함)
      // audio
      mp3: 20, wav: 20, ogg: 20,
      // document
      md: 1, txt: 1, csv: 5, pdf: 20, docx: 20, xlsx: 20, pptx: 50,
      // archive
      zip: 50,
    } as Record<string, number>,
    // 차단 확장자 — 업로드 자체를 거부 (실행/스크립트/웹페이지·XSS 위험 등)
    blockedExtensions: [
      "exe", "bat", "cmd", "com", "msi", "scr", "pif",
      "sh", "bash", "csh", "ksh",
      "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1",
      "dll", "sys", "drv",
      "html", "htm", "xhtml", "svgz", "jar", "swf", "jnlp",
    ] as string[],
    // 차단 MIME — admin 이 limits 에 추가하려 해도 차단되는 보안 정책 (XSS / 실행 파일 / 스크립트 등)
    blockedMimes: [
      // 실행 파일
      "application/x-msdownload",
      "application/x-msi",
      "application/x-msdos-program",
      "application/x-executable",
      "application/x-mach-binary",
      "application/x-elf",
      // 스크립트
      "application/x-sh",
      "application/x-bat",
      "application/javascript",
      "text/javascript",
      // 웹 페이지 (XSS 위험)
      "text/html",
      "application/xhtml+xml",
      // 레거시 / Java
      "application/x-shockwave-flash",
      "application/java-archive",
      "application/x-java-jnlp-file",
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
    // 사용자가 추가한 테마 프리셋 — built-in (THEME_PRESETS) 와 별개. UI 에서 추가/삭제.
    presets: [] as Array<{ name: string; theme: { accentColor: string; lightBg: string; lightText: string; darkBg: string; darkText: string } }>,
  },

  // ---------------------------------------------------------------------------
  // 타이포그래피
  // ---------------------------------------------------------------------------
  typography: {
    headingFont: "Instrument Serif", // Display/Heading 폰트
    bodyFont: "Space Grotesk", // Body/UI 폰트
    monoFont: "JetBrains Mono", // Monospace 폰트
    // 업로드한 커스텀 폰트 (Supabase Storage) — public/fonts 빌드 스캔 폰트와 합쳐
    // FontPicker(제목·본문·코드·로고·에디터) 와 @font-face 렌더에 노출
    customFonts: [] as CustomFont[],
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
    // 목록 카드 배치 — magazine(사이즈 변주 매거진) / grid(균일 격자·이미지 우선) / list(수평 행) / compact(텍스트형)
    layout: "magazine" as "magazine" | "grid" | "list" | "compact" | "masonry" | "featured",
    perPage: 10,
    adminPerPage: 20,
    // 기본 카테고리 — 성격/의도 기준 플랫 6개(배포용 기본값). 2단계 기능은 유지되며 '학습'만 소분류 사용.
    // posts.category 엔 leaf 문자열만 저장(개발/알고리즘/CS/인사이트/회고/일상/기타). '학습'은 소분류를 담는 컨테이너.
    categories: [
      {
        ko: "개발",
        en: "Development",
        description: {
          ko: "화면 너머 사용자에게 닿는 제품을 실제로 만들어 가는 이야기를 담습니다. 프론트엔드의 인터페이스부터 백엔드의 데이터 흐름, DevOps의 배포까지 코드로 완성되는 전 과정을 다룹니다.",
          en: "Building real products — split into frontend, backend, and DevOps. Posts spanning layers stay at 'Development'; tooling, workflow, and specific tech (React, Docker, …) go to tags.",
        },
        children: [
          {
            ko: "프론트엔드",
            en: "Frontend",
            description: {
              ko: "브라우저에서 사용자가 직접 마주하는 UI·인터랙션·상태 관리를 다룹니다. React · Next.js · CSS · 접근성 등 클라이언트 사이드 주제를 포괄합니다.",
              en: "User-facing UI, interaction, and state in the browser. Covers client-side topics like React, Next.js, CSS, and accessibility.",
            },
          },
          {
            ko: "백엔드",
            en: "Backend",
            description: {
              ko: "서버·API·데이터베이스·인증 등 서버 사이드 로직과 데이터 흐름을 다룹니다. Node · Python · SQL · 메시지 큐 등을 살펴봅니다.",
              en: "Server, API, database, and auth — server-side logic and data flow. Covers Node, Python, SQL, message queues, and more.",
            },
          },
          {
            ko: "DevOps",
            en: "DevOps",
            description: {
              ko: "배포·CI/CD·인프라·모니터링·관측성을 아우릅니다. 컨테이너, IaC, 로그·트레이싱·알람 같은 운영 자동화 주제를 다룹니다.",
              en: "Deployment, CI/CD, infra, monitoring, and observability. Containers, IaC, logs, tracing, alerting — operational automation topics.",
            },
          },
        ],
      },
      {
        ko: "학습",
        en: "Learning",
        description: {
          ko: "개발을 떠받치는 기초 지식을 파고들어 내 것으로 만드는 공간입니다. 알고리즘 풀이와 CS 원리를 곱씹으며 왜 그렇게 동작하는지까지 정리합니다.",
          en: "Studying and consolidating the knowledge under the craft — algorithms, CS, and more.",
        },
        children: [
          {
            ko: "알고리즘",
            en: "Algorithm",
            description: {
              ko: "자료구조·문제풀이·복잡도 분석을 다룹니다. 코딩 테스트 풀이 회고나 직무 중 마주친 알고리즘 응용을 정리합니다.",
              en: "Data structures, problem solving, and complexity analysis. Coding-test retros and real-world algorithmic applications.",
            },
          },
          {
            ko: "CS",
            en: "CS",
            description: {
              ko: "운영체제·네트워크·컴파일러·DB 이론 등 컴퓨터 과학 기초를 다룹니다. 면접 정리부터 깊이 있는 원리 탐구까지 폭넓게 담습니다.",
              en: "Computer science foundations — OS, networks, compilers, DB theory. From interview notes to deep dives into first principles.",
            },
          },
        ],
      },
      {
        ko: "인사이트",
        en: "Insights",
        description: {
          ko: "코드 한 줄이 아니라 판 전체를 바라보며 던지는 생각을 모읍니다. 기술 트렌드와 업계 흐름, 커리어에 대한 고민을 나름의 시선으로 풀어냅니다.",
          en: "Trends, tech commentary, industry and career — pieces that step back and look at the landscape.",
        },
      },
      {
        ko: "회고",
        en: "Retrospective",
        description: {
          ko: "지나온 프로젝트와 이슈, 학습 사이클을 멈춰 서서 돌아봅니다. 무엇이 잘됐고 무엇이 아쉬웠는지 솔직하게 짚으며 다음을 준비합니다.",
          en: "Looking back on projects, issues, and learning cycles. Quarterly, yearly, and side-project reviews.",
        },
      },
      {
        ko: "일상",
        en: "Life",
        description: {
          ko: "코드 바깥에서 흘러가는 순간들을 기록합니다. 문득 스친 단상과 취향, 머물렀던 공간과 만난 사람에 대한 이야기를 담습니다.",
          en: "Notes from outside the code — daily thoughts, tastes, places, people.",
        },
      },
      {
        ko: "기타",
        en: "Etc",
        description: {
          ko: "아직 어느 분류에도 딱 맞아떨어지지 않는 글을 잠시 품어 둡니다. 이야기가 쌓여 결이 뚜렷해지면 새 카테고리로 독립합니다.",
          en: "Posts that don't fit cleanly above. A holding area before they get their own category.",
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Works 페이지
  // ---------------------------------------------------------------------------
  works: {
    layout: "flow" as "flow" | "fullscreen" | "cinematic" | "grid" | "split" | "cylinder",
    adminPerPage: 20,
    categories: [
      {
        ko: "웹앱",
        en: "Web App",
        description: {
          ko: "브라우저에서 동작하는 본격적 애플리케이션. 로그인·데이터·복잡한 상태가 있는 SPA·SSR 프로젝트.",
          en: "Full-fledged applications running in the browser. SPA/SSR projects with auth, data, and complex state.",
        },
      },
      {
        ko: "모바일 앱",
        en: "Mobile App",
        description: {
          ko: "iOS·Android 네이티브 또는 React Native · Flutter 등 크로스플랫폼 모바일 애플리케이션.",
          en: "Native iOS/Android or cross-platform mobile apps built with React Native, Flutter, and the like.",
        },
      },
      {
        ko: "데스크탑 앱",
        en: "Desktop App",
        description: {
          ko: "Electron · Tauri 등으로 만든 macOS · Windows · Linux 데스크탑 애플리케이션.",
          en: "Desktop apps for macOS, Windows, and Linux — built with Electron, Tauri, and similar stacks.",
        },
      },
      {
        ko: "라이브러리",
        en: "Library",
        description: {
          ko: "다른 프로젝트에서 import 해 쓰도록 만든 재사용 가능한 패키지. npm · PyPI 등 배포물 포함.",
          en: "Reusable packages meant to be imported by other projects. Includes npm, PyPI, and similar releases.",
        },
      },
      {
        ko: "도구",
        en: "Tool",
        description: {
          ko: "특정 작업을 자동화·가속하는 단일 목적 유틸리티. CLI · 변환기 · 생성기 등.",
          en: "Single-purpose utilities that automate or speed up a task. CLIs, converters, generators, and the like.",
        },
      },
      {
        ko: "디자인 시스템",
        en: "Design System",
        description: {
          ko: "토큰·컴포넌트·문서가 한 세트로 묶인 UI 시스템. 다중 제품·팀에서 일관성을 유지하기 위한 기반.",
          en: "A UI system bundling tokens, components, and docs. The foundation for consistency across products and teams.",
        },
      },
      {
        ko: "게임",
        en: "Game",
        description: {
          ko: "캐주얼 게임·인터랙티브 토이부터 본격 게임 엔진 프로젝트까지. 웹 기반 또는 네이티브 클라이언트.",
          en: "From casual games and interactive toys to full game-engine projects. Web-based or native clients.",
        },
      },
      {
        ko: "API · 백엔드",
        en: "Backend",
        description: {
          ko: "HTTP·gRPC API, 데이터 파이프라인, 백그라운드 워커 등 서버 사이드 위주의 프로젝트.",
          en: "Server-side projects — HTTP/gRPC APIs, data pipelines, background workers, and similar.",
        },
      },
      {
        ko: "AI / ML",
        en: "AI / ML",
        description: {
          ko: "LLM 응용·임베딩·모델 훈련·추론 파이프라인. LangChain · 벡터 DB · 프롬프트 엔지니어링 등을 활용.",
          en: "LLM applications, embeddings, model training, and inference pipelines. Uses LangChain, vector DBs, prompt engineering.",
        },
      },
      {
        ko: "자동화",
        en: "Automation",
        description: {
          ko: "반복 작업을 줄이는 스크립트·봇·워크플로. GitHub Actions · cron · Zapier 류의 통합 작업.",
          en: "Scripts, bots, and workflows that remove repetition. GitHub Actions, cron, Zapier-style integrations.",
        },
      },
      {
        ko: "확장 프로그램",
        en: "Extension",
        description: {
          ko: "브라우저 익스텐션·VS Code 익스텐션·Raycast 확장 등 기존 도구에 기능을 더하는 플러그인.",
          en: "Browser extensions, VS Code extensions, Raycast extensions — plugins that add features to existing tools.",
        },
      },
      {
        ko: "인터랙티브 / 비주얼",
        en: "Interactive / Visual",
        description: {
          ko: "WebGL · 셰이더 · 캔버스 기반의 인터랙티브 데모·비주얼 실험. 표현·인상 중심의 작업.",
          en: "Interactive demos and visual experiments — WebGL, shaders, canvas. Work focused on expression and impression.",
        },
      },
      {
        ko: "기타",
        en: "Etc",
        description: {
          ko: "위 분류에 깔끔히 들어가지 않는 작업들. 실험·프로토타입·일회성 결과물의 임시 보관함.",
          en: "Projects that don't fit cleanly above. A holding area for experiments, prototypes, and one-off artifacts.",
        },
      },
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
    // 빈 문자열 = "/cover/videos/bg-1.mp4" fallback (public/cover/videos/ 의 첫 영상). 100MB 초과 자산은 외부 CDN 권장.
    introVideoUrl: "",
    statsProjects: "Projects",
    statsProjects_ko: "프로젝트",
    statsClients: "Tech Stack",
    statsClients_ko: "기술 스택",
    /* 보여줄 작업물도 저장소도 없을 때의 문구. 비우면 번역 파일의 기본 문장을 쓴다(#1062) */
    emptyTitle: "",
    emptyTitle_ko: "",
    emptySub: "",
    emptySub_ko: "",
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
    // Progress ↔ Tech Stack 사이 시각적 구분선 이미지 (full-bleed cover)
    visualBreakImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=1000&fit=crop",
    /* ── Overview panel — 프로젝트 소개 문단 + highlights 칩 + stats 카드 ── */
    overview_description_ko: "Claude와 함께 만든 풀스택 포트폴리오. Next.js 16 App Router를 기반으로 GSAP·Framer Motion 애니메이션, Lenis 무한 스크롤, Supabase 블로그까지 직접 설계하고 구현했습니다.",
    overview_description_en: "A full-stack portfolio built alongside Claude. Designed and implemented from scratch — Next.js 16 App Router, GSAP & Framer Motion animations, Lenis infinite scroll, and a Supabase-powered blog.",
    /* highlights — 쉼표 구분 문자열. OverviewPanel 가 split 해서 칩 렌더 */
    overview_highlights: "Next.js 16, GSAP ScrollTrigger, Framer Motion, Lenis Smooth Scroll, Three.js (R3F), CSS Variables, Supabase, i18n (KO/EN), IP-Based Likes, Dark/Light Theme",
    /* stats — value + label(ko,en). label 에 \n 들어가면 줄바꿈 */
    overview_stats: [
      { value: "6 Mo+", label_ko: "개발 기간\n(2/5 – 진행 중)", label_en: "Dev Period\n(Feb 5 – ongoing)" },
      { value: "250+", label_ko: "컴포넌트", label_en: "Components" },
      { value: "50+", label_ko: "커스텀 훅", label_en: "Custom Hooks" },
      { value: "98", label_ko: "Lighthouse\n(모바일 Performance)", label_en: "Lighthouse\n(mobile performance)" },
      { value: "2", label_ko: "언어 지원", label_en: "Languages" },
      { value: "70+", label_ko: "라이브러리", label_en: "Libraries" },
    ] as Array<{ value: string; label_ko: string; label_en: string }>,
    /* ── Hero panel — 첫 화면 큰 글자. bilingual (기본값은 한=영 통일, admin 에서 언어별로 분기 가능) ── */
    /* 상단 라벨 — 비어있으면 i18n aboutPage.title ("The Making Of") 사용 */
    heroLabel: "",
    heroLabel_ko: "",
    /* 부제목 문장 — 비어있으면 i18n aboutPage.description 사용 */
    heroSubtitle: "",
    heroSubtitle_ko: "",
    /* 제목 아래 액센트 밑줄 색 — 비어있으면 기본 accent */
    heroAccentColor: "",
    heroLine1: "Behind",
    heroLine1_ko: "Behind",
    heroLine2: "the Scenes",
    heroLine2_ko: "the Scenes",
    /* 화면 우측 하단 워터마크 텍스트 */
    heroWatermark: "the build",
    heroWatermark_ko: "the build",
    /* ── Hero 콘텐츠 정렬 — 가로 left/center/right, 세로 top/center/bottom ── */
    heroAlignH: "left",
    heroAlignV: "center",
    /* ── Hero 텍스트 요소 숨김 — key: label / line1 / line2 / subtitle / watermark ── */
    heroHidden: [] as string[],
    /* ── Hero 스타일 override — 비어있으면 기본 (CSS 변수) 사용 ──
     * 각 텍스트 요소 (line1 / line2 / subtitle / watermark) 별로 color / fontSize / fontWeight / fontFamily 독립 설정. */
    heroLine1Color: "",
    heroLine1FontSize: "",
    heroLine1FontWeight: "",
    heroLine1FontFamily: "",
    heroLine2Color: "",
    heroLine2FontSize: "",
    heroLine2FontWeight: "",
    heroLine2FontFamily: "",
    heroWatermarkColor: "",
    heroWatermarkFontSize: "",
    heroWatermarkFontWeight: "",
    heroWatermarkFontFamily: "",
    /* hero 패널 media URL — CoverImagePicker 로 선택. 이미지 (.jpg/.png/.webp) 또는 동영상 (.mp4/.webm/.mov/.ogv). 빈 문자열이면 미적용. */
    heroBackground: "",
    /* hero 패널 solid 배경색 (hex, 예 "#1a1a1a"). 빈 문자열이면 미적용 (패널 테마 색 사용).
       색·그라디언트는 라이트/다크 테마별로 따로 지정 — _dark 는 다크 테마에서만 적용 (미디어는 공용). */
    heroBgColor: "",
    heroBgColor_dark: "",
    /* hero 서브타이틀 override — 비어있으면 text-secondary / 기본 typography. */
    heroSubtitleColor: "",
    heroSubtitleFontSize: "",
    heroSubtitleFontWeight: "",
    heroSubtitleFontFamily: "",
    /* hero 패널 gradient — from + to 둘 다 채우면 활성. angle 은 deg (기본 135, 테마 공용).
       색상만 라이트/다크 분리 (_dark), 각도는 공용. */
    heroBgGradientFrom: "",
    heroBgGradientTo: "",
    heroBgGradientFrom_dark: "",
    heroBgGradientTo_dark: "",
    heroBgGradientAngle: 135,
    /* 배경 미디어 (이미지/동영상) opacity (0~1). 기본 0.8. 패널 표면색/그라디언트 위에 비치는 정도. */
    heroBgOpacity: 0.8,
    /* 동영상 위 accent overlay — 우상단/좌하단 radial halo 색 (hex). 빈 값이면 테마 accent 사용 */
    heroVideoOverlayColor: "",
    /* overlay 강도 (0~1). 0 이면 사실상 미적용. 기본 0.5 */
    heroVideoOverlayStrength: 0.5,
    /* ── Panel visibility — key 적힌 panel 은 desktop / mobile 모두에서 숨김 ──
     * keys: hero, overview, architecture, userflow, features, designSystem, process, visualBreak,
     *       techStack, backend, erd, codeHighlights, troubleshooting, security, credits */
    hiddenPanels: [] as string[],
    /* ── Panel 순서 — panel key 배열. 비어있으면 기본 순서. hero 는 항상 맨 앞, credits 는 항상 맨 뒤로 강제. ── */
    panelOrder: [] as string[],
    /* ── Panel 표시 제목 override — key → { ko, en }. 미설정 시 각 패널 기본 제목 사용. ── */
    panelTitles: {} as Record<string, { ko?: string; en?: string }>,
    /* ── 콘텐츠 시각 — key → ISO 문자열 ──
     * About 내용은 설정 화면과 content/about/ 의 md 두 곳에서 온다. 어느 쪽을 쓸지 사람이
     * 고르지 않고, 동기화가 **더 최근에 손댄 쪽**을 남긴다.
     *   contentEditedAt  화면에서 그 패널을 저장한 시각 (설정 화면이 씀)
     *   contentSyncedAt  md 에서 그 패널을 가져온 시각 (sync-about 이 씀)
     * 파일 수정 시각이 contentEditedAt 보다 나중일 때만 동기화가 덮는다. */
    contentEditedAt: {} as Record<string, string>,
    contentSyncedAt: {} as Record<string, string>,
    /* ── Tech stack — TechStackPanel 항목. admin 에서 자유롭게 추가/수정/삭제 ── */
    /* icon: simple-icons slug (예 "react") 또는 업로드/링크된 이미지 URL. 빈 값이면 이니셜 표시. */
    techStack: [
      { name: "Next.js 16", category: "Framework", icon: "nextdotjs" },
      { name: "React 19", category: "Library", icon: "react" },
      { name: "TypeScript", category: "Language", icon: "typescript" },
      { name: "GSAP", category: "Animation", icon: "greensock" },
      { name: "ScrollTrigger", category: "Animation", icon: "" },
      { name: "Lenis Smooth Scroll", category: "Scroll", icon: "" },
      { name: "Framer Motion", category: "Interaction", icon: "framer" },
      { name: "CSS Modules", category: "Styling", icon: "css" },
      { name: "CSS Variables", category: "Design Tokens", icon: "css" },
      { name: "Three.js", category: "3D Graphics", icon: "threedotjs" },
      { name: "R3F", category: "3D Graphics", icon: "" },
      { name: "Zustand", category: "State Management", icon: "" },
      { name: "Supabase", category: "Backend (DB/Auth/Storage)", icon: "supabase" },
      { name: "Plate", category: "Rich Text Editor", icon: "" },
      { name: "NanoBanana", category: "AI Image Generation", icon: "" },
      { name: "Hugging Face", category: "AI Image Generation", icon: "huggingface" },
      { name: "Formspree", category: "Form & Email", icon: "" },
      { name: "Vercel", category: "Deployment", icon: "vercel" },
      { name: "Vitest", category: "Testing", icon: "vitest" },
    ] as Array<{ name: string; category: string; icon?: string }>,
    /* ── Features panel — 아이콘/제목/설명(ko,en)/tech 칩/이미지 URL ── */
    features: [] as Array<{ icon: string; title: string; description_ko: string; description_en: string; tech: string; image: string }>,
    /* ── Process panel — 단계/제목(ko,en)/설명(ko,en) ── */
    process: [] as Array<{ step: string; title_ko: string; title_en: string; description_ko: string; description_en: string }>,
    /* ── Security panel — icon/title(ko,en)/description(ko,en)/scope(ko,en) ── */
    security: [] as Array<{ icon: string; title_ko: string; title_en: string; description_ko: string; description_en: string; scope_ko: string; scope_en: string }>,
    /* ── Design System 패널 — 컨셉 항목. 비어있으면 기본 정적 데이터(designConcepts) 사용 ── */
    designSystem: [] as Array<{ id: string; title: string; subtitle_ko: string; subtitle_en: string; description_ko: string; description_en: string; image: string }>,
    /* ── Code Highlights 패널 — 코드 예시. 비어있으면 기본 정적 데이터(codeExamples) 사용 ── */
    codeHighlights: [] as Array<{ title: string; description_ko: string; description_en: string; language: string; code: string }>,
    /* ── Credits 문구 override — 비어있으면 로케일 기본값(aboutPage.credits) ── */
    /* 저작자 표시 문구 자체는 로케일에 고정 — admin 에서 바꿀 수 없다.
       덧붙이는 것만 허용한다: 공동 제작자 이름 + 아래 한 줄 메모. */
    creditsNames: [] as string[],
    creditsNote: "",
    creditsNote_ko: "",
    /* 덧붙일 문구의 타이포 — 미설정이면 기본 스타일 */
    creditsNoteFontSize: "",
    creditsNoteFontFamily: "",
    creditsNoteLineHeight: "",
    creditsNoteAlign: "left",
    /* ── Architecture 패널 — 프로젝트 디렉토리 구조 목록. indent 0/1/2 로 계층 표현 ── */
    /* Backend — 비어있으면 정적 데이터(data/about/backend) 사용 */
    backend: [] as BackendItem[],
    /* User Flow — 비어있으면 정적 데이터(data/about/architecture.userFlows) 사용 */
    userFlows: [] as UserFlow[],
    /* Troubleshooting — 비어있으면 정적 데이터(data/about/troubleshooting) 사용 */
    troubleshooting: [] as TroubleShootingItem[],
    /* ERD — 비어있으면 정적 데이터(data/about/erd) 사용 */
    erdTables: [] as ErdTable[],
    erdRelations: [] as ErdRelation[],
    architectureItems: [
      { path: "src/", description_ko: "소스 코드 루트", description_en: "Source code root", indent: 0 },
      { path: "app/", description_ko: "Next.js App Router — 페이지 & API 라우트", description_en: "Next.js App Router — pages & API routes", indent: 1 },
      { path: "(home)/", description_ko: "랜딩 페이지 — Hero, About, Works, CTA 등 7개 섹션", description_en: "Landing page — 7 sections: Hero, About, Works, CTA, etc.", indent: 2 },
      { path: "works/", description_ko: "프로젝트 갤러리 + [id] 상세 페이지 (좋아요)", description_en: "Project gallery + [id] detail pages (likes)", indent: 2 },
      { path: "posts/", description_ko: "블로그 목록 + [slug] 상세 (좋아요·댓글)", description_en: "Blog list + [slug] detail (likes & comments)", indent: 2 },
      { path: "profile/", description_ko: "프로필 페이지 — 소개 & 철학", description_en: "Profile page — introduction & philosophy", indent: 2 },
      { path: "about/", description_ko: "이 페이지 — 개발 과정 & 기술 문서", description_en: "This page — development process & technical docs", indent: 2 },
      { path: "admin/", description_ko: "어드민 대시보드 — 포스트/작업물 CRUD, 설정(콘텐츠·프로필·계정)", description_en: "Admin dashboard — posts/works CRUD, settings (content, profile, account)", indent: 2 },
      { path: "api/", description_ko: "API 라우트 — posts, comments, likes, contact, cover, admin", description_en: "API routes — posts, comments, likes, contact, cover, admin", indent: 2 },
      { path: "components/", description_ko: "재사용 가능한 UI 컴포넌트 라이브러리", description_en: "Reusable UI component library", indent: 1 },
      { path: "layout/", description_ko: "Navigation, Footer, ContactDrawer, DetailLayout", description_en: "Navigation, Footer, ContactDrawer, DetailLayout", indent: 2 },
      { path: "effects/", description_ko: "StaggerText, Parallax, CursorTrail, FontMorph, ScrollTorus", description_en: "StaggerText, Parallax, CursorTrail, FontMorph, ScrollTorus", indent: 2 },
      { path: "ui/", description_ko: "Button, Modal, Typography, OptimizedImage", description_en: "Button, Modal, Typography, OptimizedImage", indent: 2 },
      { path: "posts/", description_ko: "PostEditor, MarkdownRenderer, CoverImagePicker", description_en: "PostEditor, MarkdownRenderer, CoverImagePicker", indent: 2 },
      { path: "admin/", description_ko: "어드민 패널 컴포넌트", description_en: "Admin panel components", indent: 2 },
      { path: "hooks/", description_ko: "15개 커스텀 훅 — useMagnetic, useScrollVelocity, useHorizontalScroll 등", description_en: "15 custom hooks — useMagnetic, useScrollVelocity, useHorizontalScroll, etc.", indent: 1 },
      { path: "lib/", description_ko: "서버 사이드 로직 — Supabase 클라이언트, API 공통 핸들러, Posts SSR 쿼리", description_en: "Server-side logic — Supabase clients, API shared handlers, Posts SSR queries", indent: 1 },
      { path: "stores/", description_ko: "Zustand 상태 관리 — app, project, modal, contact, transition", description_en: "Zustand state management — app, project, modal, contact, transition", indent: 1 },
      { path: "providers/", description_ko: "Context Providers — Theme, Language, Lenis, reCAPTCHA, SiteConfig", description_en: "Context Providers — Theme, Language, Lenis, reCAPTCHA, SiteConfig", indent: 1 },
      { path: "types/", description_ko: "TypeScript 타입 정의 — Post, Comment 등", description_en: "TypeScript type definitions — Post, Comment, etc.", indent: 1 },
      { path: "config/", description_ko: "사이트 설정 — site.config.ts", description_en: "Site configuration — site.config.ts", indent: 1 },
      { path: "animations/", description_ko: "Framer Motion 프리셋 — fade, slide, scale, spring 등 7개 카테고리", description_en: "Framer Motion presets — 7 categories: fade, slide, scale, spring, etc.", indent: 1 },
      { path: "styles/", description_ko: "디자인 토큰, 베이스 스타일, 애니메이션, 유틸리티", description_en: "Design tokens, base styles, animations, utilities", indent: 1 },
      { path: "data/", description_ko: "정적 데이터 — projects, services, profile, about", description_en: "Static data — projects, services, profile, about", indent: 1 },
      { path: "locales/", description_ko: "i18n 번역 파일 — ko.json, en.json", description_en: "i18n translation files — ko.json, en.json", indent: 1 },
    ] as Array<{ path: string; description_ko: string; description_en: string; indent: number }>,
    /* Architecture 다이어그램(기술 그래프) — 비어있으면 코드의 기본 노드/엣지 사용. admin 스튜디오에서 편집. */
    archDiagram: { nodes: [], edges: [] } as {
      nodes: Array<{ id: string; label: string; x: number; y: number; w: number; h: number; icon: string; group?: string }>;
      edges: Array<{ from: string; to: string; dashed?: boolean }>;
    },
  },

  // ---------------------------------------------------------------------------
  // 댓글 이메일 알림 수신 여부 (기본: 미수신)
  // ---------------------------------------------------------------------------
  commentEmailNotify: false,

  // ---------------------------------------------------------------------------
  // 댓글 시스템
  // ---------------------------------------------------------------------------
  // provider: "system" (내장 커스텀 댓글) | "giscus" (GitHub Discussions 위젯)
  //
  // giscus 사용 시 (giscus.app 에서 발급):
  //   1. 공개 저장소에서 Discussions 기능 활성화
  //   2. giscus GitHub 앱 설치 (github.com/apps/giscus)
  //   3. giscus.app 에서 repo/category 선택 → repoId·categoryId 발급
  //   4. 발급값을 admin 설정 > 서비스 > 댓글 시스템 에 입력
  // ---------------------------------------------------------------------------
  comments: {
    provider: "system" as "system" | "giscus",
    // 내장(시스템) 댓글 입력란 위치 (top = 리스트 위 / bottom = 리스트 아래, 기본)
    systemInputPosition: "bottom" as "top" | "bottom",
    giscus: {
      repo: "", // "owner/name" 형식
      repoId: "", // giscus.app 발급
      category: "", // Discussion 카테고리 이름 (예: "Announcements")
      categoryId: "", // giscus.app 발급
      mapping: "pathname" as "pathname" | "og:title" | "title" | "url" | "specific" | "number",
      reactionsEnabled: true, // 메인 포스트 리액션 표시
      inputPosition: "bottom" as "top" | "bottom", // 코멘트 입력창 위치
      // giscus.app 부가 옵션
      strict: false, // 엄격한 제목 일치 (data-strict)
      emitMetadata: false, // 메타데이터 보내기 (data-emit-metadata)
      lazyLoading: true, // 댓글 느리게 불러오기 (data-loading=lazy)
      // 테마 — giscus 프리셋 이름("light","dark","noborder_dark","transparent_dark"…) 또는 커스텀 CSS URL. 빈 값이면 기본 light/dark.
      themeLight: "", // 라이트 모드에서 쓸 giscus 테마 (빈 값 = "light")
      themeDark: "", // 다크 모드에서 쓸 giscus 테마 (빈 값 = "dark")
    },
  },

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
  // key 는 canonical tag name (post.tags 와 매칭, DB 호환 위해 변경 X).
  // value 형식 (read 시 모두 정규화):
  //   - string                                                  → legacy 단일 설명
  //   - { ko, en }                                               → legacy bilingual 설명
  //   - { ko?, en?, description?: { ko, en } }                   → 현재 포맷 (이름 + 설명 둘 다 bilingual,
  //                                                                ko/en 비면 canonical key 로 fallback)
  // ---------------------------------------------------------------------------
  tagDescriptions: {
    React: {
      ko: "리액트",
      en: "React",
      description: {
        ko: "선언적·컴포넌트 기반 UI 라이브러리입니다. 상태→뷰 매핑을 단순화하고 hooks 로 부수효과·재사용 로직을 격리합니다.",
        en: "Declarative component-based UI library. Simplifies state-to-view mapping; hooks isolate side effects and reusable logic.",
      },
    },
    "Next.js": {
      ko: "Next.js",
      en: "Next.js",
      description: {
        ko: "React 풀스택 프레임워크입니다. App Router · 서버 컴포넌트 · 라우트 핸들러로 SSR/ISR/CSR 을 한 곳에서 다룹니다.",
        en: "React full-stack framework. App Router, server components, and route handlers unify SSR/ISR/CSR in one place.",
      },
    },
    TypeScript: {
      ko: "타입스크립트",
      en: "TypeScript",
      description: {
        ko: "정적 타입을 더한 JavaScript입니다. 리팩터·자동완성·계약형 API 표현 등 대규모 코드베이스 유지보수에 강점이 있습니다.",
        en: "JavaScript with static types. Strong on refactoring, autocomplete, and contract-style APIs at scale.",
      },
    },
    CSS: {
      ko: "CSS",
      en: "CSS",
      description: {
        ko: "레이아웃·타이포·모션을 선언하는 스타일 언어입니다. Grid · Flexbox · Container Queries · custom properties 가 현대적 도구입니다.",
        en: "Style language for layout, typography, motion. Grid, Flexbox, container queries, and custom properties are the modern toolkit.",
      },
    },
    "Three.js": {
      ko: "Three.js",
      en: "Three.js",
      description: {
        ko: "브라우저에서 WebGL 을 다루는 3D 라이브러리입니다. 카메라·라이트·머티리얼·셰이더로 인터랙티브 그래픽을 구성합니다.",
        en: "WebGL-based 3D library for the browser. Cameras, lights, materials, and shaders build interactive graphics.",
      },
    },
    GSAP: {
      ko: "GSAP",
      en: "GSAP",
      description: {
        ko: "고성능 타임라인 기반 애니메이션 라이브러리입니다. ScrollTrigger 로 스크롤 동기 인터랙션을 정교하게 만들 수 있습니다.",
        en: "High-performance timeline animation library. ScrollTrigger enables precise scroll-driven interactions.",
      },
    },
    "Framer Motion": {
      ko: "Framer Motion",
      en: "Framer Motion",
      description: {
        ko: "React 친화적 선언형 애니메이션 라이브러리입니다. layout · AnimatePresence · variants 로 진입·전환을 직관적으로 표현합니다.",
        en: "Declarative React-friendly animation library. layout, AnimatePresence, and variants make entrances and transitions intuitive.",
      },
    },
    Supabase: {
      ko: "Supabase",
      en: "Supabase",
      description: {
        ko: "Postgres 기반 BaaS입니다. 인증·DB·스토리지·realtime·edge function 을 한 SDK 로 제공합니다.",
        en: "Postgres-based BaaS. Auth, DB, storage, realtime, and edge functions through a single SDK.",
      },
    },
    PostgreSQL: {
      ko: "PostgreSQL",
      en: "PostgreSQL",
      description: {
        ko: "오픈소스 관계형 데이터베이스입니다. JSONB · 풀텍스트 검색 · 윈도우 함수 등 풍부한 기능을 제공합니다.",
        en: "Open-source relational database. Rich features include JSONB, full-text search, and window functions.",
      },
    },
    Performance: {
      ko: "성능",
      en: "Performance",
      description: {
        ko: "로드·렌더·인터랙션 비용을 측정하고 줄이는 작업입니다. Core Web Vitals · 번들 · 캐시 · 메모리가 주요 축입니다.",
        en: "Measuring and reducing load/render/interaction cost. Core Web Vitals, bundles, caching, and memory are the main axes.",
      },
    },
    Accessibility: {
      ko: "접근성",
      en: "Accessibility",
      description: {
        ko: "키보드·스크린리더·축소된 모션 등 다양한 사용 환경에서 동등한 경험을 보장하는 설계 원칙입니다.",
        en: "Design discipline ensuring equivalent experience across keyboards, screen readers, reduced motion, and other contexts.",
      },
    },
    "Design System": {
      ko: "디자인 시스템",
      en: "Design System",
      description: {
        ko: "토큰·컴포넌트·패턴을 일관된 규칙으로 정리한 체계입니다. 시각·동작·접근성 결정을 코드에 고정해 확산합니다.",
        en: "A coordinated system of tokens, components, and patterns that codifies visual, behavioral, and a11y decisions for reuse.",
      },
    },
    JavaScript: {
      ko: "자바스크립트",
      en: "JavaScript",
      description: {
        ko: "웹을 구동하는 동적 프로그래밍 언어입니다. 프로토타입 기반 · 일급 함수 · 이벤트 루프를 특징으로 하며 브라우저·서버 양쪽에서 실행됩니다.",
        en: "Dynamic programming language that powers the web. Prototype-based, first-class functions, and an event loop; runs on both browser and server.",
      },
    },
    HTML: {
      ko: "HTML",
      en: "HTML",
      description: {
        ko: "웹 문서의 구조를 정의하는 마크업 언어입니다. 시맨틱 요소로 의미 · 접근성 · SEO 를 뒷받침합니다.",
        en: "Markup language that defines web document structure. Semantic elements support meaning, accessibility, and SEO.",
      },
    },
    "Tailwind CSS": {
      ko: "Tailwind CSS",
      en: "Tailwind CSS",
      description: {
        ko: "유틸리티 우선 CSS 프레임워크입니다. 클래스 조합으로 스타일을 구성하고 디자인 토큰 · 반응형 · 다크모드를 일관되게 관리합니다.",
        en: "Utility-first CSS framework. Compose styles from classes; manages design tokens, responsive, and dark mode consistently.",
      },
    },
    Animation: {
      ko: "애니메이션",
      en: "Animation",
      description: {
        ko: "요소의 시간 기반 시각 변화를 다루는 작업입니다. transition · keyframes · 스프링 물리 · compositing 성능이 주요 축입니다.",
        en: "Working with time-based visual change of elements. Transitions, keyframes, spring physics, and compositing performance are the main axes.",
      },
    },
    "State Management": {
      ko: "상태 관리",
      en: "State Management",
      description: {
        ko: "애플리케이션 상태의 저장 · 갱신 · 공유를 다루는 작업입니다. 로컬·전역 상태 · 서버 상태 · 불변성 · 리렌더 최적화가 주요 축입니다.",
        en: "Handling storage, update, and sharing of application state. Local/global state, server state, immutability, and re-render optimization are the main axes.",
      },
    },
    SEO: {
      ko: "SEO",
      en: "SEO",
      description: {
        ko: "검색 엔진 노출 · 순위를 높이는 최적화 작업입니다. 메타데이터 · 시맨틱 마크업 · 사이트맵 · Core Web Vitals 가 주요 축입니다.",
        en: "Optimization to improve search engine visibility and ranking. Metadata, semantic markup, sitemaps, and Core Web Vitals are the main axes.",
      },
    },
    "Node.js": {
      ko: "Node.js",
      en: "Node.js",
      description: {
        ko: "V8 기반 서버사이드 JavaScript 런타임입니다. 이벤트 루프 · 논블로킹 I/O 로 높은 동시성을 처리하며 npm 생태계를 활용합니다.",
        en: "Server-side JavaScript runtime built on V8. Event loop and non-blocking I/O handle high concurrency; leverages the npm ecosystem.",
      },
    },
    Python: {
      ko: "파이썬",
      en: "Python",
      description: {
        ko: "동적 타이핑 · 간결한 문법의 범용 프로그래밍 언어입니다. 웹·데이터·자동화 전반을 아우르는 방대한 라이브러리 생태계를 제공합니다.",
        en: "Dynamically typed general-purpose language with concise syntax. Vast library ecosystem spanning web, data, and automation.",
      },
    },
    Go: {
      ko: "Go",
      en: "Go",
      description: {
        ko: "구글이 만든 정적 타입 컴파일 언어입니다. goroutine·채널 기반 동시성과 빠른 빌드 · 단일 바이너리 배포가 강점입니다.",
        en: "Statically typed compiled language from Google. Goroutine/channel concurrency, fast builds, and single-binary deployment.",
      },
    },
    GraphQL: {
      ko: "GraphQL",
      en: "GraphQL",
      description: {
        ko: "API 를 위한 쿼리 언어 · 런타임입니다. 클라이언트가 필요한 필드만 선언해 오버페칭 · 언더페칭을 줄입니다.",
        en: "Query language and runtime for APIs. Clients request only the fields they need, reducing over- and under-fetching.",
      },
    },
    "REST API": {
      ko: "REST API",
      en: "REST API",
      description: {
        ko: "HTTP 자원을 URL · 메서드로 다루는 아키텍처 스타일입니다. 무상태성 · 표준 메서드 · JSON 표현으로 단순함과 상호운용성을 얻습니다.",
        en: "Architectural style exposing resources over HTTP verbs and URLs. Statelessness, standard methods, and JSON representations bring simplicity and interoperability.",
      },
    },
    SQL: {
      ko: "SQL",
      en: "SQL",
      description: {
        ko: "관계형 데이터베이스를 다루는 선언적 질의 언어입니다. SELECT · JOIN · 집계 · 트랜잭션으로 데이터를 조회·조작합니다.",
        en: "Declarative query language for relational databases. SELECT, JOIN, aggregation, and transactions query and manipulate data.",
      },
    },
    Authentication: {
      ko: "인증",
      en: "Authentication",
      description: {
        ko: "사용자·클라이언트의 신원을 확인하는 과정입니다. 세션 · 토큰(JWT) · OAuth · 다중요소로 자격을 검증합니다.",
        en: "Process of verifying the identity of a user or client. Sessions, tokens (JWT), OAuth, and MFA validate credentials.",
      },
    },
    Docker: {
      ko: "Docker",
      en: "Docker",
      description: {
        ko: "애플리케이션을 컨테이너로 패키징·실행하는 플랫폼입니다. 이미지 · 레이어 캐시 · 격리된 런타임으로 환경 차이를 제거합니다.",
        en: "Platform for packaging and running apps as containers. Images, layer caching, and isolated runtimes remove environment drift.",
      },
    },
    Kubernetes: {
      ko: "Kubernetes",
      en: "Kubernetes",
      description: {
        ko: "컨테이너 배포 · 확장 · 운영을 자동화하는 오케스트레이터입니다. 선언적 상태 · 셀프힐링 · 롤아웃 · 서비스 디스커버리를 제공합니다.",
        en: "Orchestrator that automates container deployment, scaling, and operations. Provides declarative state, self-healing, rollouts, and service discovery.",
      },
    },
    "CI/CD": {
      ko: "CI/CD",
      en: "CI/CD",
      description: {
        ko: "빌드 · 테스트 · 배포를 자동화하는 파이프라인입니다. 지속적 통합 · 지속적 배포로 릴리스 주기를 단축하고 회귀를 조기에 잡습니다.",
        en: "Pipeline that automates build, test, and deploy. Continuous integration and delivery shorten release cycles and catch regressions early.",
      },
    },
    "GitHub Actions": {
      ko: "GitHub Actions",
      en: "GitHub Actions",
      description: {
        ko: "GitHub 저장소에 내장된 워크플로 자동화 도구입니다. 이벤트 트리거 · 매트릭스 빌드 · 재사용 액션으로 CI/CD 를 구성합니다.",
        en: "Workflow automation built into GitHub repositories. Event triggers, matrix builds, and reusable actions compose CI/CD.",
      },
    },
    AWS: {
      ko: "AWS",
      en: "AWS",
      description: {
        ko: "Amazon 의 클라우드 컴퓨팅 플랫폼입니다. EC2 · S3 · Lambda · RDS 등 광범위한 인프라·매니지드 서비스를 제공합니다.",
        en: "Amazon's cloud computing platform. Offers broad infrastructure and managed services like EC2, S3, Lambda, and RDS.",
      },
    },
    Vercel: {
      ko: "Vercel",
      en: "Vercel",
      description: {
        ko: "프런트엔드·서버리스 배포 플랫폼입니다. Git 연동 · 프리뷰 배포 · 엣지 네트워크로 Next.js 앱 배포를 단순화합니다.",
        en: "Frontend and serverless deployment platform. Git integration, preview deployments, and an edge network simplify Next.js hosting.",
      },
    },
    Algorithm: {
      ko: "알고리즘",
      en: "Algorithm",
      description: {
        ko: "문제를 유한한 단계로 푸는 절차입니다. 정렬 · 탐색 · 그래프 · DP 를 다루고 시간·공간 복잡도로 효율을 분석합니다.",
        en: "Step-by-step procedure for solving a problem in finite steps. Covers sorting, search, graphs, and DP; efficiency analyzed by time and space complexity.",
      },
    },
    "Data Structure": {
      ko: "자료구조",
      en: "Data Structure",
      description: {
        ko: "데이터를 저장·조직하는 방식입니다. 배열 · 리스트 · 트리 · 해시 · 그래프가 대표적이고 연산별 복잡도로 선택합니다.",
        en: "Way of storing and organizing data. Arrays, lists, trees, hashes, and graphs; chosen by per-operation complexity.",
      },
    },
    "Operating System": {
      ko: "운영체제",
      en: "Operating System",
      description: {
        ko: "하드웨어와 응용을 잇는 시스템 소프트웨어입니다. 프로세스 · 스레드 · 메모리 · 파일 · 스케줄링을 관리합니다.",
        en: "System software bridging hardware and applications. Manages processes, threads, memory, files, and scheduling.",
      },
    },
    Network: {
      ko: "네트워크",
      en: "Network",
      description: {
        ko: "장치 간 데이터를 주고받는 통신 체계입니다. TCP/IP · HTTP · DNS · 소켓 등 계층별 프로토콜로 동작합니다.",
        en: "Communication system for exchanging data between devices. Runs on layered protocols: TCP/IP, HTTP, DNS, and sockets.",
      },
    },
    Database: {
      ko: "데이터베이스",
      en: "Database",
      description: {
        ko: "구조화된 데이터를 저장·조회하는 시스템입니다. 트랜잭션 · 인덱스 · 정규화 · 쿼리 최적화가 주요 축입니다.",
        en: "System for storing and querying structured data. Transactions, indexing, normalization, and query optimization are the main axes.",
      },
    },
    Git: {
      ko: "Git",
      en: "Git",
      description: {
        ko: "분산 버전 관리 시스템입니다. 커밋 · 브랜치 · 머지로 변경 이력을 추적하고 협업 워크플로를 관리합니다.",
        en: "Distributed version control system. Tracks change history via commits, branches, and merges; manages collaboration workflows.",
      },
    },
    Testing: {
      ko: "테스트",
      en: "Testing",
      description: {
        ko: "코드가 의도대로 동작하는지 검증하는 작업입니다. 단위·통합·E2E 테스트로 회귀를 막고 리팩토링 안전망을 만듭니다.",
        en: "Verifying code behaves as intended. Unit, integration, and E2E tests prevent regressions and form a refactoring safety net.",
      },
    },
    Refactoring: {
      ko: "리팩토링",
      en: "Refactoring",
      description: {
        ko: "동작을 바꾸지 않고 내부 구조를 개선하는 작업입니다. 중복 제거 · 명명 · 응집도로 가독성과 유지보수성을 높입니다.",
        en: "Improving internal structure without changing behavior. Removing duplication, naming, and cohesion raise readability and maintainability.",
      },
    },
    Security: {
      ko: "보안",
      en: "Security",
      description: {
        ko: "취약점을 찾고 시스템 · 데이터를 보호하는 작업입니다. 인증 · 인가 · 입력 검증 · 암호화가 주요 축입니다.",
        en: "Finding vulnerabilities and protecting systems and data. Authentication, authorization, input validation, and encryption are the main axes.",
      },
    },
    Architecture: {
      ko: "아키텍처",
      en: "Architecture",
      description: {
        ko: "시스템의 구조와 컴포넌트 관계를 설계하는 작업입니다. 경계 · 의존성 · 확장성 · 트레이드오프를 다룹니다.",
        en: "Designing system structure and component relationships. Concerns boundaries, dependencies, scalability, and trade-offs.",
      },
    },
    Career: {
      ko: "커리어",
      en: "Career",
      description: {
        ko: "개발자의 성장 · 이직 · 역할 변화를 다루는 주제입니다. 역량 개발 · 직무 전환 · 회고로 커리어 방향을 점검합니다.",
        en: "Topics on developer growth, job changes, and role shifts. Skill-building, transitions, and reflection guide career direction.",
      },
    },
    Productivity: {
      ko: "생산성",
      en: "Productivity",
      description: {
        ko: "작업 효율과 집중을 높이는 방법 · 습관입니다. 워크플로 · 도구 · 자동화 · 시간 관리가 주요 축입니다.",
        en: "Methods and habits for improving efficiency and focus. Workflow, tooling, automation, and time management are the main axes.",
      },
    },
    Essay: {
      ko: "에세이",
      en: "Essay",
      description: {
        ko: "경험 · 생각을 자유롭게 풀어내는 글입니다. 기술 · 일상 · 커리어에 대한 개인적 관점과 회고를 담습니다.",
        en: "Free-form writing on experiences and thoughts. Personal takes and reflections on tech, daily life, and career.",
      },
    },
    "Vue.js": {
      ko: "Vue.js",
      en: "Vue.js",
      description: {
        ko: "점진적 도입이 가능한 컴포넌트 기반 UI 프레임워크입니다. 반응형 상태 · SFC · Composition API 로 템플릿과 로직을 결합합니다.",
        en: "Progressive component-based UI framework. Reactive state, single-file components, and the Composition API bind template and logic.",
      },
    },
    Svelte: {
      ko: "Svelte",
      en: "Svelte",
      description: {
        ko: "런타임 대신 컴파일 타임에 동작하는 UI 프레임워크입니다. 가상 DOM 없이 반응성을 컴파일해 작은 번들과 빠른 실행을 냅니다.",
        en: "Compile-time UI framework rather than a runtime. Compiles reactivity without a virtual DOM for small bundles and fast execution.",
      },
    },
    Redux: {
      ko: "Redux",
      en: "Redux",
      description: {
        ko: "단방향 흐름의 예측 가능한 상태 컨테이너입니다. action→reducer→store 로 상태 변경을 중앙화하고 추적합니다.",
        en: "Predictable state container with unidirectional flow. Centralizes and traces state changes via action → reducer → store.",
      },
    },
    "React Query": {
      ko: "React Query",
      en: "React Query",
      description: {
        ko: "React 서버 상태 관리 라이브러리입니다. 캐싱 · 재검증 · 백그라운드 갱신으로 비동기 데이터 fetching 을 선언적으로 다룹니다.",
        en: "Server-state library for React. Caching, revalidation, and background refetching handle async data fetching declaratively.",
      },
    },
    Vite: {
      ko: "Vite",
      en: "Vite",
      description: {
        ko: "ESM 기반의 프론트엔드 빌드 도구입니다. 네이티브 import 로 dev 서버를 즉시 띄우고 프로덕션은 Rollup 으로 번들합니다.",
        en: "ESM-based frontend build tool. Native imports start the dev server instantly; production bundles via Rollup.",
      },
    },
    Sass: {
      ko: "Sass",
      en: "Sass",
      description: {
        ko: "CSS 를 확장한 전처리기입니다. 변수 · 중첩 · mixin · 모듈로 스타일을 구조화하고 재사용합니다.",
        en: "CSS preprocessor that extends the language. Variables, nesting, mixins, and modules structure and reuse styles.",
      },
    },
    Storybook: {
      ko: "Storybook",
      en: "Storybook",
      description: {
        ko: "UI 컴포넌트를 격리해 개발·문서화하는 도구입니다. story 단위로 상태·변형을 렌더하고 시각 테스트·문서를 함께 만듭니다.",
        en: "Tool for building and documenting UI components in isolation. Renders states and variants as stories, pairing visual testing with docs.",
      },
    },
    Java: {
      ko: "Java",
      en: "Java",
      description: {
        ko: "JVM 위에서 실행되는 객체지향 프로그래밍 언어입니다. 강한 타입 · 가비지 컬렉션 · 방대한 생태계로 엔터프라이즈·안드로이드 개발에 널리 쓰입니다.",
        en: "Object-oriented programming language running on the JVM. Strong typing, garbage collection, and a vast ecosystem; widely used for enterprise and Android.",
      },
    },
    Spring: {
      ko: "Spring",
      en: "Spring",
      description: {
        ko: "Java 기반 백엔드 애플리케이션 프레임워크입니다. DI · AOP · 트랜잭션 관리로 엔터프라이즈 개발을 표준화합니다.",
        en: "Java backend application framework. DI, AOP, and transaction management standardize enterprise development.",
      },
    },
    Rust: {
      ko: "Rust",
      en: "Rust",
      description: {
        ko: "메모리 안전성을 보장하는 시스템 프로그래밍 언어입니다. 소유권·빌림 검사로 GC 없이 동시성·안전성을 확보합니다.",
        en: "Systems programming language with memory safety. Ownership and borrow checking ensure concurrency and safety without a GC.",
      },
    },
    Express: {
      ko: "Express",
      en: "Express",
      description: {
        ko: "Node.js 기반 미니멀 웹 프레임워크입니다. 미들웨어 체인으로 라우팅·요청 처리를 유연하게 구성합니다.",
        en: "Minimal web framework for Node.js. Middleware chains flexibly compose routing and request handling.",
      },
    },
    NestJS: {
      ko: "NestJS",
      en: "NestJS",
      description: {
        ko: "TypeScript 기반 서버사이드 프레임워크입니다. 모듈 · DI · 데코레이터로 확장 가능한 구조를 강제합니다.",
        en: "TypeScript server-side framework. Modules, DI, and decorators enforce a scalable structure.",
      },
    },
    Redis: {
      ko: "Redis",
      en: "Redis",
      description: {
        ko: "인메모리 키-값 데이터 스토어입니다. 캐시 · 세션 · 큐 · pub/sub 에 낮은 지연으로 쓰입니다.",
        en: "In-memory key-value data store. Low-latency use for caching, sessions, queues, and pub/sub.",
      },
    },
    Prisma: {
      ko: "Prisma",
      en: "Prisma",
      description: {
        ko: "Node.js·TypeScript 기반 ORM 입니다. 타입 안전 쿼리·스키마 마이그레이션으로 DB 접근을 단순화합니다.",
        en: "ORM for Node.js and TypeScript. Type-safe queries and schema migrations simplify database access.",
      },
    },
    WebSocket: {
      ko: "WebSocket",
      en: "WebSocket",
      description: {
        ko: "양방향 실시간 통신 프로토콜입니다. 단일 TCP 연결로 서버·클라이언트 간 지속적 메시지 교환을 지원합니다.",
        en: "Bidirectional real-time communication protocol. A single TCP connection sustains continuous server-client messaging.",
      },
    },
    Linux: {
      ko: "Linux",
      en: "Linux",
      description: {
        ko: "오픈소스 유닉스 계열 운영체제입니다. 프로세스 · 파일시스템 · 권한 · 셸을 다루며 서버·컨테이너 인프라의 기반을 이룹니다.",
        en: "Open-source Unix-like operating system. Covers processes, filesystems, permissions, and shells; the base layer of server and container infrastructure.",
      },
    },
    Nginx: {
      ko: "Nginx",
      en: "Nginx",
      description: {
        ko: "고성능 웹 서버·리버스 프록시입니다. 정적 서빙 · 로드밸런싱 · TLS 종단 · 캐싱을 이벤트 기반으로 처리합니다.",
        en: "High-performance web server and reverse proxy. Handles static serving, load balancing, TLS termination, and caching on an event-driven core.",
      },
    },
    Terraform: {
      ko: "Terraform",
      en: "Terraform",
      description: {
        ko: "선언적 IaC(Infrastructure as Code) 도구입니다. HCL 로 인프라를 코드화하고 plan · apply · state 로 변경을 관리합니다.",
        en: "Declarative IaC (Infrastructure as Code) tool. Defines infrastructure in HCL; plan, apply, and state manage every change.",
      },
    },
    Monitoring: {
      ko: "모니터링",
      en: "Monitoring",
      description: {
        ko: "시스템·서비스 상태를 관측하는 작업입니다. 메트릭 · 로그 · 트레이스로 이상을 감지하고 알림·대시보드로 대응합니다.",
        en: "Observing the health of systems and services. Metrics, logs, and traces detect anomalies; alerts and dashboards drive response.",
      },
    },
    Serverless: {
      ko: "서버리스",
      en: "Serverless",
      description: {
        ko: "서버 관리 없이 함수·이벤트 단위로 동작하는 실행 모델입니다. 자동 스케일링 · 사용량 과금 · 콜드 스타트가 주요 특징입니다.",
        en: "Execution model that runs code as functions and events without managing servers. Auto-scaling, usage-based billing, and cold starts are the defining traits.",
      },
    },
    Cloudflare: {
      ko: "Cloudflare",
      en: "Cloudflare",
      description: {
        ko: "글로벌 엣지 네트워크·CDN 플랫폼입니다. CDN · DNS · DDoS 방어 · Workers 엣지 컴퓨팅을 제공합니다.",
        en: "Global edge network and CDN platform. Provides CDN, DNS, DDoS protection, and Workers edge computing.",
      },
    },
    "Design Pattern": {
      ko: "디자인 패턴",
      en: "Design Pattern",
      description: {
        ko: "반복되는 설계 문제에 대한 검증된 해결책 모음입니다. 생성 · 구조 · 행위로 분류되며 GoF 23개 패턴이 기초를 이룹니다.",
        en: "Reusable solutions to recurring design problems. Grouped into creational, structural, and behavioral; the GoF 23 form the foundation.",
      },
    },
    Concurrency: {
      ko: "동시성",
      en: "Concurrency",
      description: {
        ko: "여러 작업을 겹쳐 진행시키는 실행 모델입니다. thread · lock · async 로 자원을 공유하며 race condition·deadlock 이 핵심 난제입니다.",
        en: "Execution model that interleaves multiple tasks. Threads, locks, and async share resources; race conditions and deadlocks are the core hazards.",
      },
    },
    Compiler: {
      ko: "컴파일러",
      en: "Compiler",
      description: {
        ko: "소스 코드를 다른 표현으로 번역하는 프로그램입니다. lexing · parsing · 의미 분석 · 최적화 · 코드 생성 단계를 거칩니다.",
        en: "Program that translates source code into another representation. Passes through lexing, parsing, semantic analysis, optimization, and code generation.",
      },
    },
    Cryptography: {
      ko: "암호학",
      en: "Cryptography",
      description: {
        ko: "정보를 보호하기 위한 수학적 기법의 학문입니다. 대칭·비대칭 암호 · hash · 서명으로 기밀성 · 무결성 · 인증을 보장합니다.",
        en: "Study of mathematical techniques for securing information. Symmetric/asymmetric ciphers, hashes, and signatures provide confidentiality, integrity, and authentication.",
      },
    },
    "Functional Programming": {
      ko: "함수형 프로그래밍",
      en: "Functional Programming",
      description: {
        ko: "함수 합성과 불변성을 중심에 둔 프로그래밍 패러다임입니다. 순수 함수 · 고차 함수 · 부수효과 격리로 예측 가능한 코드를 지향합니다.",
        en: "Programming paradigm centered on function composition and immutability. Pure functions, higher-order functions, and isolated side effects yield predictable code.",
      },
    },
    OOP: {
      ko: "OOP",
      en: "OOP",
      description: {
        ko: "데이터와 동작을 객체로 묶는 프로그래밍 패러다임입니다. 캡슐화 · 상속 · 다형성 · 추상화가 네 기둥입니다.",
        en: "Programming paradigm that bundles data and behavior into objects. Encapsulation, inheritance, polymorphism, and abstraction are the four pillars.",
      },
    },
    "Machine Learning": {
      ko: "머신러닝",
      en: "Machine Learning",
      description: {
        ko: "데이터에서 패턴을 학습해 예측·분류하는 기법입니다. 지도 · 비지도 · 강화 학습으로 나뉘며 feature · 손실함수 · 일반화가 핵심 축입니다.",
        en: "Techniques that learn patterns from data to predict and classify. Split into supervised, unsupervised, and reinforcement learning; features, loss functions, and generalization are the core axes.",
      },
    },
    "Artificial Intelligence": {
      ko: "인공지능",
      en: "Artificial Intelligence",
      description: {
        ko: "인간의 지능적 행동을 기계로 구현하는 분야입니다. 머신러닝 · 추론 · 자연어처리 · 컴퓨터비전을 포괄하며 현재는 생성형 모델이 주류입니다.",
        en: "Field that reproduces intelligent behavior in machines. Spans machine learning, reasoning, NLP, and computer vision; generative models now lead.",
      },
    },
    LLM: {
      ko: "LLM",
      en: "LLM",
      description: {
        ko: "대규모 텍스트로 학습한 언어 모델입니다. Transformer 기반으로 문맥 이해·생성을 수행하며 프롬프트 · 파인튜닝 · RAG 로 제어합니다.",
        en: "Language model trained on massive text corpora. Transformer-based context understanding and generation; controlled via prompting, fine-tuning, and RAG.",
      },
    },
    "Data Science": {
      ko: "데이터 사이언스",
      en: "Data Science",
      description: {
        ko: "데이터에서 인사이트·예측을 끌어내는 분야입니다. 수집 · 전처리 · 통계 · 모델링 · 시각화를 아우르며 실험과 검증이 핵심입니다.",
        en: "Field that extracts insight and predictions from data. Spans collection, preprocessing, statistics, modeling, and visualization; experimentation and validation are central.",
      },
    },
    Debugging: {
      ko: "디버깅",
      en: "Debugging",
      description: {
        ko: "결함을 재현·추적하고 원인을 찾아 고치는 작업입니다. 로그 · 브레이크포인트 · 스택 트레이스 · 이분 탐색이 주요 수단입니다.",
        en: "Reproducing, tracing, and fixing defects. Logs, breakpoints, stack traces, and bisection are the main tools.",
      },
    },
    "Code Review": {
      ko: "코드 리뷰",
      en: "Code Review",
      description: {
        ko: "변경된 코드를 동료가 검토하는 협업 과정입니다. 결함 조기 발견 · 지식 공유 · 컨벤션 일관성을 목표로 합니다.",
        en: "Peer inspection of proposed code changes. Aims for early defect detection, knowledge sharing, and convention consistency.",
      },
    },
    "Open Source": {
      ko: "오픈소스",
      en: "Open Source",
      description: {
        ko: "소스 코드를 공개하고 협업으로 발전시키는 개발 방식입니다. 라이선스 · 기여 · 커뮤니티 거버넌스가 핵심 축입니다.",
        en: "Development model with publicly shared source and collaborative growth. Licensing, contribution, and community governance are the core axes.",
      },
    },
    "Side Project": {
      ko: "사이드 프로젝트",
      en: "Side Project",
      description: {
        ko: "본업과 별개로 자율적으로 만드는 개인 프로젝트입니다. 학습 · 실험 · 포트폴리오 · 수익화가 주된 동기입니다.",
        en: "Personal project built outside of primary work. Learning, experimentation, portfolio, and monetization are the main motivations.",
      },
    },
    Reading: {
      ko: "독서",
      en: "Reading",
      description: {
        ko: "책·글을 읽고 소화하는 지적 활동입니다. 기술서 · 아티클 · 독서 노트로 지식을 축적합니다.",
        en: "Reading and digesting books and articles. Builds knowledge through technical books, articles, and reading notes.",
      },
    },
  } as Record<
    string,
    | string
    | LocalizedText
    | { ko?: string; en?: string; description?: LocalizedText }
  >,
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

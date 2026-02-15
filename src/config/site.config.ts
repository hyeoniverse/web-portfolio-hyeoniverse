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
    // 필요에 따라 소셜 링크를 추가하세요:
    // twitter: "https://twitter.com/username",
    // instagram: "https://instagram.com/username",
  },

  // ---------------------------------------------------------------------------
  // SEO 및 메타데이터
  // ---------------------------------------------------------------------------
  metadata: {
    title: "Hyeoniverse ✦ Portfolio",
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
    headline: ["Creative", "Developer", "& Designer"], // 메인 헤드라인 (각 항목 = 새 줄)
    subtext: ["Based in Seoul, KR", "Open to opportunities"],
  },

  cta: {
    label: "Open to Opportunities",
    title: ["Looking for", "someone?"],
    buttonText: "Get in touch",
  },

  footer: {
    copyright: `HYEON © ${new Date().getFullYear()}, All Rights Reserved`,
  },

  // ---------------------------------------------------------------------------
  // 로딩 화면
  // ---------------------------------------------------------------------------
  loading: {
    displayName: "Hyeoniverse", // 로딩 화면에 표시되는 이름
  },

  // ---------------------------------------------------------------------------
  // Works 페이지
  // ---------------------------------------------------------------------------
  works: {
    // 무한 스크롤 활성화 여부 (false: 끝에서 멈춤)
    infiniteScroll: true,
  },

  // ---------------------------------------------------------------------------
  // 웹플로우 페이지
  // ---------------------------------------------------------------------------
  webflow: {
    // 디자인 컨셉 패널 전환 모드: "strip" (수평 마키) | "stack" (레이어 슬라이드 아웃)
    designConceptTransition: "strip" as "strip" | "stack",
    // 무한 스크롤 활성화 여부 (false: 끝에서 멈춤)
    infiniteScroll: true,
  },
} as const;

// 컴포넌트에서 사용하기 위한 타입 내보내기
export type SiteConfig = typeof siteConfig;

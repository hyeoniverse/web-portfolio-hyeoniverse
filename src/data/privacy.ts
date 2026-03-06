import { siteConfig } from "@/config/site.config";

// 타입
export interface ContentPart {
  highlight?: string;
}

export interface ListItem {
  strong?: string;
  text: string;
  link?: {
    text: string;
    url: string;
  };
}

export interface Section {
  title: string;
  content?: string;
  contentParts?: (string | ContentPart)[];
  list?: ListItem[];
  email?: boolean;
}

export interface PrivacyContent {
  backLink: string;
  title: string;
  lastUpdated: string;
  sections: Section[];
  footer: string;
}

export type Language = "en" | "ko";

// 콘텐츠 번역
export const content: Record<Language, PrivacyContent> = {
  en: {
    backLink: "Go back",
    title: "Privacy Policy",
    lastUpdated: "Last updated",
    sections: [
      {
        title: "1. Introduction",
        contentParts: [
          "Welcome to ",
          { highlight: siteConfig.metadata.title },
          "'s portfolio. This privacy policy explains how your information is handled when you visit this website or use the contact form.",
        ],
      },
      {
        title: "2. Information We Collect",
        content:
          "This portfolio site collects minimal information only when you use the contact form:",
        list: [
          {
            strong: "Contact Form:",
            text: "Your name, email address, and message content when you submit an inquiry.",
          },
          {
            strong: "Technical Data:",
            text: "Basic analytics data such as page views and device type for improving the site experience.",
          },
        ],
      },
      {
        title: "3. How We Use Your Information",
        content: "The information collected is used solely to:",
        list: [
          { text: "Respond to your inquiries and collaboration requests" },
          { text: "Prevent spam through reCAPTCHA verification" },
        ],
      },
      {
        title: "4. Third-Party Services",
        content: "This site uses the following services:",
        list: [
          {
            strong: "Formspree:",
            text: "Handles contact form submissions securely.",
            link: {
              text: "Privacy Policy",
              url: "https://formspree.io/legal/privacy-policy",
            },
          },
          {
            strong: "Google reCAPTCHA:",
            text: "Protects the contact form from spam.",
            link: {
              text: "Privacy Policy",
              url: "https://policies.google.com/privacy",
            },
          },
        ],
      },
      {
        title: "5. Your Rights",
        content:
          "You may request access to, correction of, or deletion of any personal data you have submitted through the contact form by reaching out directly.",
      },
      {
        title: "6. Contact",
        content: "For any privacy-related questions, please contact: ",
        email: true,
      },
    ],
    footer: "All rights reserved.",
  },
  ko: {
    backLink: "Go back",
    title: "개인정보 처리방침",
    lastUpdated: "최종 수정일",
    sections: [
      {
        title: "1. 소개",
        contentParts: [
          { highlight: siteConfig.metadata.title },
          "에 오신 것을 환영합니다. 본 개인정보 처리방침은 웹사이트 방문 및 문의 양식 사용 시 정보가 어떻게 처리되는지 설명합니다.",
        ],
      },
      {
        title: "2. 수집하는 정보",
        content:
          "본 포트폴리오 사이트는 문의 양식 사용 시에만 최소한의 정보를 수집합니다:",
        list: [
          {
            strong: "문의 양식:",
            text: "문의 제출 시 이름, 이메일 주소 및 메시지 내용을 수집합니다.",
          },
          {
            strong: "기술 데이터:",
            text: "사이트 경험 개선을 위한 페이지 조회수, 기기 유형 등 기본적인 분석 데이터를 수집합니다.",
          },
        ],
      },
      {
        title: "3. 정보 이용 방법",
        content: "수집된 정보는 다음 목적으로만 사용됩니다:",
        list: [
          { text: "문의 및 협업 요청에 대한 응답" },
          { text: "reCAPTCHA를 통한 스팸 방지" },
        ],
      },
      {
        title: "4. 제3자 서비스",
        content: "본 사이트는 다음 서비스를 사용합니다:",
        list: [
          {
            strong: "Formspree:",
            text: "문의 양식 제출을 안전하게 처리합니다.",
            link: {
              text: "개인정보 처리방침",
              url: "https://formspree.io/legal/privacy-policy",
            },
          },
          {
            strong: "Google reCAPTCHA:",
            text: "문의 양식을 스팸으로부터 보호합니다.",
            link: {
              text: "개인정보 처리방침",
              url: "https://policies.google.com/privacy",
            },
          },
        ],
      },
      {
        title: "5. 귀하의 권리",
        content:
          "문의 양식을 통해 제출한 개인정보에 대한 열람, 정정 또는 삭제를 요청하실 수 있습니다. 직접 연락해 주시기 바랍니다.",
      },
      {
        title: "6. 문의",
        content: "개인정보 관련 문의사항은 다음으로 연락해 주세요: ",
        email: true,
      },
    ],
    footer: "All rights reserved.",
  },
};

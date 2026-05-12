import { siteConfig } from "@/config/site.config";

// 타입
interface ContentPart {
  highlight?: string;
}

interface ListItem {
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
          "This portfolio site collects minimal information when you use the contact form or comment features:",
        list: [
          {
            strong: "Contact Form:",
            text: "Your name, email address, and message content when you submit an inquiry.",
          },
          {
            strong: "Comments:",
            text: "Nickname (randomly assigned), comment content, password (stored as a hash), and an optional email address for reply notifications. A browser-based identifier is used to verify comment ownership.",
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
          { text: "Display comments and identify comment authors" },
          { text: "Verify comment ownership for editing and deletion" },
          { text: "Send reply notifications to the email address you provide (optional)" },
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
          {
            strong: "Translation API:",
            text: "Comment content may be sent to a translation service when translation is requested by a user. No personal data is included.",
          },
        ],
      },
      {
        title: "5. Comment Policy",
        content:
          "Comments are a public feature of this site. Please be aware of the following:",
        list: [
          { text: "Comments that are inappropriate, offensive, or contain spam may be removed without notice by the site administrator." },
          { text: "Your comment data (content, nickname, password hash) is stored until you delete it or it is removed by the administrator." },
          { text: "Passwords are stored as bcrypt hashes and cannot be recovered. They are used solely for verifying comment ownership." },
        ],
      },
      {
        title: "6. Your Rights",
        content:
          "You may request access to, correction of, or deletion of any personal data you have submitted through the contact form or comment features by reaching out directly.",
      },
      {
        title: "7. Contact",
        content: "For any privacy-related questions, please contact: ",
        email: true,
      },
    ],
    footer: "All rights reserved.",
  },
  ko: {
    backLink: "뒤로 가기",
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
          "본 포트폴리오 사이트는 문의 양식 및 댓글 기능 사용 시 최소한의 정보를 수집합니다:",
        list: [
          {
            strong: "문의 양식:",
            text: "문의 제출 시 이름, 이메일 주소 및 메시지 내용을 수집합니다.",
          },
          {
            strong: "댓글:",
            text: "닉네임(자동 부여), 댓글 내용, 비밀번호(해시 저장), 답글 알림용 이메일(선택)을 수집합니다. 댓글 소유권 확인을 위해 브라우저 기반 식별자가 사용됩니다.",
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
          { text: "댓글 표시 및 작성자 식별" },
          { text: "댓글 수정·삭제 시 소유권 확인" },
          { text: "답글 알림 이메일 발송 (선택 제공 시)" },
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
          {
            strong: "번역 API:",
            text: "사용자가 번역을 요청할 경우 댓글 내용이 번역 서비스로 전송됩니다. 개인정보는 포함되지 않습니다.",
          },
        ],
      },
      {
        title: "5. 댓글 정책",
        content:
          "댓글은 본 사이트의 공개 기능입니다. 다음 사항을 유의해 주세요:",
        list: [
          { text: "부적절하거나 불쾌한 내용, 스팸성 댓글은 관리자에 의해 사전 통보 없이 삭제될 수 있습니다." },
          { text: "댓글 데이터(내용, 닉네임, 비밀번호 해시)는 본인이 삭제하거나 관리자가 삭제할 때까지 보관됩니다." },
          { text: "비밀번호는 bcrypt 해시로 저장되며 복구할 수 없습니다. 댓글 소유권 확인 용도로만 사용됩니다." },
        ],
      },
      {
        title: "6. 귀하의 권리",
        content:
          "문의 양식 또는 댓글 기능을 통해 제출한 개인정보에 대한 열람, 정정 또는 삭제를 요청하실 수 있습니다. 직접 연락해 주시기 바랍니다.",
      },
      {
        title: "7. 문의",
        content: "개인정보 관련 문의사항은 다음으로 연락해 주세요: ",
        email: true,
      },
    ],
    footer: "All rights reserved.",
  },
};

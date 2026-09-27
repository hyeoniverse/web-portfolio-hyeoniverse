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

// 실제 최종 개정일 (YYYY-MM-DD) — 표시는 항상 이 값 기준. 정책을 고칠 때마다 갱신.
export const lastUpdatedDate = "2026-09-27";

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
          "This portfolio site collects the following information when you visit the site or use the contact form and comment features:",
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
            strong: "Visit Records:",
            text: "Once per day for each visit: IP address, browser, operating system, and device type (derived from the User-Agent), country (estimated from the IP address by our hosting provider), the domain of the referring site, the first page you landed on, UTM parameters in the link, and the visit date.",
          },
          {
            strong: "Views, Likes, and Poll Votes:",
            text: "Your IP address is stored with post and project views, likes, and poll votes to prevent duplicate counting.",
          },
          {
            strong: "Administrator Sign-In:",
            text: "When a site operator signs in with GitHub, their GitHub email, username, avatar image, and profile URL are stored for author attribution. This applies only to administrators, not visitors.",
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
          { text: "Compile visit statistics such as referral channels, devices, countries, and returning visits" },
          { text: "Prevent duplicate views, likes, and poll votes, and separate automated (bot) traffic" },
        ],
      },
      {
        title: "4. Retention",
        content: "Information is kept only as long as described below:",
        list: [
          { text: "IP addresses in visit and view records are deleted or anonymized 90 days after the visit. Only aggregate fields (device, country, referral) remain." },
          { text: "IP addresses stored with likes and poll votes are kept while the like or vote exists, and are deleted together when you remove the like or change your vote." },
          { text: "In the administrator traffic screen, IP addresses are shown only partially masked (e.g. 211.234.x.x)." },
        ],
      },
      {
        title: "5. Third-Party Services",
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
            strong: "GitHub (OAuth):",
            text: "Used for administrator and author sign-in. Only site operators authenticate via GitHub; visitors are never asked to log in.",
            link: {
              text: "Privacy Statement",
              url: "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
            },
          },
          {
            strong: "Vercel:",
            text: "Hosts this website. It processes your IP address to deliver pages and provides the estimated country used in visit statistics.",
            link: {
              text: "Privacy Policy",
              url: "https://vercel.com/legal/privacy-policy",
            },
          },
          {
            strong: "Supabase:",
            text: "Hosts the database and file storage. Comments, post data, and uploaded media are stored on Supabase infrastructure.",
            link: {
              text: "Privacy Policy",
              url: "https://supabase.com/privacy",
            },
          },
          {
            strong: "Resend:",
            text: "Delivers reply-notification and administrator emails. Only the email address you provide is used to send them.",
            link: {
              text: "Privacy Policy",
              url: "https://resend.com/legal/privacy-policy",
            },
          },
          {
            strong: "Translation API:",
            text: "Comment content may be sent to a translation service when translation is requested by a user. No personal data is included.",
          },
        ],
      },
      {
        title: "6. Comment Policy",
        content:
          "Comments are a public feature of this site. Please be aware of the following:",
        list: [
          { text: "Comments that are inappropriate, offensive, or contain spam may be removed without notice by the site administrator." },
          { text: "Your comment data (content, nickname, password hash) is stored until you delete it or it is removed by the administrator." },
          { text: "Passwords are stored as bcrypt hashes and cannot be recovered. They are used solely for verifying comment ownership." },
        ],
      },
      {
        title: "7. Your Rights",
        content:
          "You may request access to, correction of, or deletion of any personal data you have submitted through the contact form or comment features by reaching out directly.",
      },
      {
        title: "8. Contact",
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
          "본 포트폴리오 사이트는 사이트 방문과 문의 양식·댓글 기능 사용 시 다음 정보를 수집합니다:",
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
            strong: "방문 기록:",
            text: "방문마다 하루 한 번 IP 주소, 브라우저·운영체제·기기 종류(User-Agent 에서 추출), 국가(호스팅 사업자가 IP 로 추정), 유입된 사이트의 도메인, 처음 들어온 페이지 경로, 링크의 UTM 파라미터, 방문 날짜를 기록합니다.",
          },
          {
            strong: "조회·좋아요·투표:",
            text: "게시물·작업물 조회, 좋아요, 투표의 중복을 막기 위해 IP 주소를 함께 저장합니다.",
          },
          {
            strong: "관리자 로그인:",
            text: "사이트 운영자가 GitHub로 로그인하면 작성자 표기를 위해 GitHub 이메일, 사용자명, 아바타 이미지, 프로필 URL이 저장됩니다. 방문자가 아닌 관리자에게만 해당됩니다.",
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
          { text: "유입 경로·기기·국가·재방문 등 방문 통계 집계" },
          { text: "조회수·좋아요·투표 중복 방지 및 자동화(봇) 트래픽 구분" },
        ],
      },
      {
        title: "4. 보관 기간",
        content: "수집한 정보는 다음 기간 동안만 보관합니다:",
        list: [
          { text: "방문·조회 기록의 IP 주소는 방문일로부터 90일이 지나면 삭제하거나 익명화합니다. 기기·국가·유입 경로 같은 집계 항목만 남습니다." },
          { text: "좋아요·투표와 함께 저장한 IP 주소는 해당 좋아요·투표가 있는 동안 보관하며, 좋아요를 취소하거나 투표를 바꾸면 함께 삭제됩니다." },
          { text: "관리자 트래픽 화면에서도 IP 주소는 일부를 가린 형태(예: 211.234.x.x)로만 표시합니다." },
        ],
      },
      {
        title: "5. 제3자 서비스",
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
            strong: "GitHub (OAuth):",
            text: "관리자 및 작성자 로그인에 사용됩니다. 사이트 운영자만 GitHub로 인증하며, 방문자에게는 로그인을 요구하지 않습니다.",
            link: {
              text: "개인정보 처리방침",
              url: "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
            },
          },
          {
            strong: "Vercel:",
            text: "웹사이트를 호스팅합니다. 페이지 전송 과정에서 IP 주소를 처리하며, 방문 통계에 쓰는 국가 정보를 IP 로 추정해 제공합니다.",
            link: {
              text: "개인정보 처리방침",
              url: "https://vercel.com/legal/privacy-policy",
            },
          },
          {
            strong: "Supabase:",
            text: "데이터베이스와 파일 저장소를 호스팅합니다. 댓글, 게시물 데이터, 업로드된 미디어가 Supabase 인프라에 저장됩니다.",
            link: {
              text: "개인정보 처리방침",
              url: "https://supabase.com/privacy",
            },
          },
          {
            strong: "Resend:",
            text: "답글 알림 및 관리자 이메일을 발송합니다. 제공하신 이메일 주소는 발송 용도로만 사용됩니다.",
            link: {
              text: "개인정보 처리방침",
              url: "https://resend.com/legal/privacy-policy",
            },
          },
          {
            strong: "번역 API:",
            text: "사용자가 번역을 요청할 경우 댓글 내용이 번역 서비스로 전송됩니다. 개인정보는 포함되지 않습니다.",
          },
        ],
      },
      {
        title: "6. 댓글 정책",
        content:
          "댓글은 본 사이트의 공개 기능입니다. 다음 사항을 유의해 주세요:",
        list: [
          { text: "부적절하거나 불쾌한 내용, 스팸성 댓글은 관리자에 의해 사전 통보 없이 삭제될 수 있습니다." },
          { text: "댓글 데이터(내용, 닉네임, 비밀번호 해시)는 본인이 삭제하거나 관리자가 삭제할 때까지 보관됩니다." },
          { text: "비밀번호는 bcrypt 해시로 저장되며 복구할 수 없습니다. 댓글 소유권 확인 용도로만 사용됩니다." },
        ],
      },
      {
        title: "7. 귀하의 권리",
        content:
          "문의 양식 또는 댓글 기능을 통해 제출한 개인정보에 대한 열람, 정정 또는 삭제를 요청하실 수 있습니다. 직접 연락해 주시기 바랍니다.",
      },
      {
        title: "8. 문의",
        content: "개인정보 관련 문의사항은 다음으로 연락해 주세요: ",
        email: true,
      },
    ],
    footer: "All rights reserved.",
  },
};

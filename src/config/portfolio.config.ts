/**
 * Portfolio Configuration Type
 *
 * 포트폴리오 설정을 위한 타입 정의입니다.
 * info.config.ts 파일에서 본인의 정보를 수정하세요.
 */

import type { Project, Skills, Experience, BlogPost } from "@/types";

export interface PortfolioConfig {
  // 개인 정보
  personal: {
    name: string;
    nickName?: string;
    role: string;
    status: string;
    location: string;
    eng: {
      name: string;
      nickName?: string;
      role: string;
    };
  };

  // 소셜 링크
  social: {
    email: string;
    github: string;
    blog: string;
    linkedin: string;
  };

  // 히어로 섹션
  hero: {
    issueNumber: string;
    title: string;
    description: string;
    subDescription: string;
    skills: string[];
  };

  // 소개 섹션 - 프로필
  about: {
    introduction: {
      title: string;
      paragraphs: Array<{
        text: string;
        highlight?: string;
      }>;
    };
    tags: Array<{
      label: string;
      tag: string;
      isFirst: boolean;
    }>;
    focusAreas: Array<{
      title: string;
      content: string;
    }>;
  };

  // 소개 섹션 - 인터뷰
  interview: {
    questions: Array<{
      number: string;
      category: string;
      title: string;
      paragraphs: Array<{
        text: string;
        isLead?: boolean;
        isHighlight?: boolean;
      }>;
    }>;
  };

  // 메타데이터
  metadata: {
    title: string;
    description: string;
    keywords: string;
    author: string;
    ogTitle: string;
    ogDescription: string;
  };

  // 데이터
  projects: Project[];
  projectDetails: Record<
    string,
    {
      period: string;
      team: string;
      role: string;
      features: string[];
      challenges: string[];
      learned: string[];
    }
  >;
  skills: Skills[];
  experiences: Experience[];
  blogPosts: BlogPost[];
}

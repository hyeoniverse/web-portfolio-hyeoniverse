import type { Language } from "@/providers/LanguageProvider";
import { siteConfig } from "@/config/site.config";

type LocalizedText = Record<Language, string>;

export interface Experience {
  period: LocalizedText;
  role: LocalizedText;
  company: string;
  description: LocalizedText;
}

export interface Skill {
  name: string;
  level: number;
}

export interface Philosophy {
  title: string; // Section title — not translated
  description: LocalizedText;
}

export const experiences: Experience[] = [
  {
    period: { ko: "2020 - 현재", en: "2020 - Present" },
    role: { ko: "시니어 프론트엔드 개발자", en: "Senior Frontend Developer" },
    company: siteConfig.brand.name,
    description: {
      ko: "프론트엔드 개발을 리드하며 혁신적인 디지털 경험을 만들고 있습니다.",
      en: "Leading frontend development and creating innovative digital experiences.",
    },
  },
  {
    period: { ko: "2018 - 2020", en: "2018 - 2020" },
    role: { ko: "풀스택 개발자", en: "Full Stack Developer" },
    company: "Digital Agency XYZ",
    description: {
      ko: "확장 가능한 웹 애플리케이션과 이커머스 플랫폼을 구축했습니다.",
      en: "Built scalable web applications and e-commerce platforms.",
    },
  },
  {
    period: { ko: "2016 - 2018", en: "2016 - 2018" },
    role: { ko: "주니어 개발자", en: "Junior Developer" },
    company: "Startup Inc.",
    description: {
      ko: "React와 Node.js로 웹 개발 여정을 시작했습니다.",
      en: "Started my journey in web development with React and Node.js.",
    },
  },
];

export const skills: Skill[] = [
  { name: "React / Next.js", level: 95 },
  { name: "TypeScript", level: 90 },
  { name: "GSAP / Animation", level: 85 },
  { name: "Webflow", level: 80 },
  { name: "Node.js", level: 75 },
  { name: "UI/UX Design", level: 70 },
];

export interface ToolCategory {
  category: string; // Not translated — display name
  tools: string[];
}

export const toolCategories: ToolCategory[] = [
  {
    category: "Frontend",
    tools: ["React", "Next.js", "TypeScript", "HTML/CSS", "Tailwind CSS"],
  },
  {
    category: "Animation",
    tools: ["GSAP", "Framer Motion", "CSS Animations", "Lottie"],
  },
  {
    category: "Backend",
    tools: ["Node.js", "Express", "PostgreSQL", "REST API"],
  },
  {
    category: "Tools & Platform",
    tools: ["Git", "Figma", "VS Code", "Vercel", "Docker"],
  },
];

export interface ApproachStep {
  number: string;
  title: string;
  description: LocalizedText;
}

export const approachSteps: ApproachStep[] = [
  {
    number: "01",
    title: "Discovery",
    description: {
      en: "Understanding the problem, user needs, and project goals through research and collaboration.",
      ko: "리서치와 협업을 통해 문제, 사용자 요구, 프로젝트 목표를 파악합니다.",
    },
  },
  {
    number: "02",
    title: "Design",
    description: {
      en: "Creating wireframes, prototypes, and visual designs that align with the user experience.",
      ko: "사용자 경험에 맞는 와이어프레임, 프로토타입, 비주얼 디자인을 제작합니다.",
    },
  },
  {
    number: "03",
    title: "Develop",
    description: {
      en: "Building with clean, performant code using modern technologies and best practices.",
      ko: "최신 기술과 모범 사례를 활용해 깔끔하고 성능 좋은 코드로 구현합니다.",
    },
  },
  {
    number: "04",
    title: "Deliver",
    description: {
      en: "Testing, optimizing, and deploying with continuous iteration based on feedback.",
      ko: "테스트, 최적화, 배포 후 피드백을 바탕으로 지속적으로 개선합니다.",
    },
  },
];

export const philosophy: Philosophy[] = [
  {
    title: "Design with Purpose",
    description: {
      ko: "모든 픽셀은 목적이 있어야 합니다. 아름다울 뿐만 아니라 기능적이고 의미 있는 디자인을 만드는 것을 믿습니다.",
      en: "Every pixel should serve a purpose. I believe in creating designs that are not just beautiful, but functional and meaningful.",
    },
  },
  {
    title: "Code with Care",
    description: {
      ko: "깔끔하고 유지보수 가능한 코드는 훌륭한 제품의 기반입니다. 미래의 개발자(저 자신 포함)가 감사할 코드를 작성합니다.",
      en: "Clean, maintainable code is the foundation of great products. I write code that future developers (including myself) will thank me for.",
    },
  },
  {
    title: "Learn Continuously",
    description: {
      ko: "기술 산업은 끊임없이 변화합니다. 변화를 받아들이고 항상 새로운 지식과 기술을 추구합니다.",
      en: "The tech industry never stops evolving. I embrace change and constantly seek new knowledge and skills to stay ahead.",
    },
  },
];

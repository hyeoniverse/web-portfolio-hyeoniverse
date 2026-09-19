import type { LocalizedText } from "@/types/common";
import { siteConfig } from "@/config/site.config";

export interface DatePeriod {
  start: string;        // "2024" | "2024-03" | "2024-03-15"
  end?: string;
  ongoing?: boolean;
  format: "year" | "yearMonth" | "date";
}

export interface Experience {
  period: DatePeriod;
  role: LocalizedText;
  company: string;
  description: LocalizedText;
}

interface Skill {
  name: string;
  description: LocalizedText;
}

export interface SkillGroup {
  category: string;
  description: LocalizedText;
  skills: Skill[];
}

export interface Philosophy {
  title: string; // Section title — not translated
  description: LocalizedText;
}

export const experiences: Experience[] = [
  {
    period: { start: "2024", ongoing: true, format: "year" },
    role: { ko: "개인 프로젝트", en: "Personal Projects" },
    company: siteConfig.metadata.title,
    description: {
      ko: "포트폴리오 사이트 기획·개발. Next.js, GSAP, Framer Motion 활용.",
      en: "Planned and built this portfolio site with Next.js, GSAP, and Framer Motion.",
    },
  },
  {
    period: { start: "2023", format: "year" },
    role: { ko: "프론트엔드 인턴", en: "Frontend Intern" },
    company: "Web Studio",
    description: {
      ko: "React 기반 웹 서비스 유지보수 및 신규 페이지 개발에 참여했습니다.",
      en: "Maintained React-based web services and helped build new pages.",
    },
  },
  {
    period: { start: "2020", end: "2024", format: "year" },
    role: { ko: "컴퓨터공학 전공", en: "Computer Science Major" },
    company: "University",
    description: {
      ko: "전공 수업과 팀 프로젝트를 통해 웹 개발 전반을 공부했습니다.",
      en: "Studied web development through coursework and team projects.",
    },
  },
];

/* 교육·활동 — 경력과 같은 모양(기간·이름·소속·설명)을 쓴다. 갓 시작한 사람은 경력이 비어 있어도
   이 둘로 채울 수 있다. 기본값은 비워 둔다 — 적지 않으면 프로필에 그 판이 아예 안 나온다 */
export const education: Experience[] = [];

export const activities: Experience[] = [];

export const skillGroups: SkillGroup[] = [
  {
    category: "Frontend",
    description: {
      ko: "가장 오래 다뤘고, 가장 자신 있는 영역입니다. 이 포트폴리오 사이트를 포함해서 대부분의 프로젝트를 React + TypeScript 기반으로 만들었습니다.",
      en: "The area I've spent the most time with and feel most confident in. Most of my projects, including this portfolio, are built on React + TypeScript.",
    },
    skills: [
      {
        name: "React / Next.js",
        description: {
          ko: "이 포트폴리오를 Next.js App Router 기반으로 처음부터 설계하고 만들었습니다. SSR과 동적 라우팅을 적용했고, next/image로 이미지 최적화도 직접 처리했습니다. 컴포넌트 구조를 나누고 재사용 가능하게 설계하는 데 신경을 많이 씁니다.",
          en: "I designed and built this portfolio from scratch on Next.js App Router. Applied SSR and dynamic routing, handled image optimization with next/image. I focus a lot on splitting components and designing them to be reusable.",
        },
      },
      {
        name: "TypeScript",
        description: {
          ko: "모든 프로젝트에서 TypeScript를 쓰고 있습니다. 인터페이스로 데이터 구조를 정의하고, 제네릭이나 유니온 타입 같은 기능도 필요할 때 자연스럽게 활용합니다. 타입 덕분에 리팩토링할 때 실수가 확 줄더라고요.",
          en: "I use TypeScript in every project. I define data structures with interfaces and naturally reach for generics and union types when needed. Types make refactoring so much less error-prone.",
        },
      },
      {
        name: "HTML / CSS",
        description: {
          ko: "이 사이트의 모든 스타일을 CSS Modules로 직접 작성했습니다. CSS 커스텀 프로퍼티로 테마 시스템을 구성했고, clamp()와 미디어 쿼리를 조합해서 반응형 레이아웃을 설계했습니다.",
          en: "I wrote all the styles for this site myself using CSS Modules. Built the theme system with CSS custom properties and designed responsive layouts combining clamp() with media queries.",
        },
      },
      {
        name: "Tailwind CSS",
        description: {
          ko: "팀 프로젝트에서 Tailwind를 써봤습니다. 유틸리티 클래스 기반으로 빠르게 스타일링하는 방식에 익숙하고, 커스텀 설정도 다뤄봤습니다.",
          en: "Used Tailwind in team projects. Comfortable with the utility-first approach for rapid styling and have experience with custom configuration.",
        },
      },
    ],
  },
  {
    category: "Animation & Interaction",
    description: {
      ko: "이 포트폴리오를 만들면서 제대로 빠진 영역입니다. 스크롤 한 번에 화면이 살아나는 게 재밌어서, 점점 더 복잡한 인터랙션에 도전하게 됐습니다.",
      en: "This is the area I really fell into while building this portfolio. Seeing the screen come alive on each scroll was so much fun that I kept pushing for more complex interactions.",
    },
    skills: [
      {
        name: "GSAP / ScrollTrigger",
        description: {
          ko: "이 사이트의 가로 스크롤 갤러리, 무한 루프 스크롤, 스크롤 기반 등장 애니메이션을 전부 GSAP으로 구현했습니다. requestAnimationFrame 기반 커스텀 스크롤 시스템도 직접 만들었고, ScrollTrigger로 섹션별 애니메이션 타이밍을 세밀하게 제어합니다.",
          en: "I built the horizontal scroll gallery, infinite scroll loop, and all scroll-triggered reveal animations on this site with GSAP. Created a custom scroll system based on requestAnimationFrame and fine-tuned per-section animation timing with ScrollTrigger.",
        },
      },
      {
        name: "Framer Motion",
        description: {
          ko: "페이지 전환 애니메이션, 마우스를 따라가는 패럴랙스 효과, 호버 시 반응하는 인터랙션 등에 활용하고 있습니다. useSpring과 useTransform 조합으로 물리 기반 자연스러운 움직임을 구현합니다.",
          en: "I use it for page transition animations, mouse-following parallax effects, and hover interactions. I combine useSpring and useTransform for physics-based, natural-feeling motion.",
        },
      },
      {
        name: "CSS Animations",
        description: {
          ko: "keyframe 애니메이션과 transition을 상황에 맞게 설계합니다. 다크/라이트 테마 전환 효과나 로딩 애니메이션 같은 곳에 적용했고, CSS만으로 해결 가능한 건 굳이 JS 라이브러리를 쓰지 않는 편입니다.",
          en: "I design keyframe animations and transitions to fit each situation. Applied them to dark/light theme transitions and loading animations. If CSS alone can handle it, I prefer not reaching for a JS library.",
        },
      },
      {
        name: "Lottie / Three.js",
        description: {
          ko: "Lottie로 디자이너가 만든 애니메이션을 웹에 적용해본 경험이 있습니다. Three.js는 아직 기초 단계지만, 3D 웹 표현에 관심이 있어서 계속 공부하고 있습니다.",
          en: "I've integrated designer-created Lottie animations into the web. Three.js is still at a beginner level for me, but I'm interested in 3D web experiences and keep studying it.",
        },
      },
    ],
  },
  {
    category: "Backend & Infra",
    description: {
      ko: "프론트엔드가 메인이지만, 필요하면 API 서버도 직접 만듭니다. 풀스택으로 혼자서 프로젝트 하나를 처음부터 끝까지 돌릴 수 있는 정도입니다.",
      en: "Frontend is my main focus, but I build API servers myself when needed. I can handle a full-stack project from start to finish on my own.",
    },
    skills: [
      {
        name: "Node.js / Express",
        description: {
          ko: "Express로 REST API 서버를 구축한 경험이 있습니다. 라우트 분리, 미들웨어 설계, JWT 기반 인증까지 직접 구현했고, 에러 핸들링 구조도 잡아봤습니다.",
          en: "I've built REST API servers with Express. Set up route separation, middleware design, JWT-based auth, and structured error handling myself.",
        },
      },
      {
        name: "PostgreSQL / MongoDB",
        description: {
          ko: "PostgreSQL로 관계형 DB 스키마를 설계하고 쿼리를 작성해봤고, MongoDB로는 비정형 데이터를 다뤄봤습니다. ORM은 Prisma를 주로 사용합니다.",
          en: "I've designed relational DB schemas and written queries with PostgreSQL, and worked with unstructured data in MongoDB. Prisma is my go-to ORM.",
        },
      },
      {
        name: "REST API / GraphQL",
        description: {
          ko: "RESTful API를 설계하고 구현하는 건 여러 번 해봤습니다. GraphQL은 클라이언트 사이드에서 Apollo Client로 데이터를 가져오는 방식으로 사용해봤습니다.",
          en: "I've designed and built RESTful APIs multiple times. On the GraphQL side, I've used Apollo Client to fetch data from the frontend.",
        },
      },
      {
        name: "Vercel / Docker",
        description: {
          ko: "이 포트폴리오를 Vercel에 배포해서 운영하고 있고, 환경 변수 관리나 도메인 설정도 직접 합니다. Docker는 개발 환경 세팅이나 간단한 컨테이너 구성에 활용해봤습니다.",
          en: "This portfolio is deployed and running on Vercel — I handle environment variables and domain config myself. I've used Docker for dev environment setup and simple container configurations.",
        },
      },
    ],
  },
  {
    category: "Design & Tools",
    description: {
      ko: "디자이너는 아니지만, 간단한 시안이나 프로토타입 정도는 직접 만들 수 있습니다. 기획부터 디자인, 개발까지 혼자 진행하는 걸 좋아합니다.",
      en: "I'm not a designer, but I can put together basic mockups and prototypes on my own. I enjoy handling planning, design, and development all by myself.",
    },
    skills: [
      {
        name: "Figma",
        description: {
          ko: "와이어프레임이나 프로토타입을 직접 만듭니다. 이 포트폴리오의 초기 시안도 Figma에서 잡았고, 컴포넌트 시스템이나 오토 레이아웃도 활용합니다.",
          en: "I create wireframes and prototypes myself. The initial mockup for this portfolio was done in Figma, and I use component systems and auto layout.",
        },
      },
      {
        name: "UI/UX Design",
        description: {
          ko: "사용자 흐름을 먼저 그려보고, 반응형 레이아웃을 직접 기획합니다. 디자인에서 끝나는 게 아니라 코드로 구현하는 것까지 이어지는 게 제 방식입니다.",
          en: "I sketch out user flows first and plan responsive layouts myself. My approach doesn't stop at design — I carry it through to code.",
        },
      },
      {
        name: "Webflow / No-Code",
        description: {
          ko: "코드 없이 빠르게 랜딩 페이지를 만들어야 할 때 Webflow를 활용합니다. 간단한 마케팅 페이지나 프로토타입용으로 써봤습니다.",
          en: "I use Webflow when I need to build a landing page quickly without code. Used it for simple marketing pages and prototyping.",
        },
      },
      {
        name: "Git / VS Code",
        description: {
          ko: "Git으로 브랜치 전략을 세우고 PR 기반 워크플로우를 사용합니다. VS Code에서는 단축키와 확장 기능을 적극 활용해서 작업 속도를 높이고 있습니다.",
          en: "I use Git with branching strategies and PR-based workflows. In VS Code, I actively use shortcuts and extensions to speed up my workflow.",
        },
      },
      {
        name: "QA / Review",
        description: {
          ko: "직접 사이트를 렌더링 검수하면서 레이아웃 깨짐, 애니메이션 이상, 반응형 미대응 같은 이슈를 잡아냅니다. 보안 검증(입력 검증, XSS, SQL Injection 방지)도 코드 레벨에서 직접 확인하고 개선합니다.",
          en: "I personally review rendered pages to catch layout breaks, animation glitches, and responsive issues. I also verify security measures (input validation, XSS/SQL injection prevention) at the code level.",
        },
      },
    ],
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
    title: "Research",
    description: {
      ko: "뭘 만들지, 어떤 구조가 맞을지 먼저 찾아봅니다.",
      en: "I look into what to build and what structure fits.",
    },
  },
  {
    number: "02",
    title: "Prototype",
    description: {
      ko: "간단한 시안이나 프로토타입을 먼저 잡아봅니다.",
      en: "I rough out a quick mockup or prototype first.",
    },
  },
  {
    number: "03",
    title: "Build",
    description: {
      ko: "코드 짜면서 안 되는 부분은 바로바로 수정합니다.",
      en: "I code it up and fix things as they come up.",
    },
  },
  {
    number: "04",
    title: "Improve",
    description: {
      ko: "완성 후에도 써보면서 불편한 부분을 계속 고칩니다.",
      en: "After it's done, I keep using it and fixing what feels off.",
    },
  },
];

export interface Certification {
  period: DatePeriod;
  name: LocalizedText;
  issuer: LocalizedText;
}

export interface Award {
  period: DatePeriod;
  name: LocalizedText;
  organization: LocalizedText;
}

export const certifications: Certification[] = [
  {
    period: { start: "2024", format: "year" },
    name: { ko: "정보처리기사", en: "Engineer Information Processing" },
    issuer: { ko: "한국산업인력공단", en: "HRD Korea" },
  },
  {
    period: { start: "2023", format: "year" },
    name: { ko: "SQLD", en: "SQLD" },
    issuer: { ko: "한국데이터산업진흥원", en: "Korea Data Agency" },
  },
  {
    period: { start: "2022", format: "year" },
    name: { ko: "TOEIC 850", en: "TOEIC 850" },
    issuer: { ko: "ETS", en: "ETS" },
  },
];

export const awards: Award[] = [
  {
    period: { start: "2024", format: "year" },
    name: { ko: "캡스톤 디자인 우수상", en: "Capstone Design Excellence Award" },
    organization: { ko: "학과", en: "Department" },
  },
  {
    period: { start: "2023", format: "year" },
    name: { ko: "교내 해커톤 장려상", en: "University Hackathon Encouragement Award" },
    organization: { ko: "학교", en: "University" },
  },
];

export const philosophy: Philosophy[] = [
  {
    title: "Just Build It",
    description: {
      ko: "고민만 하면 끝이 없어서, 일단 만들어보고 고칩니다.",
      en: "Overthinking gets nowhere, so I build first and fix as I go.",
    },
  },
  {
    title: "Readable Code",
    description: {
      ko: "나중에 다시 봤을 때 이해되는 코드를 쓰려고 합니다.",
      en: "I try to write code that makes sense when I come back to it.",
    },
  },
  {
    title: "Keep Learning",
    description: {
      ko: "모르는 건 당연하고, 찾아서 해결하는 게 실력이라고 생각합니다.",
      en: "Not knowing is normal. Figuring it out is what counts.",
    },
  },
];

/* ── MEET 패널(몽이) ──
   예전에는 번역 파일(bunny.*)에만 있어서 설정에서 손댈 수 없었다. 기본값을 여기로 옮기고
   설정에서 덮어쓸 수 있게 한다. */
export const bunnyProfile = {
  name: { ko: "몽이", en: "Mongi" },
  subtitle: { ko: "이 마을에 사는 작은 토끼", en: "A little rabbit who lives in this town" },
  stories: [
    {
      ko: "이 마을에 사는 꿈을 닮은 작은 토끼, 몽(夢)이를 소개할게요. 이름에는 밤에 꾸는 꿈도, 낮에 품는 꿈도 모두 담겨 있어요.",
      en: "Meet Mongi, a little rabbit shaped like a dream. The name holds both the dreams you have at night and the ones you chase by day.",
    },
    {
      ko: "사소한 것도 놓치지 않는 커다란 눈망울, 사람들의 목소리에 귀 기울이는 쫑긋한 귀가 자랑이랍니다.",
      en: "Big eyes that miss nothing, and perked-up ears that listen closely to what people say.",
    },
    {
      ko: "호기심이 많아 새로운 것에 쉽게 반응하지만, 살짝 겁이 많아서 갑자기 다가가면 깜짝 놀라요.",
      en: "Curious about anything new, but a little timid — approach too fast and it will jump.",
    },
  ],
};

/* ── Profile 패널의 정보 창 ──
   자리(x·y·너비)는 레이아웃이라 profileWindowConfig 에 남기고, 읽히는 값만 여기 둔다.
   key 는 창의 자리와 짝지어지는 식별자다. */
export const profileInfoBlocks = [
  {
    key: "c",
    lines: [
      { label: "School", value: "Seoul Women's University" },
      { label: "GPA", value: "3.9 / 4.5" },
      { label: "MBTI", value: "ISTP" },
      { label: "Likes", value: "Coffee, Clean Code, Music" },
      { label: "Dislikes", value: "Bugs, Slow Internet" },
      { label: "Hobby", value: "Coding, Gaming, Film" },
      { label: "Specialty", value: "Frontend, UI/UX" },
    ],
  },
  {
    key: "e1",
    lines: [
      { label: ">_", value: "console.log('Hello World')" },
      { label: "Mood", value: "if (coffee) code() : sleep()" },
      { label: "Bug", value: "99 little bugs in the code..." },
    ],
  },
  {
    key: "e2",
    lines: [
      { label: "Stack", value: "React + Next.js + TypeScript" },
      { label: "Editor", value: "VS Code + Vim Motions" },
      { label: "OS", value: "macOS" },
      { label: "Font", value: "JetBrains Mono" },
    ],
  },
  {
    key: "e3",
    lines: [
      { label: "Coffee", value: "2,847 cups and counting" },
      { label: "Commits", value: "git push --force (just kidding)" },
    ],
  },
  {
    key: "e4",
    lines: [
      { label: "Secret", value: "You found me!" },
      { label: "Motto", value: "Ship it, then fix it" },
    ],
  },
];

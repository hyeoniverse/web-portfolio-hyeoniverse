import type { LocalizedText } from "@/types/common";

export const SIZES = ["large", "small", "medium", "tall", "wide"] as const;

export interface TechPreset {
  name: string;
  group: string;
}

/** 기술 스택 프리셋 — 분야별 그룹. Select group 헤더로 노출 + 아이콘은 techIcons 로 매핑.
 *  직접 입력으로도 자유롭게 추가 가능. */
export const TECH_PRESETS: TechPreset[] = [
  // ── Frontend Framework
  { name: "React", group: "Frontend" },
  { name: "Next.js", group: "Frontend" },
  { name: "Vue", group: "Frontend" },
  { name: "Nuxt", group: "Frontend" },
  { name: "Svelte", group: "Frontend" },
  { name: "SvelteKit", group: "Frontend" },
  { name: "Astro", group: "Frontend" },
  { name: "Remix", group: "Frontend" },
  { name: "Angular", group: "Frontend" },
  { name: "Solid", group: "Frontend" },
  { name: "Qwik", group: "Frontend" },
  { name: "Alpine.js", group: "Frontend" },
  { name: "HTMX", group: "Frontend" },

  // ── Language
  { name: "TypeScript", group: "Language" },
  { name: "JavaScript", group: "Language" },
  { name: "Python", group: "Language" },
  { name: "Go", group: "Language" },
  { name: "Rust", group: "Language" },
  { name: "Java", group: "Language" },
  { name: "Kotlin", group: "Language" },
  { name: "Swift", group: "Language" },
  { name: "C++", group: "Language" },
  { name: "C#", group: "Language" },
  { name: "Ruby", group: "Language" },
  { name: "PHP", group: "Language" },
  { name: "Dart", group: "Language" },

  // ── Styling
  { name: "Tailwind CSS", group: "Styling" },
  { name: "CSS Modules", group: "Styling" },
  { name: "styled-components", group: "Styling" },
  { name: "Sass", group: "Styling" },
  { name: "Emotion", group: "Styling" },
  { name: "vanilla-extract", group: "Styling" },
  { name: "Panda CSS", group: "Styling" },
  { name: "UnoCSS", group: "Styling" },

  // ── UI Library
  { name: "shadcn/ui", group: "UI Library" },
  { name: "Radix UI", group: "UI Library" },
  { name: "Headless UI", group: "UI Library" },
  { name: "Chakra UI", group: "UI Library" },
  { name: "Material UI", group: "UI Library" },
  { name: "Ant Design", group: "UI Library" },
  { name: "Mantine", group: "UI Library" },

  // ── State Management
  { name: "Zustand", group: "State Management" },
  { name: "Redux", group: "State Management" },
  { name: "Redux Toolkit", group: "State Management" },
  { name: "Jotai", group: "State Management" },
  { name: "Recoil", group: "State Management" },
  { name: "Valtio", group: "State Management" },
  { name: "MobX", group: "State Management" },

  // ── Data Fetching
  { name: "React Query", group: "Data Fetching" },
  { name: "SWR", group: "Data Fetching" },
  { name: "tRPC", group: "Data Fetching" },
  { name: "GraphQL", group: "Data Fetching" },
  { name: "Apollo Client", group: "Data Fetching" },
  { name: "Axios", group: "Data Fetching" },

  // ── Animation / Visual / 3D
  { name: "Framer Motion", group: "Animation / Visual" },
  { name: "GSAP", group: "Animation / Visual" },
  { name: "Three.js", group: "Animation / Visual" },
  { name: "React Three Fiber", group: "Animation / Visual" },
  { name: "Lottie", group: "Animation / Visual" },
  { name: "D3.js", group: "Animation / Visual" },
  { name: "Lenis", group: "Animation / Visual" },
  { name: "WebGL", group: "Animation / Visual" },
  { name: "WebGPU", group: "Animation / Visual" },

  // ── Backend Runtime
  { name: "Node.js", group: "Backend" },
  { name: "Bun", group: "Backend" },
  { name: "Deno", group: "Backend" },
  { name: "Express", group: "Backend" },
  { name: "Fastify", group: "Backend" },
  { name: "NestJS", group: "Backend" },
  { name: "Hono", group: "Backend" },
  { name: "Django", group: "Backend" },
  { name: "FastAPI", group: "Backend" },
  { name: "Flask", group: "Backend" },
  { name: "Spring Boot", group: "Backend" },
  { name: "Ruby on Rails", group: "Backend" },
  { name: "Laravel", group: "Backend" },

  // ── Database
  { name: "PostgreSQL", group: "Database" },
  { name: "MySQL", group: "Database" },
  { name: "SQLite", group: "Database" },
  { name: "MongoDB", group: "Database" },
  { name: "Redis", group: "Database" },
  { name: "Elasticsearch", group: "Database" },
  { name: "DynamoDB", group: "Database" },

  // ── BaaS / ORM
  { name: "Supabase", group: "BaaS / ORM" },
  { name: "Firebase", group: "BaaS / ORM" },
  { name: "Appwrite", group: "BaaS / ORM" },
  { name: "PocketBase", group: "BaaS / ORM" },
  { name: "Prisma", group: "BaaS / ORM" },
  { name: "Drizzle", group: "BaaS / ORM" },
  { name: "TypeORM", group: "BaaS / ORM" },

  // ── AI / ML
  { name: "OpenAI API", group: "AI / ML" },
  { name: "Anthropic API", group: "AI / ML" },
  { name: "Gemini API", group: "AI / ML" },
  { name: "LangChain", group: "AI / ML" },
  { name: "LlamaIndex", group: "AI / ML" },
  { name: "Vercel AI SDK", group: "AI / ML" },
  { name: "TensorFlow", group: "AI / ML" },
  { name: "PyTorch", group: "AI / ML" },
  { name: "Hugging Face", group: "AI / ML" },

  // ── Mobile
  { name: "React Native", group: "Mobile" },
  { name: "Expo", group: "Mobile" },
  { name: "Flutter", group: "Mobile" },
  { name: "SwiftUI", group: "Mobile" },
  { name: "Jetpack Compose", group: "Mobile" },

  // ── Desktop
  { name: "Electron", group: "Desktop" },
  { name: "Tauri", group: "Desktop" },

  // ── Testing
  { name: "Jest", group: "Testing" },
  { name: "Vitest", group: "Testing" },
  { name: "Cypress", group: "Testing" },
  { name: "Playwright", group: "Testing" },
  { name: "Testing Library", group: "Testing" },
  { name: "MSW", group: "Testing" },
  { name: "Storybook", group: "Testing" },

  // ── Build / Tooling
  { name: "Vite", group: "Build / Tooling" },
  { name: "Webpack", group: "Build / Tooling" },
  { name: "Turbopack", group: "Build / Tooling" },
  { name: "esbuild", group: "Build / Tooling" },
  { name: "SWC", group: "Build / Tooling" },
  { name: "Rollup", group: "Build / Tooling" },
  { name: "Parcel", group: "Build / Tooling" },
  { name: "Nx", group: "Build / Tooling" },
  { name: "Turborepo", group: "Build / Tooling" },
  { name: "pnpm", group: "Build / Tooling" },
  { name: "Yarn", group: "Build / Tooling" },

  // ── Infra / Deploy
  { name: "Docker", group: "Infra / Deploy" },
  { name: "Kubernetes", group: "Infra / Deploy" },
  { name: "Vercel", group: "Infra / Deploy" },
  { name: "Netlify", group: "Infra / Deploy" },
  { name: "Cloudflare", group: "Infra / Deploy" },
  { name: "Cloudflare Workers", group: "Infra / Deploy" },
  { name: "AWS", group: "Infra / Deploy" },
  { name: "GCP", group: "Infra / Deploy" },
  { name: "Azure", group: "Infra / Deploy" },
  { name: "Fly.io", group: "Infra / Deploy" },
  { name: "Railway", group: "Infra / Deploy" },
  { name: "Render", group: "Infra / Deploy" },
  { name: "GitHub Actions", group: "Infra / Deploy" },
];

export interface WorkTemplate {
  id: string;
  label: LocalizedText;
  desc: LocalizedText;
  content: LocalizedText;
}

/* ──────────────────────────────────────────────────────────────────────────
 * STANDARD — Overview · Background · Role · Features · Architecture · 문제해결 · Results · Lessons
 * 가장 자세하고 풀 포맷. 큰 사이드/실무 프로젝트에 적합.
 * ────────────────────────────────────────────────────────────────────────── */
const STANDARD_KO = `## Overview

이 프로젝트는 ___를 위한 ___입니다. 주요 사용자는 ___이며, ___한 문제를 해결하기 위해 만들어졌습니다.

## Background

기존에는 ___한 방식으로 처리하고 있었으나, ___한 한계가 있었습니다. 이를 개선하기 위해 프로젝트를 시작하게 되었습니다.

## My Role

팀 내에서 ___를 담당했습니다. 주요 기여 영역은 다음과 같습니다:

-
-
-

## Key Features

- **___**: ___
- **___**: ___
- **___**: ___

## Architecture

전체 시스템은 ___로 구성되어 있습니다. 프론트엔드는 ___를 사용하고, 백엔드는 ___으로 구축했습니다. 데이터는 ___에 저장되며, ___를 통해 통신합니다.

## Challenges & Troubleshooting

### 문제 1: ___

**상황**: ___한 상황에서 ___가 발생했습니다.
**원인**: ___
**해결**: ___를 적용하여 해결했습니다.

### 문제 2: ___

**상황**: ___
**원인**: ___
**해결**: ___

## Results

- ___가 기존 대비 ___% 개선되었습니다.
- 사용자 ___가 ___만큼 증가했습니다.
- ___

## Lessons Learned

- ___할 때는 ___하는 것이 효과적이라는 것을 배웠습니다.
- 다음에는 ___를 더 일찍 고려할 것입니다.
- ___`;

const STANDARD_EN = `## Overview

This project is a ___ designed for ___. The primary users are ___, and it was built to solve ___.

## Background

Previously, ___ was handled by ___, but it had limitations such as ___. This project was initiated to address these issues.

## My Role

I was responsible for ___ within the team. Key contributions include:

-
-
-

## Key Features

- **___**: ___
- **___**: ___
- **___**: ___

## Architecture

The system is composed of ___. The frontend uses ___, the backend is built with ___, and data is stored in ___, communicating via ___.

## Challenges & Troubleshooting

### Issue 1: ___

**Context**: ___ occurred under ___ conditions.
**Root cause**: ___
**Resolution**: Applied ___ to resolve the issue.

### Issue 2: ___

**Context**: ___
**Root cause**: ___
**Resolution**: ___

## Results

- ___ improved by ___% compared to the previous approach.
- User ___ increased by ___.
- ___

## Lessons Learned

- Learned that ___ is effective when dealing with ___.
- Next time, I would consider ___ earlier in the process.
- ___`;

/* ──────────────────────────────────────────────────────────────────────────
 * MINIMAL — Overview · Features · Stack 만. 토이 프로젝트 / 클론 / 데모용.
 * ────────────────────────────────────────────────────────────────────────── */
const MINIMAL_KO = `## Overview

___를 만들었습니다. ___를 학습하기 위해 시작한 프로젝트입니다.

## Features

- ___
- ___
- ___

## Stack

- **Frontend**: ___
- **Backend**: ___
- **Infra**: ___

## Notes

___`;

const MINIMAL_EN = `## Overview

Built ___ as a learning exercise for ___.

## Features

- ___
- ___
- ___

## Stack

- **Frontend**: ___
- **Backend**: ___
- **Infra**: ___

## Notes

___`;

/* ──────────────────────────────────────────────────────────────────────────
 * CASE STUDY — Problem · Approach · Implementation · Outcome 의 narrative 형태.
 * 한 가지 문제를 깊이 다루는 작품에 적합.
 * ────────────────────────────────────────────────────────────────────────── */
const CASE_STUDY_KO = `## Problem

___한 상황에서 ___라는 문제가 있었습니다. 사용자 / 비즈니스 관점에서 이는 ___한 영향을 미쳤습니다.

## Approach

문제를 ___ / ___ / ___ 세 단계로 나누어 접근했습니다.

### 가설

___ 때문에 발생한다고 가정하고, ___를 통해 검증했습니다.

### 대안 비교

| 대안 | 장점 | 단점 |
|---|---|---|
| ___ | ___ | ___ |
| ___ | ___ | ___ |

최종적으로 ___를 선택한 이유는 ___입니다.

## Implementation

핵심 구현은 다음과 같습니다:

\`\`\`
// 예시 코드
\`\`\`

___한 점을 특히 신경 썼습니다.

## Outcome

- ___ 지표가 ___ → ___로 개선
- 사용자 피드백: ___
- 후속 작업: ___`;

const CASE_STUDY_EN = `## Problem

In a ___ context, there was an issue with ___. From a user / business perspective, this impacted ___.

## Approach

Broke the problem down into three phases: ___, ___, and ___.

### Hypothesis

Assumed it was caused by ___, and validated this through ___.

### Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| ___ | ___ | ___ |
| ___ | ___ | ___ |

Ultimately chose ___ because ___.

## Implementation

The core implementation:

\`\`\`
// example code
\`\`\`

Paid particular attention to ___.

## Outcome

- ___ metric improved from ___ to ___
- User feedback: ___
- Follow-up work: ___`;

/* ──────────────────────────────────────────────────────────────────────────
 * SHOWCASE — 시각적 작품 / 인터랙티브 / 게임 등. 컨셉 · 핵심 인터랙션 · 기술.
 * ────────────────────────────────────────────────────────────────────────── */
const SHOWCASE_KO = `## Concept

___를 표현하고 싶었습니다. 영감은 ___에서 받았습니다.

## Key Interactions

- **___**: ___
- **___**: ___

## Tech Highlights

- ___로 ___를 구현
- 성능 최적화: ___
- ___

## Demo

___ (영상 / GIF / 라이브 데모 링크)

## Behind the Scenes

___한 과정에서 ___가 어려웠습니다. ___로 해결했습니다.`;

const SHOWCASE_EN = `## Concept

Wanted to express ___. Inspired by ___.

## Key Interactions

- **___**: ___
- **___**: ___

## Tech Highlights

- Implemented ___ using ___
- Performance optimization: ___
- ___

## Demo

___ (video / GIF / live demo link)

## Behind the Scenes

The hardest part was ___ during ___. Solved with ___.`;

export const WORK_TEMPLATES: WorkTemplate[] = [
  {
    id: "standard",
    label: { ko: "표준", en: "Standard" },
    desc: { ko: "Overview · Role · Features · Architecture · 문제해결 · Results · Lessons — 풀 포맷", en: "Full format: Overview, Role, Features, Architecture, Troubleshooting, Results, Lessons" },
    content: { ko: STANDARD_KO, en: STANDARD_EN },
  },
  {
    id: "minimal",
    label: { ko: "간단", en: "Minimal" },
    desc: { ko: "Overview + Features + Stack 만. 토이 / 클론 / 데모용", en: "Just Overview, Features, Stack. For toy / clone / demo projects" },
    content: { ko: MINIMAL_KO, en: MINIMAL_EN },
  },
  {
    id: "case-study",
    label: { ko: "케이스 스터디", en: "Case Study" },
    desc: { ko: "Problem → Approach → Implementation → Outcome narrative", en: "Problem → Approach → Implementation → Outcome narrative" },
    content: { ko: CASE_STUDY_KO, en: CASE_STUDY_EN },
  },
  {
    id: "showcase",
    label: { ko: "쇼케이스", en: "Showcase" },
    desc: { ko: "시각적 작품 / 인터랙티브 / 게임 — 컨셉 + 인터랙션 + 기술", en: "Visual / interactive / game — concept + interactions + tech highlights" },
    content: { ko: SHOWCASE_KO, en: SHOWCASE_EN },
  },
];

/* legacy export — TEMPLATE_KO / TEMPLATE_EN 을 표준 템플릿으로 alias.
 * 다른 곳에서 import 하던 코드 호환용. */
export const TEMPLATE_KO = STANDARD_KO;
export const TEMPLATE_EN = STANDARD_EN;

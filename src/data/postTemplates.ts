import type { LocalizedText } from "@/types/common";

export interface PostTemplate {
  id: string;
  label: LocalizedText;
  desc: LocalizedText;
  content: LocalizedText;
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: "tutorial",
    label: { ko: "튜토리얼", en: "Tutorial" },
    desc: { ko: "단계별로 설명하는 가이드", en: "Step-by-step guide" },
    content: {
      ko: `## 개요

이 글에서는 React에서 커스텀 훅을 만드는 방법을 단계별로 알아보겠습니다.

> [!NOTE]
> 이 튜토리얼은 React 18 이상을 기준으로 작성되었습니다.

## 사전 준비

- Node.js 18 이상
- React 프로젝트 (CRA, Next.js 등)
- 기본적인 React Hooks 이해

## Step 1: 프로젝트 설정

프로젝트를 생성하고 필요한 의존성을 설치합니다.

\`\`\`bash
npx create-next-app@latest my-app
cd my-app
\`\`\`

## Step 2: 커스텀 훅 작성

\`src/hooks\` 디렉토리를 만들고 훅 파일을 생성합니다.

\`\`\`typescript
export function useCustomHook() {
  // 구현
}
\`\`\`

## Step 3: 컴포넌트에서 사용

작성한 훅을 컴포넌트에 적용합니다.

> [!TIP]
> 훅 이름은 항상 \`use\`로 시작해야 합니다.

## 결과

| 항목 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 코드 중복 | 많음 | 없음 |
| 재사용성 | 낮음 | 높음 |

## 마치며

커스텀 훅을 활용하면 로직을 깔끔하게 분리할 수 있습니다. 관련 문서는 [React 공식 문서](https://react.dev)를 참고하세요.`,
      en: `## Overview

In this post, we'll walk through how to create custom hooks in React, step by step.

> [!NOTE]
> This tutorial is based on React 18+.

## Prerequisites

- Node.js 18+
- A React project (CRA, Next.js, etc.)
- Basic understanding of React Hooks

## Step 1: Project Setup

Create a project and install dependencies.

\`\`\`bash
npx create-next-app@latest my-app
cd my-app
\`\`\`

## Step 2: Write the Custom Hook

Create a \`src/hooks\` directory and add the hook file.

\`\`\`typescript
export function useCustomHook() {
  // implementation
}
\`\`\`

## Step 3: Use in a Component

Apply the hook in your component.

> [!TIP]
> Hook names must always start with \`use\`.

## Result

| Metric | Before | After |
| --- | --- | --- |
| Code duplication | High | None |
| Reusability | Low | High |

## Wrap Up

Custom hooks let you cleanly separate logic. See the [React docs](https://react.dev) for more.`,
    },
  },
  {
    id: "troubleshooting",
    label: { ko: "트러블슈팅", en: "Troubleshooting" },
    desc: { ko: "문제 해결 과정 공유", en: "Problem-solving walkthrough" },
    content: {
      ko: `## 문제 상황

Next.js 15로 마이그레이션하던 중 빌드 시 \`Module not found\` 에러가 발생했습니다.

## 환경

- Next.js 15.5.3
- Node.js 22
- pnpm 9.x

## 증상

\`\`\`
Error: Module not found: Can't resolve '@/lib/utils'
\`\`\`

- 로컬 \`dev\` 서버에서는 정상 동작
- \`build\` 시에만 발생
- 특정 파일에서만 에러

## 원인 분석

> [!WARNING]
> \`tsconfig.json\`의 \`paths\` 설정과 \`next.config.js\`의 별칭이 충돌할 수 있습니다.

조사 결과, 대소문자가 다른 import 경로가 원인이었습니다.

## 해결 방법

1. import 경로의 대소문자를 통일
2. \`tsconfig.json\`에서 \`paths\` 재설정

\`\`\`json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
\`\`\`

## 결과

빌드 성공. CI/CD 파이프라인 정상 통과.

## TL;DR

- 대소문자 구분은 OS마다 다르므로 항상 일관되게 작성할 것
- CI 환경(Linux)에서 반드시 빌드 테스트할 것

> [!TIP]
> 비슷한 문제를 겪고 있다면 아래 체크리스트를 확인해보세요.

### 체크리스트

- [ ] import 경로 대소문자 확인
- [ ] \`tsconfig.json\` paths 설정 확인
- [ ] CI 환경에서 빌드 테스트
- [ ] 에디터 자동완성과 실제 경로 일치 확인`,
      en: `## Problem

During migration to Next.js 15, a \`Module not found\` error occurred at build time.

## Environment

- Next.js 15.5.3
- Node.js 22
- pnpm 9.x

## Symptoms

\`\`\`
Error: Module not found: Can't resolve '@/lib/utils'
\`\`\`

- Works fine in local \`dev\` server
- Only fails during \`build\`
- Only affects specific files

## Root Cause

> [!WARNING]
> \`tsconfig.json\` paths and \`next.config.js\` aliases can conflict.

Investigation revealed mismatched casing in import paths.

## Solution

1. Unified import path casing
2. Reconfigured \`tsconfig.json\` paths

\`\`\`json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
\`\`\`

## Result

Build successful. CI/CD pipeline passed.

## TL;DR

- Casing rules differ across OS — always be consistent
- Always test builds in CI environment (Linux)

> [!TIP]
> If you're facing a similar issue, check the list below.

### Checklist

- [ ] Verify import path casing
- [ ] Check \`tsconfig.json\` paths config
- [ ] Test build in CI environment
- [ ] Confirm editor autocomplete matches actual paths`,
    },
  },
  {
    id: "review",
    label: { ko: "회고/리뷰", en: "Review" },
    desc: { ko: "프로젝트 회고 또는 리뷰", en: "Project retrospective or review" },
    content: {
      ko: `## 소개

2개월간 진행한 포트폴리오 웹사이트 리뉴얼 프로젝트를 돌아봅니다.

## 목표

- 디자인 시스템 구축
- 성능 최적화 (Lighthouse 90+ 달성)
- 다국어 지원

## 기술 스택

| 분류 | 기술 |
| --- | --- |
| 프레임워크 | Next.js 15 |
| 스타일 | CSS Modules |
| DB | Supabase |
| 배포 | Vercel |

## 잘한 점

- **디자인 토큰 시스템**: 일관된 UI를 유지하는 데 큰 도움이 되었습니다
- **컴포넌트 재사용**: 공통 컴포넌트 분리로 개발 속도 향상

## 아쉬운 점

- **테스트 부족**: 유닛 테스트를 작성하지 못한 부분이 아쉽습니다
- **일정 초과**: 예상보다 2주 지연

> [!IMPORTANT]
> 다음 프로젝트에서는 초기 단계부터 테스트를 포함시킬 계획입니다.

## 배운 점

1. 초기 설계에 충분한 시간을 투자할 것
2. 작은 단위로 자주 배포할 것
3. 문서화를 습관적으로 할 것

## 앞으로

접근성(a11y) 개선과 PWA 지원을 다음 목표로 설정했습니다.

### 다음 프로젝트 체크리스트

- [ ] 초기 설계 문서 작성
- [ ] 테스트 코드 작성
- [ ] 주간 회고 진행
- [ ] 성능 모니터링 설정`,
      en: `## Introduction

A look back at the 2-month portfolio website renewal project.

## Goal

- Build a design system
- Performance optimization (Lighthouse 90+)
- Internationalization support

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 15 |
| Styling | CSS Modules |
| Database | Supabase |
| Deployment | Vercel |

## What Went Well

- **Design token system**: Helped maintain consistent UI
- **Component reuse**: Improved dev velocity through shared components

## What Could Be Better

- **Lack of tests**: Missed writing unit tests
- **Schedule overrun**: Delayed by 2 weeks

> [!IMPORTANT]
> Plan to include testing from the initial phase in the next project.

## Lessons Learned

1. Invest enough time in initial design
2. Deploy frequently in small increments
3. Make documentation a habit

## Next Steps

Accessibility (a11y) improvements and PWA support are set as next goals.

### Next Project Checklist

- [ ] Write design documents upfront
- [ ] Write test code
- [ ] Conduct weekly retrospectives
- [ ] Set up performance monitoring`,
    },
  },
  {
    id: "essay",
    label: { ko: "에세이", en: "Essay" },
    desc: { ko: "자유로운 형식의 글", en: "Free-form writing" },
    content: {
      ko: `최근 개발을 하면서 느낀 점을 정리해보려 합니다.

---

## 첫 번째 생각

좋은 코드란 무엇일까요? 단순히 동작하는 코드가 아니라, **읽기 쉽고 변경하기 쉬운 코드**가 좋은 코드라고 생각합니다.

> "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler

## 두 번째 생각

완벽을 추구하다 보면 아무것도 완성하지 못하는 경우가 많습니다. *완성된 것이 완벽한 것보다 낫다*는 말을 되새기게 됩니다.

## 세 번째 생각

혼자 고민하는 시간도 중요하지만, 때로는 동료에게 물어보는 것이 훨씬 빠른 해결책이 됩니다.

---

앞으로도 이런 생각들을 꾸준히 기록해두려 합니다.[^1]

![사진 설명](이미지 URL)

[^1]: 이 글은 개인적인 경험을 바탕으로 작성되었습니다.`,
      en: `Here are some reflections from my recent development experience.

---

## First Thought

What makes good code? I believe it's not just code that works, but **code that is easy to read and easy to change**.

> "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler

## Second Thought

Chasing perfection often means nothing gets finished. *Done is better than perfect* keeps coming back to mind.

## Third Thought

Time spent thinking alone is valuable, but sometimes asking a colleague is a much faster path to a solution.

---

I plan to keep recording thoughts like these going forward.[^1]

![Photo description](image URL)

[^1]: This post is based on personal experience.`,
    },
  },
  {
    id: "til",
    label: { ko: "TIL", en: "TIL" },
    desc: { ko: "오늘 배운 것", en: "Today I Learned" },
    content: {
      ko: `## 배운 것

CSS \`has()\` 선택자를 사용하면 자식 요소의 상태에 따라 부모 스타일을 변경할 수 있습니다.

## 예시

\`\`\`css
/* input에 focus가 있으면 부모 div에 border 색 변경 */
.wrapper:has(input:focus) {
  border-color: blue;
}
\`\`\`

## 핵심 정리

- \`has()\`는 **부모 선택자**처럼 동작
- 모든 모던 브라우저에서 지원 (2023~)
- 복잡한 JS 없이 상태 기반 스타일링 가능

> [!TIP]
> \`:has()\`는 성능 비용이 있으므로 남용하지 않는 것이 좋습니다.

## 참고 자료

- [MDN - :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [Can I Use](https://caniuse.com/css-has)

> [!CAUTION]
> IE에서는 지원되지 않습니다. 브라우저 호환성을 반드시 확인하세요.

## 복습 체크리스트

- [ ] \`:has()\` 문법 숙지
- [ ] 실제 프로젝트에 적용
- [ ] 성능 측정 비교`,
      en: `## What I Learned

CSS \`has()\` selector allows styling a parent element based on the state of its children.

## Example

\`\`\`css
/* Change parent div border when input is focused */
.wrapper:has(input:focus) {
  border-color: blue;
}
\`\`\`

## Key Points

- \`has()\` works like a **parent selector**
- Supported in all modern browsers (2023+)
- Enables state-based styling without complex JS

> [!TIP]
> \`:has()\` has performance costs, so avoid overusing it.

## References

- [MDN - :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [Can I Use](https://caniuse.com/css-has)

> [!CAUTION]
> Not supported in IE. Always check browser compatibility.

## Review Checklist

- [ ] Understand \`:has()\` syntax
- [ ] Apply in a real project
- [ ] Compare performance measurements`,
    },
  },
];

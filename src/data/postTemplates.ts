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

React 19의 폼 액션으로 서버 뮤테이션을 처리하는 방법을 단계별로 정리합니다. \`useState\` + \`onSubmit\` + 수동 로딩 관리 없이, \`<form action>\` 하나로 제출·검증·대기 상태를 다룹니다.

> [!NOTE]
> React 19 · Next.js 15 App Router 기준입니다.

## 사전 준비

- Node.js 20+
- Next.js 15 (App Router)
- React 19

## Step 1: 서버 액션 정의

\`"use server"\`로 서버에서만 실행되는 함수를 만듭니다.

\`\`\`typescript
// app/actions.ts
"use server";

export async function subscribe(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  if (!email.includes("@")) return { ok: false, message: "이메일을 확인해 주세요." };
  await db.subscriber.create({ data: { email } });
  return { ok: true, message: "구독 완료!" };
}
\`\`\`

## Step 2: 폼에 연결

\`useActionState\`로 액션과 결과 상태를 묶습니다.

\`\`\`tsx
"use client";
import { useActionState } from "react";
import { subscribe } from "./actions";

export function SubscribeForm() {
  const [state, action] = useActionState(subscribe, null);
  return (
    <form action={action}>
      <input name="email" type="email" required />
      <SubmitButton />
      {state?.message && <p>{state.message}</p>}
    </form>
  );
}
\`\`\`

## Step 3: 대기 상태 표시

\`useFormStatus\`로 제출 중 버튼을 비활성화합니다.

\`\`\`tsx
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "처리 중…" : "구독"}</button>;
}
\`\`\`

> [!TIP]
> \`useFormStatus\`는 반드시 \`<form>\` **안쪽 컴포넌트**에서 호출해야 동작합니다.

## 결과

| 항목 | 이전 방식 | 폼 액션 |
| --- | --- | --- |
| 로딩 상태 | 수동 \`useState\` | \`useFormStatus\` 자동 |
| 검증 결과 | 별도 상태 | 액션 반환값 |
| JS 비활성 | 동작 안 함 | 점진적 향상 |

## 마치며

폼 액션은 클라이언트 상태를 줄이고 로직을 서버로 모읍니다. 자세한 내용은 [React 문서](https://react.dev/reference/react/useActionState)를 참고하세요.`,
      en: `## Overview

A step-by-step guide to handling server mutations with React 19 form actions. No \`useState\` + \`onSubmit\` + manual loading flags — one \`<form action>\` covers submit, validation, and pending state.

> [!NOTE]
> Based on React 19 and the Next.js 15 App Router.

## Prerequisites

- Node.js 20+
- Next.js 15 (App Router)
- React 19

## Step 1: Define the Server Action

Create a function that runs only on the server with \`"use server"\`.

\`\`\`typescript
// app/actions.ts
"use server";

export async function subscribe(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  if (!email.includes("@")) return { ok: false, message: "Check your email." };
  await db.subscriber.create({ data: { email } });
  return { ok: true, message: "Subscribed!" };
}
\`\`\`

## Step 2: Wire Up the Form

Bind the action and its result state with \`useActionState\`.

\`\`\`tsx
"use client";
import { useActionState } from "react";
import { subscribe } from "./actions";

export function SubscribeForm() {
  const [state, action] = useActionState(subscribe, null);
  return (
    <form action={action}>
      <input name="email" type="email" required />
      <SubmitButton />
      {state?.message && <p>{state.message}</p>}
    </form>
  );
}
\`\`\`

## Step 3: Show Pending State

Disable the button while submitting with \`useFormStatus\`.

\`\`\`tsx
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Submitting…" : "Subscribe"}</button>;
}
\`\`\`

> [!TIP]
> \`useFormStatus\` only works when called from a component **inside** the \`<form>\`.

## Result

| Aspect | Old way | Form action |
| --- | --- | --- |
| Loading state | Manual \`useState\` | \`useFormStatus\` |
| Validation result | Separate state | Action return value |
| No-JS | Doesn't work | Progressive enhancement |

## Wrap Up

Form actions cut client state and pull logic to the server. See the [React docs](https://react.dev/reference/react/useActionState) for more.`,
    },
  },
  {
    id: "troubleshooting",
    label: { ko: "트러블슈팅", en: "Troubleshooting" },
    desc: { ko: "문제 해결 과정 공유", en: "Problem-solving walkthrough" },
    content: {
      ko: `## 문제 상황

Next.js 15 App Router에서 배포 후 콘솔에 \`Hydration failed\` 경고가 뜨고, 첫 렌더가 깜빡였습니다.

## 환경

- Next.js 15.1
- React 19
- 배포: Vercel

## 증상

\`\`\`
Hydration failed because the server rendered HTML didn't match the client.
\`\`\`

- 로컬에서는 재현이 어렵고 배포 환경에서만 발생
- 새로고침마다 경고 위치가 조금씩 달라짐

## 시도한 것들

- \`next build && next start\`로 프로덕션 빌드를 로컬 재현 → 재현됨
- 의심 컴포넌트를 \`dynamic(() => ..., { ssr: false })\`로 격리 → 경고 사라짐(임시)

## 원인 분석

> [!WARNING]
> 서버와 클라이언트에서 값이 달라지는 코드는 hydration을 깨뜨립니다. \`new Date()\`, \`Math.random()\`, \`localStorage\`, \`window\` 접근이 대표적입니다.

문제 컴포넌트가 렌더 도중 \`new Date().toLocaleString()\`으로 시각을 그려, 서버 HTML과 클라이언트 첫 렌더가 어긋났습니다.

## 해결 방법

시간에 의존하는 렌더를 \`useEffect\`로 미뤄 클라이언트에서만 그립니다.

\`\`\`tsx
const [now, setNow] = useState<string | null>(null);
useEffect(() => setNow(new Date().toLocaleString()), []);
return <time>{now ?? "—"}</time>;
\`\`\`

## 결과

경고 제거, 첫 렌더 깜빡임 해소.

## TL;DR

- SSR 렌더 함수는 **순수**해야 한다 — 매 렌더 달라지는 값 금지
- 클라이언트 전용 값은 \`useEffect\`로 미루거나 \`suppressHydrationWarning\`

### 체크리스트

- [ ] 렌더 중 \`Date\`/\`random\`/\`window\`/\`localStorage\` 접근 여부
- [ ] 프로덕션 빌드로 로컬 재현
- [ ] 클라이언트 전용 로직을 effect로 이동`,
      en: `## Problem

After deploying on the Next.js 15 App Router, the console showed a \`Hydration failed\` warning and the first render flickered.

## Environment

- Next.js 15.1
- React 19
- Deploy: Vercel

## Symptoms

\`\`\`
Hydration failed because the server rendered HTML didn't match the client.
\`\`\`

- Hard to reproduce locally, only on the deployed environment
- The warning location shifts slightly on each refresh

## What I Tried

- Reproduced with a local production build (\`next build && next start\`) → reproduced
- Isolated the suspect component with \`dynamic(() => ..., { ssr: false })\` → warning gone (temporary)

## Root Cause

> [!WARNING]
> Code that differs between server and client breaks hydration. Common culprits: \`new Date()\`, \`Math.random()\`, \`localStorage\`, and \`window\` access.

The component rendered the time with \`new Date().toLocaleString()\` during render, so the server HTML and the client's first render didn't match.

## Solution

Defer time-dependent rendering to \`useEffect\` so it runs only on the client.

\`\`\`tsx
const [now, setNow] = useState<string | null>(null);
useEffect(() => setNow(new Date().toLocaleString()), []);
return <time>{now ?? "—"}</time>;
\`\`\`

## Result

Warning gone, first-render flicker resolved.

## TL;DR

- SSR render functions must be **pure** — no values that change every render
- Defer client-only values to \`useEffect\`, or use \`suppressHydrationWarning\`

### Checklist

- [ ] Any \`Date\`/\`random\`/\`window\`/\`localStorage\` access during render?
- [ ] Reproduce with a production build locally
- [ ] Move client-only logic into an effect`,
    },
  },
  {
    id: "review",
    label: { ko: "회고/리뷰", en: "Review" },
    desc: { ko: "프로젝트 회고 또는 리뷰", en: "Project retrospective or review" },
    content: {
      ko: `## 소개

2개월간 진행한 포트폴리오 리뉴얼 프로젝트를 돌아봅니다.

## 목표

- 디자인 시스템 + 토큰 구축
- Core Web Vitals 전 지표 "좋음" 달성
- 다국어(i18n) 지원

## 기술 스택

| 분류 | 기술 |
| --- | --- |
| 프레임워크 | Next.js 15 (App Router) |
| UI | React 19 · CSS Modules |
| DB | Supabase (Postgres) |
| 배포 | Vercel |

## 지표

| 지표 | 개선 전 | 개선 후 |
| --- | --- | --- |
| LCP | 3.4s | 1.2s |
| INP | 320ms | 90ms |
| CLS | 0.21 | 0.02 |

> [!NOTE]
> 2024년부터 FID가 INP로 대체됐습니다. 상호작용 지연은 이제 INP로 측정합니다.

## 잘한 점

- **서버 컴포넌트 우선**: 클라이언트 JS를 줄여 INP가 크게 개선됨
- **디자인 토큰**: 색·간격을 토큰화해 다크모드까지 일관 유지

## 아쉬운 점

- **테스트 부족**: 핵심 플로우에 E2E를 붙이지 못함
- **일정 초과**: 예상보다 2주 지연

> [!IMPORTANT]
> 다음 프로젝트는 첫 주에 Playwright E2E 골격부터 세운다.

## 배운 점

1. 측정 없이 최적화하지 말 것 — 먼저 Lighthouse·Web Vitals로 병목 확인
2. 작은 단위로 자주 배포할 것
3. 문서화를 습관으로

## 앞으로

접근성(a11y) 감사와 뷰 트랜지션 도입을 다음 목표로 잡았습니다.

### 다음 체크리스트

- [ ] 첫 주 E2E 골격
- [ ] a11y 자동 감사(axe) 연결
- [ ] Web Vitals 실측 모니터링`,
      en: `## Introduction

A look back at a 2-month portfolio renewal project.

## Goal

- Build a design system with tokens
- Reach "Good" across all Core Web Vitals
- Internationalization (i18n)

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| UI | React 19 · CSS Modules |
| Database | Supabase (Postgres) |
| Deployment | Vercel |

## Metrics

| Metric | Before | After |
| --- | --- | --- |
| LCP | 3.4s | 1.2s |
| INP | 320ms | 90ms |
| CLS | 0.21 | 0.02 |

> [!NOTE]
> Since 2024, INP has replaced FID. Interaction latency is now measured with INP.

## What Went Well

- **Server Components first**: less client JS greatly improved INP
- **Design tokens**: tokenized color and spacing stayed consistent, even in dark mode

## What Could Be Better

- **Lack of tests**: couldn't add E2E to core flows
- **Schedule overrun**: delayed by 2 weeks

> [!IMPORTANT]
> Next project: scaffold Playwright E2E in the first week.

## Lessons Learned

1. Don't optimize without measuring — find bottlenecks with Lighthouse/Web Vitals first
2. Deploy frequently in small increments
3. Make documentation a habit

## Next Steps

An accessibility (a11y) audit and adopting View Transitions are the next goals.

### Next Checklist

- [ ] E2E scaffold in week one
- [ ] Wire up an automated a11y audit (axe)
- [ ] Real-user Web Vitals monitoring`,
    },
  },
  {
    id: "essay",
    label: { ko: "에세이", en: "Essay" },
    desc: { ko: "자유로운 형식의 글", en: "Free-form writing" },
    content: {
      ko: `개발을 하며 최근 다시 곱씹게 된 생각들을 적어둡니다.

---

## 좋은 코드란

여전히 **읽기 쉽고 바꾸기 쉬운 코드**라고 생각합니다. 도구가 아무리 좋아져도, 기준은 6개월 뒤의 내가 이해할 수 있느냐입니다.

> "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler

## AI와 함께 쓰는 코드

생성 도구가 초안을 빠르게 뽑아주는 시대에, 개발자의 몫은 *무엇을 남기고 무엇을 지울지 판단하는* 쪽으로 옮겨가는 듯합니다. 코드를 읽고 걸러내는 눈이 그 어느 때보다 중요해졌습니다.

## 완성에 대하여

완벽을 좇다 아무것도 끝내지 못하는 경우가 많습니다. *완성된 것이 완벽한 것보다 낫다*는 말을 다시 새깁니다.

---

이런 기록을 앞으로도 꾸준히 남기려 합니다.[^1]

[^1]: 개인적인 경험을 바탕으로 작성한 글입니다.`,
      en: `Some thoughts I've been chewing on again lately while coding.

---

## What Good Code Is

Still **code that's easy to read and easy to change**. However good the tooling gets, the bar is whether the me of six months from now can understand it.

> "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler

## Writing Code Alongside AI

In an era where generators draft quickly, the developer's job seems to be shifting toward *deciding what to keep and what to cut*. The eye that reads and filters code matters more than ever.

## On Finishing

Chasing perfection often means nothing gets done. *Done is better than perfect* — worth remembering again.

---

I plan to keep recording notes like these.[^1]

[^1]: This post is based on personal experience.`,
    },
  },
  {
    id: "til",
    label: { ko: "TIL", en: "TIL" },
    desc: { ko: "오늘 배운 것", en: "Today I Learned" },
    content: {
      ko: `## 배운 것

CSS 컨테이너 쿼리(\`@container\`)를 쓰면 뷰포트가 아니라 **부모 요소의 폭**에 맞춰 스타일을 바꿀 수 있습니다. 같은 카드 컴포넌트를 사이드바에서도, 본문에서도 자연스럽게 재사용할 수 있습니다.

## 예시

\`\`\`css
.card-list {
  container-type: inline-size;
}

/* 컨테이너가 400px 이상일 때만 가로 배치 */
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 96px 1fr;
  }
}
\`\`\`

## 핵심 정리

- 미디어 쿼리는 **뷰포트**, 컨테이너 쿼리는 **부모 폭** 기준
- 컴포넌트가 놓인 위치에 따라 자동 대응 → 진짜 재사용 가능한 컴포넌트
- 모든 주요 브라우저에서 지원 (2023~)

> [!TIP]
> \`cqi\`(container query inline-size) 단위를 쓰면 컨테이너 폭에 비례하는 크기도 지정할 수 있습니다.

## 참고 자료

- [MDN — Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [Can I Use](https://caniuse.com/css-container-queries)

## 복습 체크리스트

- [ ] \`container-type\` / \`container-name\` 이해
- [ ] 실제 카드 컴포넌트에 적용
- [ ] \`cqi\`/\`cqw\` 단위 실험`,
      en: `## What I Learned

CSS container queries (\`@container\`) let you style based on a **parent element's width** instead of the viewport. Perfect for reusing the same card component in both a sidebar and the main content.

## Example

\`\`\`css
.card-list {
  container-type: inline-size;
}

/* Only lay out horizontally when the container is 400px+ */
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 96px 1fr;
  }
}
\`\`\`

## Key Points

- Media queries target the **viewport**; container queries target the **parent width**
- Components adapt to where they're placed → truly reusable components
- Supported in all major browsers (2023+)

> [!TIP]
> Use \`cqi\` (container query inline-size) units to size things relative to the container width.

## References

- [MDN — Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [Can I Use](https://caniuse.com/css-container-queries)

## Review Checklist

- [ ] Understand \`container-type\` / \`container-name\`
- [ ] Apply to a real card component
- [ ] Experiment with \`cqi\`/\`cqw\` units`,
    },
  },
];

/**
 * Series 더미 포스트 콘텐츠 채우기
 *
 * 사용법:
 *   npx tsx scripts/seed-series-posts.ts
 *
 * 실행 전 .env.local 에 필요:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 동작: 아래 정의한 slug 의 posts.row 에 content / content_en / excerpt / excerpt_en 을 UPDATE.
 *       이미 위 SQL 로 row 가 만들어져 있어야 함.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface PostUpdate {
  slug: string;
  excerpt: string;
  excerpt_en: string;
  content: string;
  content_en: string;
}

const posts: PostUpdate[] = [
  /* ── React Rendering Internals ── */
  {
    slug: "rri-1",
    excerpt: "컴포넌트가 처음 렌더되는 순간을 추적하며 React 의 mount 흐름을 정리합니다.",
    excerpt_en: "Tracing the first render to map out React's mount flow.",
    content: `# 렌더 사이클의 시작

React 가 화면에 무언가 그리기 시작하는 그 첫 순간을, 우리가 코드로 따라갈 수 있을까요. 이 글은 \`createRoot\` 호출부터 첫 \`commitRoot\` 까지의 흐름을 짚어봅니다.

## createRoot 가 만드는 것

\`createRoot(container)\` 는 단순히 DOM 노드를 받는 게 아니라, **FiberRoot** 와 함께 React 가 내부적으로 사용할 스케줄러 핸들을 함께 만듭니다. 여기서 만들어진 root 가 이후 모든 업데이트의 진입점이 됩니다.

\`\`\`tsx
const root = createRoot(document.getElementById("app"));
root.render(<App />);
\`\`\`

겉으로 보이는 건 두 줄이지만, 그 안에서는 work-in-progress tree 가 준비되고, scheduler 가 시간 단위 작업을 잘게 쪼갤 준비를 마칩니다.

## 첫 render 의 흐름

1. 호출 시점에 update 가 큐에 들어가고
2. scheduler 가 가장 빠른 priority 로 work loop 시작
3. begin work → reconcile children → complete work 순서로 트리를 내려가며
4. 모두 마치면 single transaction 으로 DOM 에 commit

이 과정의 핵심은 "그릴 준비" 와 "그리기" 가 분리되어 있다는 점이에요. 덕분에 React 는 도중에 더 급한 일이 들어오면 미뤄둘 수 있습니다.

## 다음 글에서

다음 글에선 reconciliation 의 실제 비교 알고리즘과, key prop 이 진짜로 어떤 의미를 갖는지 코드 레벨에서 들여다봅니다.
`,
    content_en: `# Where the Render Cycle Begins

Can we follow the very first moment React draws something on screen, in code? This post traces the path from \`createRoot\` to the first \`commitRoot\`.

## What createRoot creates

\`createRoot(container)\` does more than accept a DOM node — it creates a **FiberRoot** alongside an internal scheduler handle. That root becomes the entry point for every future update.

\`\`\`tsx
const root = createRoot(document.getElementById("app"));
root.render(<App />);
\`\`\`

Two visible lines on the surface, but underneath, a work-in-progress tree is prepared and the scheduler is ready to slice work into time-sized chunks.

## The flow of the first render

1. The call enqueues an update
2. The scheduler kicks off a work loop at the highest priority
3. Begin work → reconcile children → complete work, walking the tree
4. Once finished, commit to the DOM in a single transaction

The key idea: "preparing to draw" and "drawing" are separated. That's why React can pause and yield to something more urgent mid-flight.

## Up next

Next post we'll dive into reconciliation's diff algorithm and what the \`key\` prop *actually* signals at the code level.
`,
  },
  {
    slug: "rri-2",
    excerpt: "키와 트리 비교가 실제로 어떻게 동작하는지, reconciliation 코드 흐름을 따라갑니다.",
    excerpt_en: "How keys and tree diffing actually work — walking through reconciliation.",
    content: `# Reconciliation 한 단계씩

React 의 \`reconcileChildren\` 은 이름은 거창하지만, 핵심은 "이전 트리와 새 트리를 빠르게 비교하는 법" 입니다.

## 같은 자리에 같은 타입이 있을 때

가장 흔한 케이스. 같은 위치에 같은 타입의 컴포넌트면 React 는 reuse — 즉 fiber 노드를 새로 만들지 않고 props 만 교체합니다. 그래서 state 가 보존되죠.

## key 가 진짜 결정하는 것

배열을 그릴 때 key 는 단순한 React 의 lint 안내가 아니라, **fiber 매칭의 식별자** 입니다.

\`\`\`tsx
{items.map((item) => <Card key={item.id} {...item} />)}
\`\`\`

같은 key 가 다음 렌더에 다른 위치에 있으면, React 는 그 fiber 를 그 위치로 옮기고 state 를 가져갑니다. key 를 index 로 주면 이 매칭이 어긋나면서 의도치 않은 state 이전이 일어나요.

## 다른 타입이 만났을 때

같은 자리에 다른 타입이 오면 React 는 이전 서브트리를 unmount, 새 서브트리를 mount 합니다. 이펙트가 정리되고, state 도 사라져요. 가끔 "왜 갑자기 상태가 리셋되지?" 의 답이 여기 있습니다.

## 끝맺으며

reconciliation 의 룰은 단순하지만, 그 단순함이 매끄러운 UI 의 토대예요. 다음 글은 이 비교 작업을 시간 단위로 잘게 쪼개는 Fiber 의 work loop 를 봅니다.
`,
    content_en: `# Reconciliation, Step by Step

\`reconcileChildren\` sounds grand, but at its core it's "fast comparison between the old tree and the new tree."

## Same slot, same type

The common case. Same position, same component type → React reuses the fiber, swapping props rather than creating a new node. That's why state survives.

## What \`key\` really decides

When rendering an array, \`key\` isn't just a React lint hint — it's the **identifier for fiber matching**.

\`\`\`tsx
{items.map((item) => <Card key={item.id} {...item} />)}
\`\`\`

If the same key appears at a different position next render, React moves that fiber to the new spot, carrying state with it. Use index as key, and that matching breaks — leading to surprise state transfers.

## When types differ

Different types in the same slot → React unmounts the old subtree and mounts the new one. Effects clean up. State disappears. "Why did my state suddenly reset?" — often the answer is here.

## Closing

The rules of reconciliation are simple, and that simplicity is the foundation of smooth UI. Next, the Fiber work loop that slices this comparison into time-sized chunks.
`,
  },
  {
    slug: "rri-3",
    excerpt: "Fiber 의 work loop 가 시간을 어떻게 다루는지, scheduler 의 마음가짐을 살펴봅니다.",
    excerpt_en: "How the Fiber work loop handles time — a peek into the scheduler's mindset.",
    content: `# Fiber 의 work loop

Concurrent React 의 매력은 "중간에 멈출 수 있다는 것" 입니다. 이게 가능하게 만든 게 Fiber 의 work loop 예요.

## 5ms 가 기준

브라우저에서 한 frame 의 여유 시간은 대략 16ms. 하지만 그 안에서도 다른 일이 끼어들 수 있으니, React 는 보통 5ms 마다 한 번씩 \`shouldYield\` 를 검사합니다. yield 해야 한다면 다음 fiber 작업은 micro/macro task 로 미뤄둡니다.

## render phase 와 commit phase

| phase | 특징 |
|-------|------|
| render | interruptible, side effect 없음, 여러 번 일어날 수 있음 |
| commit | uninterruptible, DOM 변경 + effect 호출 |

이 분리 덕분에 우선순위가 높은 update 가 들어오면 진행 중이던 render 를 버리고 새로 시작할 수 있어요.

## priority 의 실체

\`startTransition\` 이 마법처럼 보이지만, 결국 update 에 priority lane 을 부여하는 일입니다. lane 이 낮은(=덜 급한) update 는 input event 같은 빠른 update 에 자리를 내줍니다.

## 시리즈를 마치며

세 글에 걸쳐 React 가 무엇을, 어떻게, 언제 그리는지 보았습니다. 다음 시리즈에선 이 모델 위에서 동작하는 Server Components 의 mental model 을 다시 세워봅시다.
`,
    content_en: `# Fiber Work Loop

The charm of Concurrent React is "you can pause." The thing that makes that possible is the Fiber work loop.

## The 5ms heartbeat

A browser frame budget is roughly 16ms. But things can interrupt, so React checks \`shouldYield\` about every 5ms. If yielding is needed, the next fiber unit is deferred into a micro/macro task.

## Render phase vs commit phase

| phase | character |
|-------|------|
| render | interruptible, no side effects, can run multiple times |
| commit | uninterruptible, applies DOM changes and runs effects |

This split is why a high-priority update can throw away an in-flight render and restart.

## What "priority" really is

\`startTransition\` looks magical, but it's just tagging an update with a priority lane. Lower-priority lanes step aside for urgent updates like input events.

## Wrapping the series

Across three posts we've seen *what*, *how*, and *when* React draws. Next series, we'll rebuild a mental model for Server Components on top of this foundation.
`,
  },

  /* ── Next.js App Router Deep Dive ── */
  {
    slug: "nar-1",
    excerpt: "Server Components 가 왜 등장했는지부터 차근차근 짚어봅니다.",
    excerpt_en: "Starting from why Server Components exist in the first place.",
    content: `# Server Components 입문

Server Components 가 어렵다면, 보통 "왜 등장했나" 에 대한 답이 흐려져 있을 때입니다. 이 글은 그 출발점을 다시 잡습니다.

## 풀려고 한 문제

기존 SSR 은 결국 "한 번 그려서 hydration" 모델이라, JS bundle 에 모든 컴포넌트가 들어가야 했습니다. RSC 는 **서버에서만 살고 끝나는 컴포넌트** 를 인정합니다. JS 가 brower 까지 갈 필요가 없죠.

## "use client" 의 진짜 의미

\`"use client"\` 는 "이 컴포넌트는 hydration 이 필요한 영역의 시작점" 이라는 마크예요. 그 위쪽은 모두 server component 일 수 있고, 아래쪽은 모두 client component 가 됩니다.

## 첫 RSC 컴포넌트

\`\`\`tsx
// app/posts/page.tsx — server component
export default async function PostsPage() {
  const posts = await db.posts.findMany();
  return <PostList posts={posts} />;
}
\`\`\`

\`async\` 가 자연스럽게 쓰일 수 있고, DB 에 직접 접근할 수도 있어요. 이 자유로움이 RSC 의 진짜 매력입니다.

## 다음에

다음 글에선 RSC 가 만들어내는 streaming response 가 LCP 에 어떻게 영향을 주는지 보겠습니다.
`,
    content_en: `# Intro to Server Components

If Server Components feel hard, it's usually because the "why" has gone fuzzy. This post resets that starting point.

## The problem they aim to solve

Classic SSR is essentially "render once, then hydrate" — every component had to ship in the JS bundle. RSC introduces **components that live only on the server**. There's no need to ship their JS to the browser.

## What \`"use client"\` really means

\`"use client"\` marks "the boundary where hydration starts." Everything above can be a server component; everything below becomes a client component.

## A first RSC

\`\`\`tsx
// app/posts/page.tsx — server component
export default async function PostsPage() {
  const posts = await db.posts.findMany();
  return <PostList posts={posts} />;
}
\`\`\`

\`async\` is natural, and direct DB access is possible. That freedom is the real charm.

## Next up

Next post: how the streaming response RSC produces affects LCP.
`,
  },
  {
    slug: "nar-2",
    excerpt: "Suspense 경계와 데이터 페칭의 균형으로 LCP 를 낮추는 실전 노트.",
    excerpt_en: "Practical notes on lowering LCP by balancing Suspense boundaries with fetching.",
    content: `# Streaming 으로 LCP 개선

App Router 의 streaming 은 단순히 빠르게 보여주는 게 아니라, **무엇을 먼저 보여줄지** 고를 수 있게 해줍니다.

## Suspense 경계 잡는 법

\`<Suspense fallback={...}>\` 의 위치가 곧 streaming 의 경계입니다. LCP 후보가 되는 hero 영역을 Suspense 바깥으로 빼고, 나머지를 안으로 넣으면 hero 가 가장 먼저 그려집니다.

## 병렬 fetching 은 자연스럽게

\`Promise.all\` 을 쓰지 않아도, 각 컴포넌트가 자기 fetch 를 하면 React 가 알아서 병렬화합니다. 단, 같은 데이터를 여러 곳에서 fetch 하면 \`React.cache\` 로 묶어줘야 중복 호출이 안 일어납니다.

## 흔한 실수

가장 흔한 실수: 모든 데이터를 page.tsx 에서 한꺼번에 await. 이러면 streaming 의 장점이 사라집니다. **컴포넌트 안으로 fetch 를 내려보내는 것** 이 RSC 답게 사는 길이에요.

## 측정하기

devtools 의 Network → Document → response 를 streaming chunk 단위로 보면, 무엇이 언제 흘러나오는지 직관적으로 보입니다.
`,
    content_en: `# Improving LCP with Streaming

App Router's streaming isn't just "show it fast" — it lets you choose **what to show first**.

## Where to put Suspense boundaries

The position of \`<Suspense fallback={...}>\` is the streaming boundary. Pull the hero area (your LCP candidate) outside the boundary, push the rest inside, and the hero paints first.

## Parallel fetching, naturally

You don't need \`Promise.all\` — if each component does its own fetch, React parallelizes them. Just wrap shared fetches in \`React.cache\` to avoid duplicate calls.

## A common mistake

The most common mistake: \`await\`-ing all data inside \`page.tsx\`. That kills streaming's advantage. **Push fetching down into the components** — that's the RSC way.

## Measuring

In devtools → Network → Document → response, look at streaming chunks. You can see exactly what flushes when.
`,
  },
  {
    slug: "nar-3",
    excerpt: "Parallel routes 와 intercepting routes 로 모달과 라우팅을 동시에 잡는 패턴.",
    excerpt_en: "Patterns that solve modal + routing at once with parallel and intercepting routes.",
    content: `# Parallel & Intercepting Routes

App Router 의 진짜 강력함은 routing 자체에 UI 슬롯이 있다는 점입니다.

## Parallel routes 의 정체

\`@modal\`, \`@sidebar\` 같은 폴더가 layout 안에서 props 로 들어옵니다. 같은 URL 에서 여러 슬롯이 동시에 그려지죠.

\`\`\`
app/
  layout.tsx     // children, modal 두 슬롯 받음
  page.tsx
  @modal/
    default.tsx  // 비어있을 때
    photo/[id]/page.tsx
\`\`\`

## Intercepting routes — "이전 page 위에 띄우기"

\`(.)\` 같은 표기로 같은 segment 의 라우트를 가로챌 수 있어요. URL 은 \`/photo/123\` 으로 바뀌지만 화면은 모달로 뜨는 인스타그램 같은 패턴이 가능합니다.

## 새로고침 했을 때

Intercepting 은 navigation 으로 들어왔을 때만 동작하므로, 새로고침 시엔 일반 \`/photo/123\` 페이지로 떨어집니다. 같은 콘텐츠를 모달과 페이지 양쪽에서 자연스럽게 다룰 수 있어요.

## 이 시리즈를 마치며

App Router 는 단순히 "더 빠른 SSR" 이 아니라 routing 모델 자체가 다릅니다. 이걸 받아들이는 순간, mental model 이 새로 세워져요.
`,
    content_en: `# Parallel & Intercepting Routes

The real power of App Router is that routing itself has UI slots.

## What parallel routes are

Folders like \`@modal\`, \`@sidebar\` come into the layout as props. Multiple slots render simultaneously at the same URL.

\`\`\`
app/
  layout.tsx     // receives children + modal slots
  page.tsx
  @modal/
    default.tsx  // when empty
    photo/[id]/page.tsx
\`\`\`

## Intercepting routes — "open over the previous page"

\`(.)\` notation lets you intercept routes in the same segment. The URL becomes \`/photo/123\` but the screen shows a modal — the Instagram pattern.

## On refresh

Intercepting only fires through navigation. Refresh falls through to the regular \`/photo/123\` page. The same content works naturally as both modal and page.

## Closing the series

App Router isn't just "faster SSR" — the routing model itself is different. The moment you accept that, the mental model gets rebuilt.
`,
  },

  /* ── Advanced TypeScript Patterns ── */
  {
    slug: "atp-1",
    excerpt: "Conditional Type 으로 분기를 만드는 첫 걸음, 그리고 추론이 어디까지 따라오는지.",
    excerpt_en: "First steps into conditional types and how far inference can follow.",
    content: `# Conditional Type 의 진가

\`T extends U ? X : Y\` 한 줄이지만, 여기서부터 TypeScript 의 모든 "스마트한" 타입이 시작됩니다.

## 분배의 마법

Union 위의 conditional type 은 자동으로 **distributive** 입니다. \`T\` 가 \`A | B\` 면, 결과는 \`(A extends U ? X : Y) | (B extends U ? X : Y)\` 가 돼요.

\`\`\`ts
type NonNull<T> = T extends null | undefined ? never : T;
type R = NonNull<string | null>; // string
\`\`\`

## infer 로 끌어내기

조건 안의 타입을 변수처럼 추출할 수 있는 게 \`infer\` 입니다. 함수의 return 타입을 꺼내는 \`ReturnType\` 이 대표적이에요.

\`\`\`ts
type ReturnOf<T> = T extends (...args: any) => infer R ? R : never;
\`\`\`

## 패턴 매칭처럼

infer 와 conditional 을 묶으면 사실상 패턴 매칭이 됩니다. 튜플의 첫 원소, 마지막 원소, 길이 — 모두 표현 가능해요.

## 다음에

다음 글에선 mapped type 으로 키를 변형하고 새 타입을 만드는 법을 봅니다.
`,
    content_en: `# The Power of Conditional Types

\`T extends U ? X : Y\` — one line, and it's the seed of every "smart" TypeScript type.

## The distribution trick

A conditional type over a union is automatically **distributive**. If \`T\` is \`A | B\`, the result becomes \`(A extends U ? X : Y) | (B extends U ? X : Y)\`.

\`\`\`ts
type NonNull<T> = T extends null | undefined ? never : T;
type R = NonNull<string | null>; // string
\`\`\`

## Pulling out with \`infer\`

\`infer\` lets you bind a type inside the condition like a variable. The classic use: extracting a function's return type.

\`\`\`ts
type ReturnOf<T> = T extends (...args: any) => infer R ? R : never;
\`\`\`

## Pattern matching, basically

Pair \`infer\` with conditionals and you have pattern matching. First element of a tuple, last element, length — all expressible.

## Next

Next post: mapped types — reshaping keys to build new types.
`,
  },
  {
    slug: "atp-2",
    excerpt: "키를 변형해 새 타입을 만드는 mapped type 의 실전 사용을 정리합니다.",
    excerpt_en: "Practical mapped types — reshaping keys to derive new types.",
    content: `# Mapped Types 응용

Mapped type 은 "기존 타입의 키마다 한 번씩 돌면서 새로 정의" 하는 도구입니다.

## 기본 형태

\`\`\`ts
type Readonly<T> = { readonly [K in keyof T]: T[K] };
\`\`\`

\`as\` 절로 키 자체도 변형할 수 있어요.

\`\`\`ts
type PrefixKeys<T, P extends string> = {
  [K in keyof T as \`\${P}\${K & string}\`]: T[K]
};
\`\`\`

## key remapping 의 활용

unwanted key 만 거를 때도 같은 패턴.

\`\`\`ts
type RemoveKey<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
};
\`\`\`

\`as never\` 로 키를 지우는 게 핵심입니다.

## modifier 와 함께

\`-readonly\`, \`-?\` 같은 modifier 로 readonly 와 optional 을 강제로 끌 수 있어요. 흔히 보는 \`Required<T>\`, \`Mutable<T>\` 같은 유틸이 이렇게 만들어집니다.

## 다음에

다음 글: template literal type 으로 문자열만 가지고 정확한 타입을 추론하는 법.
`,
    content_en: `# Mapped Types in Practice

Mapped types are the tool to "loop over a type's keys and redefine each."

## Basic form

\`\`\`ts
type Readonly<T> = { readonly [K in keyof T]: T[K] };
\`\`\`

The \`as\` clause lets you reshape keys themselves.

\`\`\`ts
type PrefixKeys<T, P extends string> = {
  [K in keyof T as \`\${P}\${K & string}\`]: T[K]
};
\`\`\`

## Key remapping in action

Filtering out unwanted keys uses the same pattern.

\`\`\`ts
type RemoveKey<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
};
\`\`\`

The trick is \`as never\` to drop a key entirely.

## With modifiers

Modifiers like \`-readonly\` and \`-?\` let you forcibly remove readonly and optional. The familiar \`Required<T>\` and \`Mutable<T>\` utilities are built this way.

## Next

Next post: template literal types — inferring precise types from strings alone.
`,
  },
  {
    slug: "atp-3",
    excerpt: "문자열 패턴만으로 타입 추론을 만들어내는 template literal type 의 마법.",
    excerpt_en: "Inferring precise types from strings alone with template literal types.",
    content: `# Template Literal 마법

문자열은 그저 string 이 아니에요. TypeScript 4.1 부터, 문자열 자체가 **타입 표현식** 이 됩니다.

## 첫 만남

\`\`\`ts
type Greet<N extends string> = \`hello, \${N}\`;
type R = Greet<"jenny">; // "hello, jenny"
\`\`\`

별 거 없어 보이지만, 여기서부터 모든 게 시작됩니다.

## 문자열 split

infer 와 결합하면 문자열을 쪼갤 수도 있어요.

\`\`\`ts
type Split<S extends string, D extends string> =
  S extends \`\${infer A}\${D}\${infer B}\`
    ? [A, ...Split<B, D>]
    : [S];

type R = Split<"a,b,c", ",">; // ["a", "b", "c"]
\`\`\`

## 라우트 타입 만들기

이걸 응용하면 \`/users/:id/posts/:postId\` 같은 라우트 문자열에서 params 타입을 자동으로 만들 수 있습니다. 라이브러리 수준의 정밀한 추론이 가능해지는 지점이죠.

## 시리즈를 닫으며

세 가지 도구 — conditional, mapped, template literal — 의 조합이 TypeScript 의 풍부한 추론을 만듭니다. 처음엔 가독성이 어렵지만, 한 번 손에 익으면 이전으로 돌아갈 수 없어요.
`,
    content_en: `# Template Literal Type Magic

Strings aren't merely \`string\`. Since TypeScript 4.1, the string itself is a **type expression**.

## First encounter

\`\`\`ts
type Greet<N extends string> = \`hello, \${N}\`;
type R = Greet<"jenny">; // "hello, jenny"
\`\`\`

Looks small, but it's the starting line.

## Splitting strings

Pair with \`infer\` and you can split strings.

\`\`\`ts
type Split<S extends string, D extends string> =
  S extends \`\${infer A}\${D}\${infer B}\`
    ? [A, ...Split<B, D>]
    : [S];

type R = Split<"a,b,c", ",">; // ["a", "b", "c"]
\`\`\`

## Route param types

Apply this to a route string like \`/users/:id/posts/:postId\` and you can auto-derive the params type. This is where library-grade inference becomes possible.

## Closing the series

The combination of three tools — conditional, mapped, template literal — gives TypeScript its rich inference. Hard to read at first, but once it clicks, there's no going back.
`,
  },

  /* ── CSS Motion Design ── */
  {
    slug: "cmd-1",
    excerpt: "한 줄의 곡선이 모션의 인격을 어떻게 결정하는지, easing 의 디자인을 살펴봅니다.",
    excerpt_en: "How a single curve sets the personality of motion — designing easing.",
    content: `# Easing 의 디자인

같은 거리, 같은 시간을 움직이더라도 곡선이 바뀌면 완전히 다른 느낌이 됩니다.

## linear 가 어색한 이유

물리적으로 우리가 만지는 모든 것은 가속·감속을 합니다. linear 는 그래서 비현실적이에요. 사용자에게 "여긴 컴퓨터예요" 라고 외치는 것과 같습니다.

## 자주 쓰는 곡선 4가지

- \`ease-out\` — 입장 (요소가 들어올 때)
- \`ease-in\` — 퇴장 (요소가 나갈 때)
- \`ease-in-out\` — 강조 (모달 같이 양쪽 다 부드럽게)
- spring — 자연스러운 반동

## cubic-bezier(0.22, 1, 0.36, 1)

ease-out 의 더 강한 버전. 처음엔 빠르게 출발하고 마지막에 부드럽게 settle. UI 에서 가장 만족스러운 모션을 만드는 곡선 중 하나예요.

## 다음에

다음 글에선 페이지 사이 morph 를 다루는 view-transitions 를 봅니다.
`,
    content_en: `# Designing with Easing

The same distance and the same duration become a completely different feeling once the curve changes.

## Why linear feels off

Everything we touch physically accelerates and decelerates. So linear feels unreal — it screams "this is a computer" to the user.

## Four go-to curves

- \`ease-out\` — for entries
- \`ease-in\` — for exits
- \`ease-in-out\` — for emphasis (like modals, smooth on both sides)
- spring — natural rebound

## cubic-bezier(0.22, 1, 0.36, 1)

A stronger ease-out. Fast departure, gentle settle at the end. One of the most satisfying motion curves in UI.

## Next

Next post: view-transitions for page-to-page morphs.
`,
  },
  {
    slug: "cmd-2",
    excerpt: "View Transitions API 로 페이지 사이의 부드러운 morph 를 만드는 방법.",
    excerpt_en: "Building smooth page-to-page morphs with the View Transitions API.",
    content: `# View Transitions 첫 만남

지금까지 페이지 전환은 "갑자기 바뀌는" 일이었어요. View Transitions 는 이걸 부드럽게 묶어줍니다.

## 가장 기본 형태

\`\`\`ts
document.startViewTransition(() => {
  // DOM 변경
});
\`\`\`

이 한 줄로 변경 전후의 snapshot 이 만들어지고, 자동으로 cross-fade 가 일어납니다.

## view-transition-name 으로 쌍 잡기

같은 \`view-transition-name\` 을 가진 요소는 페이지 양쪽에서 같은 정체성으로 인식돼서 morph 됩니다. 썸네일 → 상세 페이지의 hero 이미지가 자연스럽게 자라나는 게 이 패턴.

## 적용 시 주의

- 너무 많은 요소에 name 을 주면 카오스
- transform 기반이라 layout reflow 와 충돌하면 어색함
- Safari 는 아직 지원 한정적

## 다음에

다음 글: 시간 자체를 스크롤로 다루는 scroll-driven animation.
`,
    content_en: `# Meeting View Transitions

Page navigation has always been a "sudden change." View Transitions binds it together smoothly.

## The simplest form

\`\`\`ts
document.startViewTransition(() => {
  // DOM change
});
\`\`\`

That single line snapshots before and after, and a cross-fade happens automatically.

## Pair with \`view-transition-name\`

Elements sharing the same \`view-transition-name\` are recognized as the same identity across pages and morph between them. The hero-image-grows-from-thumbnail pattern is exactly this.

## Things to watch

- Too many named elements → chaos
- It's transform-based, so it clashes with layout reflow
- Safari support is still limited

## Next

Next: scroll-driven animation — controlling time itself with scroll.
`,
  },
  {
    slug: "cmd-3",
    excerpt: "스크롤로 시간을 다루는 새로운 모델, scroll-driven animation 의 가능성.",
    excerpt_en: "Scroll-driven animation — a new model where scroll controls time.",
    content: `# Scroll-driven Animation

GSAP ScrollTrigger 같은 라이브러리가 해오던 일을, 이제 CSS 가 직접 합니다.

## animation-timeline

\`\`\`css
@keyframes grow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

.bar {
  animation: grow linear;
  animation-timeline: scroll();
}
\`\`\`

\`scroll()\` 이 timeline 자체를 스크롤로 잡아줘요. 시간 대신 스크롤 progress 가 keyframe 을 움직입니다.

## view() 로 요소 단위 제어

특정 요소가 viewport 에 들어오는 정도를 timeline 으로 쓸 수도 있어요.

\`\`\`css
.fade-in { animation-timeline: view(); }
\`\`\`

## 가능성과 한계

지금 가능한 건: progress bar, parallax, reveal-on-scroll. 한계는 브라우저 지원 — Chromium 만 어느 정도. fallback 은 \`@supports\` 로.

## 시리즈를 마치며

세 글로 모션의 곡선, 페이지 morph, 스크롤 timeline 까지 둘러봤어요. 좋은 모션은 결국 "보이지 않을 정도로 자연스러운" 모션이라고 생각해요.
`,
    content_en: `# Scroll-driven Animation

What libraries like GSAP ScrollTrigger have been doing — CSS now does directly.

## animation-timeline

\`\`\`css
@keyframes grow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

.bar {
  animation: grow linear;
  animation-timeline: scroll();
}
\`\`\`

\`scroll()\` ties the timeline to scroll. Instead of time, scroll progress drives the keyframes.

## Per-element control with view()

You can use how much an element is in the viewport as the timeline.

\`\`\`css
.fade-in { animation-timeline: view(); }
\`\`\`

## Possibilities and limits

What's possible today: progress bars, parallax, reveal-on-scroll. The limit is browser support — Chromium-mostly. Use \`@supports\` for fallbacks.

## Closing the series

Across three posts we covered curves, page morphs, and scroll timelines. Good motion, in the end, is motion natural enough to be invisible.
`,
  },

  /* ── Building a Design System ── */
  {
    slug: "bds-1",
    excerpt: "Raw → Semantic → Context 로 토큰을 3 layer 로 나누는 이유와 효과.",
    excerpt_en: "Why three layers — Raw, Semantic, Context — for tokens, and what it gains.",
    content: `# 토큰 3-layer 의 의미

토큰은 단순히 \`#fff\` 를 \`--color-white\` 로 바꾸는 게 아닙니다. 의미를 갖는 단계를 만드는 일이에요.

## 1. Raw — 색 자체

\`--color-blue-500: #3b82f6\` 처럼 의미가 없는 원시 값. 디자인 시스템의 가장 아래.

## 2. Semantic — 의미 부여

\`--color-accent: var(--color-blue-500)\` 처럼 "이건 강조 색" 같은 의도를 입혀요. 다크 / 라이트 모드 전환은 보통 이 layer 에서 일어납니다.

## 3. Context — 컴포넌트별 변수

\`--_color-button-bg: var(--color-accent)\` 같은 컴포넌트 안에서만 쓰는 짧은 변수. 컴포넌트가 자기 영역의 의미만 신경쓰면 되도록 해줘요.

## 왜 이렇게까지

브랜드 색이 바뀌어도 raw 만 바꾸면 끝. 다크 모드 추가? semantic 만 새로 매핑. 컴포넌트 동작 바꾸기? context 만 손대면 됩니다. 변경 영향 범위가 명확해져요.

## 다음에

다음 글에선 다크 모드를 어떻게 토큰 위에 자연스럽게 얹는지 봅니다.
`,
    content_en: `# Why 3-Layer Tokens Matter

Tokens aren't just renaming \`#fff\` to \`--color-white\`. They're about creating layers that carry meaning.

## 1. Raw — the color itself

\`--color-blue-500: #3b82f6\` — meaningless primitive. The bottom layer.

## 2. Semantic — intent

\`--color-accent: var(--color-blue-500)\` — "this is the accent." Dark/light mode swaps usually happen at this layer.

## 3. Context — component-local

\`--_color-button-bg: var(--color-accent)\` — short variables used only inside a component. Components only worry about their own semantic surface.

## Why bother

Brand color changes? Edit raw only. Adding dark mode? Just remap semantic. Tweaking component behavior? Context layer. The blast radius of every change is clear.

## Next

Next: how dark mode lays naturally on top of the tokens.
`,
  },
  {
    slug: "bds-2",
    excerpt: "두 테마를 하나의 시스템으로 통일하는 dark mode 토큰 전략.",
    excerpt_en: "A token strategy that unifies two themes into one system.",
    content: `# 다크 모드를 토큰으로

다크 모드는 색을 두 벌 만드는 일이 아니라, **semantic 한 vocabulary 를 한 벌만 유지** 하는 일입니다.

## semantic 만 바꾼다

\`\`\`css
:root {
  --color-bg: var(--color-white);
  --color-text: var(--color-neutral-900);
}
[data-theme="dark"] {
  --color-bg: var(--color-neutral-900);
  --color-text: var(--color-white);
}
\`\`\`

컴포넌트는 \`var(--color-bg)\` 만 알면 돼요. 모드는 신경쓰지 않습니다.

## 트릭: color-mix 활용

hover 시의 살짝 다른 톤이 필요하다면, raw 한 색을 새로 정의하지 말고 \`color-mix\` 로 만들어요.

\`\`\`css
.btn:hover {
  background: color-mix(in srgb, var(--color-bg) 92%, var(--color-text));
}
\`\`\`

테마를 알아서 따라옵니다.

## 흔한 함정

이미지 위에 텍스트 올리는 케이스 — 다크/라이트 양쪽에서 가독성을 보장하려면 overlay 가 필수. 토큰만으로 안 풀려요.

## 다음에

다음 글: 컴포넌트 variant 를 일관성 있게 정의하는 정책.
`,
    content_en: `# Dark Mode via Tokens

Dark mode isn't about creating two color sets — it's about **keeping one semantic vocabulary**.

## Swap only the semantic layer

\`\`\`css
:root {
  --color-bg: var(--color-white);
  --color-text: var(--color-neutral-900);
}
[data-theme="dark"] {
  --color-bg: var(--color-neutral-900);
  --color-text: var(--color-white);
}
\`\`\`

Components only know \`var(--color-bg)\`. Mode is invisible to them.

## Trick: lean on color-mix

When you need a slightly different tone for hover, don't define a new raw color — use \`color-mix\`.

\`\`\`css
.btn:hover {
  background: color-mix(in srgb, var(--color-bg) 92%, var(--color-text));
}
\`\`\`

It follows the theme automatically.

## Common pitfall

Text over images — to guarantee legibility in both themes, you need an overlay. Tokens alone won't solve it.

## Next

Next post: a consistent policy for component variants.
`,
  },
  {
    slug: "bds-3",
    excerpt: "의도가 분명한 component variant 정책으로 시스템 응집력 유지하기.",
    excerpt_en: "Keeping a system coherent with clear, intent-driven variant policies.",
    content: `# 컴포넌트 변형 관리

variant 가 늘어나면 시스템은 빠르게 무너집니다. \`primary\`, \`accent\`, \`brand\`, \`highlight\` 같은 비슷한 이름이 공존하기 시작하면 위험 신호.

## 의도 vs 외형

variant 이름은 **외형** 이 아니라 **의도** 로 짓는 게 정답.

- 외형: \`blue\`, \`large\`, \`rounded\` ✗
- 의도: \`primary\`, \`destructive\`, \`subtle\` ✓

브랜드 색이 빨강으로 바뀌어도 \`primary\` 는 그대로지만, \`blue\` 는 의미가 깨져요.

## variant 폭발 막기

variant 가 5개를 넘기 시작하면 둘 중 하나입니다.

1. 정말 다 필요한가 — 보통은 아니에요. 디자이너와 다시 합의.
2. 다른 컴포넌트로 분리할 시점인가 — \`Button\` 과 \`IconButton\` 을 나누는 식으로.

## 조합 가능성 정의

size × variant × state 의 모든 조합이 의미 있는 건 아니에요. \`large\` + \`destructive\` 가 정말 필요한 케이스가 있나? 명확한 합의가 없다면 정의하지 마세요.

## 시리즈를 닫으며

토큰 → 컴포넌트의 흐름으로 디자인 시스템의 뼈대를 그려봤어요. 좋은 시스템은 만든 사람조차 자주 잊을 만큼 자연스러운 시스템이에요.
`,
    content_en: `# Managing Component Variants

Variants explode quickly and the system collapses. When \`primary\`, \`accent\`, \`brand\`, \`highlight\` all coexist, that's a warning sign.

## Intent vs appearance

Name variants by **intent**, not **appearance**.

- Appearance: \`blue\`, \`large\`, \`rounded\` ✗
- Intent: \`primary\`, \`destructive\`, \`subtle\` ✓

If the brand color shifts to red, \`primary\` still works, but \`blue\` breaks meaning.

## Stopping variant explosion

Once variants pass five, one of two things is true.

1. You don't actually need them all — usually. Re-align with design.
2. Time to split into a different component — \`Button\` and \`IconButton\`, for instance.

## Define which combinations make sense

Not every \`size × variant × state\` combo is meaningful. Does \`large + destructive\` actually have a use case? Without explicit agreement, don't define it.

## Closing the series

Tokens → components — we sketched a design system's skeleton. A great system is so natural that even its makers forget about it.
`,
  },

  /* ── Web Performance Notes ── */
  {
    slug: "wpn-1",
    excerpt: "LCP 의 진짜 원인을 폰트, 이미지, hydration 순서로 짚어보는 실전 노트.",
    excerpt_en: "Tracking the real LCP culprit — fonts, images, hydration, in order.",
    content: `# LCP 진짜 원인 찾기

LCP 가 안 좋다고 항상 이미지가 문제는 아니에요. 보통 세 가지 후보를 순서대로 의심해야 합니다.

## 1. 폰트가 LCP 를 잡고 있나

웹폰트가 늦게 로드되면 텍스트가 LCP 후보일 때 LCP 가 그대로 늦어져요. \`font-display: swap\` 과 self-hosted preload 가 기본입니다.

\`\`\`html
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
\`\`\`

## 2. 이미지의 priority 와 sizes

LCP 후보 이미지는 반드시 \`priority\` (Next.js) 또는 \`fetchpriority="high"\` 를 줘야 합니다. \`sizes\` 도 정확히 — 그래야 srcset 에서 적정 크기가 선택돼요.

## 3. hydration 의 paint blocking

큰 client component 가 hydration 되면서 main thread 를 점유하면, 그동안 paint 가 밀려요. RSC 로 가능한 것은 server 에 두기.

## 측정 흐름

\`performance.getEntriesByType("largest-contentful-paint")\` → element / load time / size 가 다 나옵니다. 무엇이 LCP 인지 명확히 본 다음에 고치는 게 순서.

## 다음에

다음 글: INP 측정 워크플로우.
`,
    content_en: `# Finding the Real LCP Culprit

A bad LCP isn't always an image problem. Suspect three candidates in order.

## 1. Are fonts holding LCP back?

If web fonts load late and the LCP candidate is text, LCP slips. \`font-display: swap\` plus a self-hosted preload is the baseline.

\`\`\`html
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
\`\`\`

## 2. Image priority and sizes

The LCP image must get \`priority\` (Next.js) or \`fetchpriority="high"\`. Set \`sizes\` accurately — that's how the right srcset gets picked.

## 3. Hydration as paint blocker

Large client components hydrating can hog the main thread, pushing paint back. Move what can be moved into RSC.

## Measurement workflow

\`performance.getEntriesByType("largest-contentful-paint")\` returns element / load time / size. See clearly what LCP is, then fix.

## Next

Next post: a workflow for INP.
`,
  },
  {
    slug: "wpn-2",
    excerpt: "사용자가 실제로 느끼는 input delay 를 측정하고 줄이는 흐름 정리.",
    excerpt_en: "Measuring and reducing the input delay users actually feel.",
    content: `# INP 측정 흐름 잡기

INP 는 "사용자가 클릭한 뒤, 화면이 응답하기까지의 시간" 을 잡는 metric. LCP 처럼 한 시점이 아니라 모든 인터랙션의 통계예요.

## 첫 단계 — 어디가 느린가

\`web-vitals\` 라이브러리로 page 단위 INP 를 받고, attribution data 까지 뽑으면 어떤 element 가 원인인지 보입니다.

\`\`\`ts
import { onINP } from "web-vitals/attribution";
onINP((m) => sendBeacon(m));
\`\`\`

## 흔한 원인 3가지

1. **무거운 event handler** — 큰 작업을 \`requestIdleCallback\` 으로 미루기
2. **state update 가 너무 많은 컴포넌트 다시 그리게 함** — \`startTransition\` 으로 priority 분리
3. **third-party script 가 main thread 점유** — defer 또는 web worker

## 실측의 중요성

local 에선 잘 보이지 않는 게 INP 예요. 진짜 사용자 환경 (느린 device, 안정적이지 않은 네트워크) 에서 측정해야 정확한 그림이 나옵니다.

## 시리즈를 마치며

Core Web Vitals 는 결국 사용자 경험을 숫자로 만든 것. 숫자에 매몰되기보다 "이걸 사용자는 어떻게 느낄까" 를 항상 같이 가져가는 게 좋아요.
`,
    content_en: `# A Workflow for INP

INP measures "from click to the screen responding." Unlike LCP it's a *distribution* across every interaction.

## Step 1 — locate the slowness

Use \`web-vitals\` for page-level INP, and pull attribution data to see which element causes it.

\`\`\`ts
import { onINP } from "web-vitals/attribution";
onINP((m) => sendBeacon(m));
\`\`\`

## Three common causes

1. **Heavy event handlers** — defer big work into \`requestIdleCallback\`
2. **State updates that retrigger huge re-renders** — split priority with \`startTransition\`
3. **Third-party scripts hogging the main thread** — defer or move to a web worker

## Real-world measurement matters

INP isn't visible locally. Measure on real user environments — slower devices, unstable networks — to see the true picture.

## Closing the series

Core Web Vitals turn UX into numbers. Don't chase the numbers — always pair them with "how does this *feel*?"
`,
  },

  /* ── Interaction Design Studies (draft 시리즈) ── */
  {
    slug: "ids-1",
    excerpt: "좋아하는 미세 인터랙션을 분해하고 직접 만들어보며 배우는 케이스 스터디.",
    excerpt_en: "A case study: breaking apart and recreating micro-interactions you love.",
    content: `# 미세 인터랙션 분해

좋은 인터랙션은 작아요. 그래서 무시되기 쉽지만, 그 작은 디테일이 제품의 완성도를 결정합니다.

## 분해의 첫 단계

화면 녹화 → 60fps 로 다시 보기. 한 프레임씩 보면서 "어떤 속성이 어떻게 변했는가" 를 적어요.

## 보통 다루는 속성

- transform (translate, scale, rotate)
- opacity
- background / color
- box-shadow
- border-radius

대부분의 인터랙션은 이 정도의 조합입니다.

## 다음에

다음 글에선 피드백의 무게 — 시각, 청각, 햅틱의 균형을 봅니다.
`,
    content_en: `# Deconstructing Micro-interactions

Good interactions are small. Easy to overlook — yet that small detail determines product polish.

## First step: deconstruct

Record the screen → replay at 60fps. Go frame by frame, noting "which property changed how."

## Common properties

- transform (translate, scale, rotate)
- opacity
- background / color
- box-shadow
- border-radius

Most interactions are some combination of those.

## Next

Next: the weight of feedback — balancing visual, auditory, and haptic cues.
`,
  },
  {
    slug: "ids-2",
    excerpt: "진동, 색, 모션이 사용자에게 전하는 피드백의 무게를 균형 있게 만들기.",
    excerpt_en: "Balancing the weight of feedback — haptics, color, and motion.",
    content: `# 피드백의 무게

action 에 대한 반응은 너무 작아도 안 보이고, 너무 크면 거슬립니다. 균형이 핵심.

## 무게의 단계

| 무게 | 예 |
|-----|-----|
| 매우 가벼움 | hover 시의 미세한 색 변화 |
| 가벼움 | toggle on/off, button press |
| 보통 | submit 성공, 새 알림 도착 |
| 무거움 | error, irreversible action 확인 |

같은 action 에 무게가 일관되어야 해요. \`save\` 가 가끔은 toast 로, 가끔은 모달로 응답하면 사용자는 혼란스러워집니다.

## 모달리티의 조합

- 시각만 → 빠르지만 잊기 쉬움
- 시각 + 청각 → 명확하지만 시끄러움
- 시각 + 햅틱 → 모바일에서 자연스러움

상황에 맞는 조합이 중요해요. desktop 에선 햅틱이 없으니 시각+미묘한 사운드, mobile 에선 햅틱+시각.

## 시리즈를 마치며

이 시리즈는 아직 draft 예요. 더 많은 케이스를 모은 뒤 정식 발행할 예정.
`,
    content_en: `# The Weight of Feedback

A reaction can be too small to notice, or too big to ignore. Balance is everything.

## Levels of weight

| weight | example |
|--------|---------|
| very light | subtle color shift on hover |
| light | toggle on/off, button press |
| medium | save success, new notification |
| heavy | error, irreversible action confirmation |

Same action should carry the same weight. If \`save\` sometimes toasts and sometimes modals, users get confused.

## Combining modalities

- Visual only → fast, but easy to miss
- Visual + audio → clear, but loud
- Visual + haptic → natural on mobile

Choose by context. Desktop has no haptics — go visual + subtle sound. Mobile — haptic + visual.

## Closing the series

This series is still a draft. Will publish properly after collecting more cases.
`,
  },

  /* ── Backend Data Modeling ── */
  {
    slug: "bdm-1",
    excerpt: "정규화와 단순함 사이의 trade-off — 실전 프로젝트에서의 선택 기준.",
    excerpt_en: "Normalization vs simplicity — choosing in real-world projects.",
    content: `# 정규화 vs 단순함

3NF 까지 정규화하는 게 항상 정답일까요. 실전에선 그렇지 않을 때가 더 많아요.

## 언제 denormalize 하는가

- read 가 압도적으로 많을 때 (post 의 like_count 같은 counter)
- join 비용이 hot path 의 병목일 때
- 데이터의 일부가 거의 immutable 일 때 (예: 주문 시점의 상품 가격을 복사)

## 단점도 분명

- 일관성 유지가 사람의 책임이 됨
- update 가 있을 때 multiple write 발생
- 잘못된 패턴은 시간이 갈수록 정정 비용이 커짐

## 결정 프레임

"이 필드의 truth 는 어디 있는가" 를 항상 물어보세요. 한 곳에 있다면 정규화 OK. 여러 곳에 복사된다면 그 동기화 비용을 받아들일 수 있는지.

## 다음에

다음 글: Postgres RLS 를 안전하게 시작하는 법.
`,
    content_en: `# Normalization vs Simplicity

Is normalizing to 3NF always right? In practice, often not.

## When to denormalize

- Reads dominate (like a \`like_count\` counter on a post)
- Join cost is a bottleneck on the hot path
- The data is effectively immutable (e.g., copying product price at order time)

## The tradeoffs are real

- Consistency becomes a human responsibility
- Updates trigger multiple writes
- Bad patterns get more expensive to undo over time

## A decision frame

Always ask: "Where does the truth of this field live?" If it's one place, normalize. If it's copied in many places, decide whether you can pay the sync cost.

## Next

Next post: a safe start with Postgres RLS.
`,
  },
  {
    slug: "bdm-2",
    excerpt: "Postgres RLS 를 안전하게 시작하는 법 — 권한을 데이터 모델에 새기기.",
    excerpt_en: "Embedding permissions into the data model — a safe start with RLS.",
    content: `# RLS 안전한 시작

RLS (Row Level Security) 는 권한을 코드가 아니라 데이터베이스에 새기는 방법.

## 첫 폴리시는 이렇게

\`\`\`sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public posts are visible"
  ON posts FOR SELECT
  USING (published = true);

CREATE POLICY "authors can edit"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);
\`\`\`

## 함정 1: SELECT 만 막아도 INSERT 는 통과

각 operation 마다 별도 policy 가 필요해요. 빠뜨리면 의도치 않게 열립니다.

## 함정 2: service_role 은 RLS 우회

server 에서 admin client 로 호출하면 RLS 가 작동하지 않아요. 클라이언트와 서버에서 같은 보호를 받으려면 server side 에서도 anon key + auth context 를 써야 합니다.

## 함정 3: policy 의 cost

RLS 는 모든 쿼리에 \`WHERE\` 절을 더하는 거예요. 잘못 쓰면 쿼리가 느려집니다. 인덱스 전략을 함께 가져가야 해요.

## 다음에

다음 글: 예측 가능한 마이그레이션을 위한 의식.
`,
    content_en: `# A Safe Start with RLS

Row Level Security embeds permissions into the database, not the code.

## Your first policies

\`\`\`sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public posts are visible"
  ON posts FOR SELECT
  USING (published = true);

CREATE POLICY "authors can edit"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);
\`\`\`

## Pitfall 1: blocking SELECT doesn't block INSERT

Every operation needs its own policy. Miss one and you're unintentionally open.

## Pitfall 2: service_role bypasses RLS

If your server calls go through the admin client, RLS doesn't apply. To get the same protection across client and server, use anon key + auth context on the server too.

## Pitfall 3: policies have cost

RLS adds a \`WHERE\` clause to every query. Done badly, queries slow down. Pair with an index strategy.

## Next

Next post: a ritual for predictable migrations.
`,
  },
  {
    slug: "bdm-3",
    excerpt: "예측 가능한 schema 변경을 위한 마이그레이션 의식 4가지.",
    excerpt_en: "Four habits for predictable schema migrations.",
    content: `# 마이그레이션 의식

같은 SQL 을 production 에 적용했을 때 매번 다른 결과가 나온다면, 마이그레이션이 아니라 도박이에요.

## 1. 단방향이 아니라 양방향

up 만 작성하면 panic 시 되돌릴 수 없어요. 작은 down 이라도 함께 정의하는 습관.

## 2. data 와 schema 를 분리

같은 마이그레이션에서 컬럼 추가 + 백필을 한 번에 하지 마세요. 큰 테이블에선 lock 시간이 폭발합니다. 두 단계로 나눠서.

## 3. concurrently / nullable first

\`ADD COLUMN ... NOT NULL\` 은 즉시 lock. 대신:

\`\`\`sql
ALTER TABLE posts ADD COLUMN excerpt_en TEXT;
-- 백필
UPDATE posts SET excerpt_en = '' WHERE excerpt_en IS NULL;
-- 그 다음 NOT NULL 추가
ALTER TABLE posts ALTER COLUMN excerpt_en SET NOT NULL;
\`\`\`

## 4. 코드와 schema 는 같은 PR

schema 만 먼저 가면 코드가 깨지고, 코드만 먼저 가면 시간차에 의해 missing column. 항상 한 PR.

## 시리즈를 마치며

DB 작업은 한 번 잘못된 게 오래 갑니다. 의식적인 습관이 곧 안전망이에요.
`,
    content_en: `# A Migration Ritual

If the same SQL produces different results in production each time, that's not a migration — it's gambling.

## 1. Bidirectional, not one-way

Writing only \`up\` means no rollback in panic. Build the habit of writing even a small \`down\`.

## 2. Separate data from schema

Don't bundle "add column" and "backfill" into the same migration. On large tables, lock time explodes. Split into two steps.

## 3. Concurrently / nullable first

\`ADD COLUMN ... NOT NULL\` locks immediately. Instead:

\`\`\`sql
ALTER TABLE posts ADD COLUMN excerpt_en TEXT;
-- backfill
UPDATE posts SET excerpt_en = '' WHERE excerpt_en IS NULL;
-- then add NOT NULL
ALTER TABLE posts ALTER COLUMN excerpt_en SET NOT NULL;
\`\`\`

## 4. Code and schema in the same PR

Schema first, code breaks. Code first, missing-column errors. Always one PR.

## Closing the series

DB mistakes linger. Conscious habits become the safety net.
`,
  },
];

async function run() {
  console.log(`📝 Updating ${posts.length} dummy series posts...\n`);

  let success = 0;
  let failed = 0;

  let missing = 0;

  for (const p of posts) {
    const { data, error } = await supabase
      .from("posts")
      .update({
        excerpt: p.excerpt,
        excerpt_en: p.excerpt_en,
        content: p.content,
        content_en: p.content_en,
      })
      .eq("slug", p.slug)
      .select("id");

    if (error) {
      console.error(`✗ ${p.slug}: ${error.message}`);
      failed++;
    } else if (!data || data.length === 0) {
      console.warn(`⚠ ${p.slug} — row not found (skipped)`);
      missing++;
    } else {
      console.log(`✓ ${p.slug}`);
      success++;
    }
  }

  console.log(`\nDone — success ${success}, missing ${missing}, failed ${failed}.`);
  if (missing > 0) {
    console.log(`\nℹ ${missing} 개 row 가 DB 에 없습니다. 먼저 INSERT SQL 을 실행해주세요.`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

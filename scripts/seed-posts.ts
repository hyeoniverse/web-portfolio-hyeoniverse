/**
 * Posts seed script
 *
 * 사용법:
 *   npx tsx scripts/seed-posts.ts
 *
 * 실행 전 .env.local에 다음 환경변수 필요:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const posts = [
  {
    title: "Building an Infinite Scroll Loop with Lenis",
    slug: "infinite-scroll-loop-lenis",
    content_type: "markdown" as const,
    content: `# Building an Infinite Scroll Loop with Lenis

One of the most satisfying interactions on this portfolio is the infinite scroll — when you reach the bottom, the page seamlessly loops back to the top. Here's how I built it.

## The Problem

Traditional infinite scroll appends new content at the bottom. But I wanted something different: a **seamless loop** where the scroll position resets without the user noticing.

## How Lenis Helps

[Lenis](https://lenis.darkroom.engineering/) provides buttery smooth scrolling with a simple API:

\`\`\`typescript
const lenis = new Lenis({
  infinite: true, // This is the key!
});
\`\`\`

The \`infinite\` option tells Lenis to wrap the scroll position. But the magic happens in how we set up the DOM.

## Bridge Section Technique

The trick is to duplicate the first section of content at the bottom — I call this the **bridge section**. When Lenis detects the scroll has passed the total content height, it teleports back.

\`\`\`css
.bridge {
  position: absolute;
  top: 100%; /* Sits right after the real content */
}
\`\`\`

## Key Takeaways

- Lenis \`infinite: true\` handles the math
- Duplicate first sections as a "bridge" at the bottom
- Use \`will-change: transform\` for GPU-accelerated scrolling
- Test on mobile — touch scroll has different inertia

The result is a scroll experience that feels endless and organic.`,
    excerpt:
      "How I implemented seamless infinite scrolling using Lenis, bridge sections, and some CSS tricks.",
    cover_image:
      "https://images.unsplash.com/photo-1663856542282-bf5647286f63?w=800&q=80",
    tags: ["Lenis", "Scroll", "Animation", "CSS"],
    published: true,
    language: "en" as const,
  },
  {
    title: "GSAP ScrollTrigger로 가로 스크롤 갤러리 만들기",
    slug: "gsap-horizontal-scroll-gallery",
    content_type: "markdown" as const,
    content: `# GSAP ScrollTrigger로 가로 스크롤 갤러리 만들기

Works 페이지의 가로 스크롤 갤러리를 구현한 과정을 공유합니다.

## 왜 가로 스크롤인가?

작품 포트폴리오는 시간 순서가 아니라 **시각적 임팩트** 순서로 배치하고 싶었습니다. 가로 스크롤은 갤러리 관람처럼 자연스러운 탐색 경험을 줍니다.

## 기본 구조

\`\`\`tsx
<div className="gallery" ref={containerRef}>
  <div className="slider" ref={sliderRef}>
    {projects.map(project => (
      <ProjectCard key={project.id} {...project} />
    ))}
  </div>
</div>
\`\`\`

## ScrollTrigger 설정

\`\`\`typescript
gsap.to(slider, {
  x: () => -(slider.scrollWidth - window.innerWidth),
  ease: "none",
  scrollTrigger: {
    trigger: container,
    pin: true,
    scrub: 1,
    end: () => "+=" + slider.scrollWidth,
  },
});
\`\`\`

핵심은 \`pin: true\`로 컨테이너를 고정하고, 세로 스크롤 양을 가로 이동으로 매핑하는 것입니다.

## 무한 래핑

양방향 무한 스크롤을 위해 GSAP의 \`modifiers\` 플러그인을 활용합니다:

\`\`\`typescript
gsap.utils.toArray(".project").forEach((el, i) => {
  gsap.to(el, {
    x: () => -totalWidth,
    modifiers: {
      x: gsap.utils.unitize(gsap.utils.wrap(-cardWidth, totalWidth - cardWidth)),
    },
  });
});
\`\`\`

## 반응형 처리

모바일(≤1024px)에서는 가로 스크롤을 비활성화하고 세로 스택으로 전환합니다:

\`\`\`css
@media (max-width: 1024px) {
  .slider {
    flex-direction: column;
    transform: none !important;
  }
}
\`\`\`

## 성능 팁

- \`will-change: transform\` 남용 주의 — 모바일에서 메모리 이슈 가능
- \`ScrollTrigger.refresh()\`를 리사이즈 시 호출
- 이미지는 Intersection Observer로 lazy load`,
    excerpt:
      "GSAP ScrollTrigger를 활용한 가로 스크롤 갤러리 구현 과정과 무한 래핑, 반응형 처리 방법.",
    cover_image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
    tags: ["GSAP", "ScrollTrigger", "Gallery", "Responsive"],
    published: true,
    language: "ko" as const,
  },
  {
    title: "CSS Variables로 Dark/Light 테마 구현하기",
    slug: "css-variables-dark-light-theme",
    content_type: "markdown" as const,
    content: `# CSS Variables로 Dark/Light 테마 구현하기

JavaScript 없이도 CSS Variables만으로 완전한 테마 시스템을 만들 수 있습니다.

## 3-Layer 토큰 시스템

### 1. Raw Tokens
원시 색상값을 정의합니다:

\`\`\`css
:root {
  --color-neutral-0: #ffffff;
  --color-neutral-999: #000000;
  --color-accent: #d40063;
}
\`\`\`

### 2. Semantic Tokens
의미를 부여합니다:

\`\`\`css
[data-theme="light"] {
  --text-primary: var(--color-neutral-900);
  --bg-primary: var(--color-neutral-0);
}

[data-theme="dark"] {
  --text-primary: var(--color-neutral-100);
  --bg-primary: var(--color-neutral-950);
}
\`\`\`

### 3. Component Tokens
컴포넌트에서 시맨틱 토큰을 사용합니다:

\`\`\`css
.card {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}
\`\`\`

## 테마 전환 애니메이션

모든 요소가 부드럽게 전환되도록 글로벌 트랜지션을 적용합니다:

\`\`\`css
html[data-theme-ready] * {
  transition: background-color 0.3s, color 0.3s, border-color 0.3s;
}
\`\`\`

> **주의**: 이 글로벌 transition은 specificity가 (0,1,1)이라서 컴포넌트의 transform, opacity 등의 transition을 덮어씁니다. 컴파운드 셀렉터 \`.parent .child\`로 해결하세요.

## localStorage 연동

\`\`\`typescript
useEffect(() => {
  const saved = localStorage.getItem("theme") ?? "dark";
  document.documentElement.setAttribute("data-theme", saved);
}, []);
\`\`\`

이렇게 하면 새로고침해도 선택한 테마가 유지됩니다.`,
    excerpt:
      "CSS Custom Properties 기반 3-layer 토큰 시스템으로 Dark/Light 테마를 구현하는 방법.",
    cover_image:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
    tags: ["CSS", "Theme", "Design Tokens", "Dark Mode"],
    published: true,
    language: "ko" as const,
  },
  {
    title: "Performance Optimization: 60 to 98 on Mobile",
    slug: "performance-optimization-mobile",
    content_type: "markdown" as const,
    content: `# Performance Optimization: 60 to 98 on Mobile

My portfolio's Lighthouse mobile score was stuck at 60. Here's what I did to push it to 98.

## The Bottlenecks

1. **Font loading** — 4 font families, 12+ weights = 800KB+
2. **Three.js bundle** — The 3D torus was loaded on every page
3. **Unoptimized images** — Full-size screenshots in the works section
4. **CSS bloat** — Unused styles from rapid iteration

## Font Optimization

The biggest win. I switched from loading all weights to only what's needed:

\`\`\`css
@font-face {
  font-family: 'Instrument Serif';
  font-display: swap;           /* Show fallback immediately */
  font-weight: 400;
  src: url('/fonts/instrument-serif-regular.woff2') format('woff2');
  unicode-range: U+0000-00FF;   /* Latin only for this file */
}
\`\`\`

**Result**: Font payload dropped from 800KB to 180KB.

## Code Splitting Three.js

The 3D torus only appears on the home page, so I lazy-loaded it:

\`\`\`tsx
const Torus = dynamic(() => import("@/components/Torus"), {
  ssr: false,
  loading: () => null,
});
\`\`\`

**Result**: Initial JS bundle reduced by 210KB.

## Image Optimization

- Used Next.js \`<Image>\` with \`sizes\` attribute
- Served WebP format via sharp
- Implemented blur placeholders with \`plaiceholder\`

## browserslist

Added a focused browserslist to reduce CSS autoprefixer output:

\`\`\`json
"browserslist": [
  "last 2 Chrome versions",
  "last 2 Safari versions",
  "last 2 Firefox versions"
]
\`\`\`

## Final Scores

| Metric | Before | After |
|--------|--------|-------|
| Performance | 60 | 98 |
| LCP | 4.2s | 1.1s |
| CLS | 0.15 | 0.01 |
| Bundle Size | 1.2MB | 360KB |

The key lesson: **measure first, optimize what matters**.`,
    excerpt:
      "How I improved my portfolio's mobile Lighthouse score from 60 to 98 through font optimization, code splitting, and image improvements.",
    cover_image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    tags: ["Performance", "Lighthouse", "Optimization", "Next.js"],
    published: true,
    language: "en" as const,
  },
  {
    title: "Three.js로 스크롤 반응형 3D 오브젝트 만들기",
    slug: "threejs-scroll-reactive-3d-object",
    content_type: "markdown" as const,
    content: `# Three.js로 스크롤 반응형 3D 오브젝트 만들기

포트폴리오 홈 페이지에 떠다니는 금속 도넛(Torus)을 만든 과정을 소개합니다.

## React Three Fiber

React에서 Three.js를 쓸 때는 R3F(React Three Fiber)가 가장 자연스럽습니다:

\`\`\`tsx
import { Canvas } from "@react-three/fiber";

function Scene() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <TorusMesh />
    </Canvas>
  );
}
\`\`\`

## Lissajous Curve 경로

도넛이 단순히 직선으로 움직이면 재미없죠. **리사주 곡선**을 사용하면 유기적인 궤적을 만들 수 있습니다:

\`\`\`typescript
const x = Math.sin(a * t + deltaPhase) * amplitudeX;
const y = Math.sin(b * t) * amplitudeY;
const z = Math.cos(c * t) * amplitudeZ;
\`\`\`

파라미터 a, b, c의 비율에 따라 다양한 패턴이 나옵니다.

## 스크롤 연동

Lenis의 scroll progress를 3D 위치에 매핑합니다:

\`\`\`typescript
useFrame(() => {
  const t = scrollProgress.current * Math.PI * 2;
  mesh.position.set(
    Math.sin(3 * t) * 2,
    Math.sin(2 * t) * 1.5,
    Math.cos(t) * 1
  );
});
\`\`\`

## 테마 반응형 머티리얼

다크/라이트 테마에 따라 환경맵과 roughness를 전환합니다:

\`\`\`tsx
<meshStandardMaterial
  metalness={0.95}
  roughness={theme === "dark" ? 0.1 : 0.3}
  envMapIntensity={theme === "dark" ? 1.5 : 0.8}
/>
\`\`\`

다크 모드에서는 반짝이는 크롬 느낌, 라이트 모드에서는 매트한 실버 느낌을 줍니다.

## 성능 주의사항

- 모바일에서는 geometry segments를 줄이세요 (64 → 32)
- \`frameloop="demand"\`로 필요할 때만 렌더링
- \`<Suspense>\`로 로딩 상태 처리`,
    excerpt:
      "React Three Fiber와 Lissajous Curve를 활용한 스크롤 반응형 3D 금속 도넛 구현기.",
    cover_image:
      "https://images.unsplash.com/photo-1639542270103-0e94fc28be38?w=800&q=80",
    tags: ["Three.js", "R3F", "3D", "Animation"],
    published: true,
    language: "ko" as const,
  },
  // ── 25 realistic posts ──
  {
    title: "Understanding Server Components",
    slug: "understanding-server-components",
    content_type: "markdown" as const,
    content: `# Understanding Server Components

React Server Components(RSC)는 서버에서만 실행되는 컴포넌트입니다. 클라이언트 번들에 포함되지 않아 초기 로딩이 빨라집니다.

## Server vs Client

\`\`\`tsx
// Server Component (기본값)
async function PostList() {
  const posts = await db.query("SELECT * FROM posts");
  return (
    <ul>
      {posts.map(p => <li key={p.id}>{p.title}</li>)}
    </ul>
  );
}

// Client Component
"use client";
function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>♥</button>;
}
\`\`\`

핵심은 **상호작용이 없으면 서버 컴포넌트**, **이벤트 핸들러가 필요하면 클라이언트 컴포넌트**입니다.

## 데이터 페칭이 달라진다

서버 컴포넌트에서는 \`useEffect\` + \`fetch\` 패턴이 필요 없습니다. 직접 DB나 API를 호출하면 됩니다:

\`\`\`tsx
async function Dashboard() {
  const [users, revenue] = await Promise.all([
    getUsers(),
    getRevenue(),
  ]);

  return (
    <>
      <UserChart data={users} />
      <RevenueCard amount={revenue} />
    </>
  );
}
\`\`\`

## 번들 사이즈 영향

서버 컴포넌트에서 사용하는 라이브러리는 클라이언트 번들에 포함되지 않습니다. \`marked\`, \`date-fns\`, \`lodash\` 같은 유틸리티를 서버 컴포넌트에서만 사용하면 번들 크기가 크게 줄어듭니다.

## 주의사항

- \`useState\`, \`useEffect\` 등 React 훅은 사용 불가
- 브라우저 API (window, document) 접근 불가
- 이벤트 핸들러 (onClick, onChange) 바인딩 불가
- 직렬화 가능한 props만 클라이언트 컴포넌트에 전달 가능 (함수는 전달 불가)`,
    excerpt: "React Server Components의 동작 원리와 Client Components와의 차이를 코드와 함께 살펴봅니다.",
    cover_image: "",
    tags: ["React", "Next.js", "Performance"],
    published: true,
    language: "ko" as const,
    view_count: 342,
    created_at: new Date(Date.now() - 75 * 86400000).toISOString(),
  },
  {
    title: "Framer Motion Tips & Tricks",
    slug: "framer-motion-tips-tricks",
    content_type: "markdown" as const,
    content: `# Framer Motion Tips & Tricks

Framer Motion makes React animation feel effortless, but there are patterns that separate basic usage from polished production code.

## Layout Animations

The \`layout\` prop is incredibly powerful. It animates any CSS layout change automatically:

\`\`\`tsx
function Accordion({ isOpen }: { isOpen: boolean }) {
  return (
    <motion.div layout>
      <motion.h3 layout="position">Title</motion.h3>
      {isOpen && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          Content goes here
        </motion.p>
      )}
    </motion.div>
  );
}
\`\`\`

\`layout="position"\` tells Framer to only animate the position, not the size — perfect for text elements that shouldn't stretch.

## Stagger Children

Instead of manually delaying each child, use \`staggerChildren\`:

\`\`\`tsx
const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function List({ items }: { items: string[] }) {
  return (
    <motion.ul variants={container} initial="hidden" animate="show">
      {items.map(text => (
        <motion.li key={text} variants={item}>{text}</motion.li>
      ))}
    </motion.ul>
  );
}
\`\`\`

## useMotionValue for Performance

\`useMotionValue\` bypasses React's re-render cycle — it updates the DOM directly:

\`\`\`tsx
function Parallax() {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  useMotionValueEvent(y, "change", (latest) => {
    // No re-render, direct DOM update
  });

  return <motion.div style={{ y, opacity }} />;
}
\`\`\`

## Exit Animations

Always wrap with \`AnimatePresence\` and provide a \`key\`:

\`\`\`tsx
<AnimatePresence mode="wait">
  <motion.div
    key={currentPage}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
  >
    {content}
  </motion.div>
</AnimatePresence>
\`\`\`

\`mode="wait"\` ensures the exit animation completes before the enter animation starts.`,
    excerpt: "Layout animations, stagger patterns, useMotionValue performance tricks, and exit animation best practices.",
    cover_image: "",
    tags: ["Animation", "React", "Performance"],
    published: true,
    language: "en" as const,
    view_count: 287,
    created_at: new Date(Date.now() - 72 * 86400000).toISOString(),
  },
  {
    title: "Zustand vs Context API",
    slug: "zustand-vs-context-api",
    content_type: "markdown" as const,
    content: `# Zustand vs Context API

React 상태관리에서 Zustand와 Context API를 언제 쓸지 정리합니다.

## Context API의 문제점

Context가 변경되면 **하위의 모든 컴포넌트**가 리렌더됩니다:

\`\`\`tsx
// 문제: count가 바뀌면 theme만 쓰는 컴포넌트도 리렌더
const AppContext = createContext({ count: 0, theme: "dark" });

function ThemeLabel() {
  const { theme } = useContext(AppContext); // count 변경 시에도 리렌더!
  return <span>{theme}</span>;
}
\`\`\`

## Zustand의 선택적 구독

Zustand는 selector 패턴으로 필요한 값만 구독합니다:

\`\`\`typescript
import { create } from "zustand";

interface AppStore {
  count: number;
  theme: string;
  increment: () => void;
  setTheme: (t: string) => void;
}

const useAppStore = create<AppStore>((set) => ({
  count: 0,
  theme: "dark",
  increment: () => set((s) => ({ count: s.count + 1 })),
  setTheme: (theme) => set({ theme }),
}));

// count가 바뀌어도 리렌더 안 됨
function ThemeLabel() {
  const theme = useAppStore((s) => s.theme);
  return <span>{theme}</span>;
}
\`\`\`

## 언제 뭘 쓸까?

| 기준 | Context API | Zustand |
|------|------------|---------|
| 변경 빈도 | 낮음 (테마, 언어) | 높음 (폼, 카운터) |
| 구독자 수 | 적음 | 많음 |
| 컴포넌트 외부 접근 | 불가 | 가능 |
| 번들 크기 | 0 (내장) | ~1KB |
| DevTools | 없음 | 있음 |
| Middleware | 없음 | persist, immer 등 |

## 실전 팁

이 포트폴리오에서는 **테마와 언어**는 Context API, **에디터 상태**는 Zustand를 사용합니다. 변경 빈도가 낮고 구독자가 명확한 경우 Context가 충분하고, 복잡한 상태 로직이 필요하면 Zustand가 적합합니다.

\`\`\`typescript
// Zustand persist middleware — 새로고침해도 상태 유지
const useEditorStore = create(
  persist(
    (set) => ({
      draft: "",
      setDraft: (draft: string) => set({ draft }),
    }),
    { name: "editor-draft" }
  )
);
\`\`\``,
    excerpt: "Context API의 리렌더 문제와 Zustand의 선택적 구독 패턴을 비교하고, 실전 사용 기준을 정리합니다.",
    cover_image: "",
    tags: ["React", "TypeScript", "Performance"],
    published: true,
    language: "ko" as const,
    view_count: 198,
    created_at: new Date(Date.now() - 69 * 86400000).toISOString(),
  },
  {
    title: "Deploying to Vercel Edge",
    slug: "deploying-vercel-edge",
    content_type: "markdown" as const,
    content: `# Deploying to Vercel Edge

Edge Runtime brings your code closer to users. Here's how to use it effectively with Next.js.

## What is Edge Runtime?

Edge functions run on Vercel's global network — not in a single region like traditional serverless. This means lower latency for users worldwide.

\`\`\`typescript
// app/api/geo/route.ts
export const runtime = "edge";

export function GET(request: Request) {
  const country = request.headers.get("x-vercel-ip-country") ?? "unknown";
  return Response.json({ country });
}
\`\`\`

## Edge vs Node.js Runtime

| Feature | Edge | Node.js |
|---------|------|---------|
| Cold start | ~0ms | 250ms+ |
| Max duration | 30s | 300s |
| File system | No | Yes |
| npm packages | Limited | Full |
| Global latency | Low | Regional |

## Middleware

Middleware always runs on the Edge. Use it for auth checks, redirects, and A/B testing:

\`\`\`typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session");

  if (request.nextUrl.pathname.startsWith("/admin") && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
\`\`\`

## Limitations to Know

1. **No native Node.js modules** — \`fs\`, \`path\`, \`crypto\` (use Web Crypto instead)
2. **Max 1MB** bundle size per function
3. **No long-running connections** — WebSockets work, but with 30s timeout
4. **Limited npm support** — many packages depend on Node.js APIs

## When to Use Edge

- Authentication / authorization middleware
- Geolocation-based content
- A/B testing
- Simple API responses (JSON)
- Header/cookie manipulation`,
    excerpt: "Edge Runtime의 장단점, Middleware 활용법, Node.js Runtime과의 비교를 정리합니다.",
    cover_image: "",
    tags: ["Next.js", "Performance", "Supabase"],
    published: true,
    language: "en" as const,
    view_count: 156,
    created_at: new Date(Date.now() - 66 * 86400000).toISOString(),
  },
  {
    title: "CSS Container Queries 실전",
    slug: "css-container-queries",
    content_type: "markdown" as const,
    content: `# CSS Container Queries 실전

미디어 쿼리는 뷰포트 기준입니다. 하지만 컴포넌트는 어디에 들어갈지 모릅니다. Container Queries는 **부모 컨테이너 크기**에 따라 스타일을 변경합니다.

## 기본 사용법

\`\`\`css
/* 1. 컨테이너 선언 */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* 2. 컨테이너 크기에 따른 스타일 */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}
\`\`\`

## 미디어 쿼리와의 차이

\`\`\`css
/* 미디어 쿼리: 뷰포트가 768px 이하일 때 */
@media (max-width: 768px) {
  .card { flex-direction: column; }
}

/* 컨테이너 쿼리: .card의 부모가 400px 이하일 때 */
@container (max-width: 400px) {
  .card { flex-direction: column; }
}
\`\`\`

사이드바에 같은 카드를 넣으면 미디어 쿼리는 깨지지만, 컨테이너 쿼리는 자동으로 적응합니다.

## container-type 옵션

| 값 | 설명 |
|---|------|
| \`inline-size\` | 가로 방향만 쿼리 (가장 일반적) |
| \`size\` | 가로 + 세로 모두 쿼리 |
| \`normal\` | 컨테이너 아님 (기본값) |

## Container Query Units

컨테이너 크기에 비례하는 단위도 사용할 수 있습니다:

\`\`\`css
.card-title {
  font-size: clamp(1rem, 3cqi, 1.5rem); /* cqi = container query inline */
}
\`\`\`

| 단위 | 설명 |
|------|------|
| \`cqw\` | 컨테이너 너비의 1% |
| \`cqh\` | 컨테이너 높이의 1% |
| \`cqi\` | inline axis의 1% |
| \`cqb\` | block axis의 1% |

## 브라우저 지원

2024년 기준 모든 주요 브라우저에서 지원됩니다. Safari 16+, Chrome 105+, Firefox 110+.`,
    excerpt: "Container Queries의 기본 개념부터 Container Units, 실전 패턴까지 정리합니다.",
    cover_image: "",
    tags: ["CSS", "Design", "Responsive"],
    published: true,
    language: "ko" as const,
    view_count: 231,
    created_at: new Date(Date.now() - 63 * 86400000).toISOString(),
  },
  {
    title: "Supabase Row Level Security 가이드",
    slug: "supabase-row-level-security",
    content_type: "markdown" as const,
    content: `# Supabase Row Level Security 가이드

RLS(Row Level Security)는 데이터베이스 레벨에서 접근을 제어합니다. API 키가 노출되어도 데이터가 안전합니다.

## RLS 없이는 위험하다

Supabase의 \`anon\` 키는 클라이언트에 노출됩니다. RLS가 없으면 누구나 모든 데이터를 읽고 쓸 수 있습니다:

\`\`\`javascript
// 누군가 DevTools에서 이렇게 하면?
const { data } = await supabase.from("users").select("*");
// → 모든 유저 정보 유출!
\`\`\`

## 기본 패턴

\`\`\`sql
-- 1. RLS 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 2. 공개 읽기 (published만)
CREATE POLICY "Public read"
  ON posts FOR SELECT
  USING (published = true);

-- 3. 인증된 유저만 쓰기
CREATE POLICY "Auth write"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. 작성자만 수정
CREATE POLICY "Owner update"
  ON posts FOR UPDATE
  USING (author_id = auth.uid());
\`\`\`

## auth.uid()와 auth.jwt()

\`\`\`sql
-- auth.uid(): 현재 로그인한 유저의 UUID
-- auth.jwt(): 전체 JWT 클레임 (role, email 등)

CREATE POLICY "Admin full access"
  ON posts FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
\`\`\`

## 흔한 실수

### 1. SELECT 정책만 만들고 INSERT/UPDATE/DELETE를 잊음

\`\`\`sql
-- 이것만으로는 쓰기가 전부 차단됨
CREATE POLICY "Read" ON posts FOR SELECT USING (true);

-- INSERT, UPDATE, DELETE 정책도 필요
\`\`\`

### 2. service_role 키를 클라이언트에서 사용

\`\`\`typescript
// 절대 하지 마세요!
const supabase = createClient(url, serviceRoleKey); // RLS 무시
\`\`\`

\`service_role\` 키는 서버 사이드(API Route)에서만 사용하세요.

### 3. JOIN된 테이블에 정책 미적용

posts와 comments를 JOIN할 때, 두 테이블 모두 RLS 정책이 필요합니다.

## 디버깅 팁

\`\`\`sql
-- 특정 유저로 정책 테스트
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM posts; -- RLS가 적용된 결과 확인
\`\`\``,
    excerpt: "Supabase RLS의 기본 개념부터 흔한 실수, 디버깅 방법까지 실전 가이드.",
    cover_image: "",
    tags: ["Supabase", "Node.js", "TypeScript"],
    published: true,
    language: "ko" as const,
    view_count: 412,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    title: "Next.js Middleware 활용법",
    slug: "nextjs-middleware-guide",
    content_type: "markdown" as const,
    content: `# Next.js Middleware 활용법

Middleware는 요청이 완료되기 전에 실행되는 코드입니다. 인증, 리다이렉트, 헤더 조작 등에 활용합니다.

## 기본 구조

\`\`\`typescript
// middleware.ts (프로젝트 루트)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 요청 정보 활용
  const { pathname } = request.nextUrl;
  const locale = request.headers.get("accept-language")?.split(",")[0];

  // 응답 헤더 추가
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);

  return response;
}

// 어떤 경로에 적용할지 지정
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
\`\`\`

## 인증 가드

\`\`\`typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token");
  const isAdmin = request.nextUrl.pathname.startsWith("/admin");
  const isLogin = request.nextUrl.pathname === "/admin/login";

  if (isAdmin && !isLogin && !token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isLogin && token) {
    return NextResponse.redirect(new URL("/admin/posts", request.url));
  }

  return NextResponse.next();
}
\`\`\`

## Supabase 세션 갱신

Supabase Auth를 사용할 때 middleware에서 세션을 갱신해야 쿠키가 유지됩니다:

\`\`\`typescript
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser(); // 세션 갱신 트리거

  return response;
}
\`\`\`

## 주의사항

- Edge Runtime으로 실행됩니다 — Node.js API 사용 불가
- 정적 파일(images, fonts)에는 적용하지 마세요 — \`matcher\`로 제외
- 무거운 로직은 넣지 마세요 — 모든 요청에 실행됩니다`,
    excerpt: "Next.js Middleware로 인증 가드, Supabase 세션 갱신, 경로 보호를 구현하는 방법.",
    cover_image: "",
    tags: ["Next.js", "Supabase", "TypeScript"],
    published: true,
    language: "ko" as const,
    view_count: 189,
    created_at: new Date(Date.now() - 57 * 86400000).toISOString(),
  },
  {
    title: "React 19 새로운 기능 정리",
    slug: "react-19-new-features",
    content_type: "markdown" as const,
    content: `# React 19 새로운 기능 정리

React 19의 주요 변경점을 정리합니다.

## use() Hook

Promise를 직접 읽을 수 있는 새로운 Hook:

\`\`\`tsx
function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise);
  return comments.map(c => <p key={c.id}>{c.text}</p>);
}
\`\`\`

Suspense와 함께 사용하면 로딩 상태를 선언적으로 처리할 수 있습니다.

## Actions

폼 제출을 서버와 통합하는 새로운 패턴:

\`\`\`tsx
function AddToCart({ productId }: { productId: string }) {
  const [error, submitAction, isPending] = useActionState(
    async (prev: string | null, formData: FormData) => {
      const result = await addToCart(productId);
      if (result.error) return result.error;
      return null;
    },
    null
  );

  return (
    <form action={submitAction}>
      <button disabled={isPending}>
        {isPending ? "Adding..." : "Add to Cart"}
      </button>
      {error && <p>{error}</p>}
    </form>
  );
}
\`\`\`

## useOptimistic

낙관적 업데이트를 위한 전용 Hook:

\`\`\`tsx
function Messages({ messages }: { messages: Message[] }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state, newMsg: string) => [
      ...state,
      { id: "temp", text: newMsg, sending: true },
    ]
  );

  async function sendMessage(formData: FormData) {
    const text = formData.get("message") as string;
    addOptimistic(text);
    await deliverMessage(text);
  }

  return (
    <>
      {optimisticMessages.map(m => (
        <p key={m.id} style={{ opacity: m.sending ? 0.5 : 1 }}>
          {m.text}
        </p>
      ))}
      <form action={sendMessage}>
        <input name="message" />
      </form>
    </>
  );
}
\`\`\`

## ref가 prop으로 전달 가능

\`forwardRef\`가 더 이상 필요 없습니다:

\`\`\`tsx
// Before (React 18)
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);

// After (React 19)
function Input({ ref, ...props }: { ref: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
\`\`\`

## Document Metadata

컴포넌트 내에서 \`<title>\`, \`<meta>\`를 직접 렌더링할 수 있습니다:

\`\`\`tsx
function BlogPost({ post }: { post: Post }) {
  return (
    <>
      <title>{post.title}</title>
      <meta name="description" content={post.excerpt} />
      <article>{post.content}</article>
    </>
  );
}
\`\`\``,
    excerpt: "use() Hook, Actions, useOptimistic, ref prop 전달 등 React 19의 핵심 기능 정리.",
    cover_image: "",
    tags: ["React", "TypeScript"],
    published: true,
    language: "ko" as const,
    view_count: 467,
    created_at: new Date(Date.now() - 54 * 86400000).toISOString(),
  },
  {
    title: "Tailwind vs CSS Modules 비교",
    slug: "tailwind-vs-css-modules",
    content_type: "markdown" as const,
    content: `# Tailwind vs CSS Modules 비교

이 포트폴리오는 CSS Modules를 사용합니다. Tailwind를 안 쓴 이유와 각각의 장단점을 비교합니다.

## CSS Modules

\`\`\`tsx
// Button.module.css
.button {
  padding: 8px 24px;
  border-radius: 9999px;
  background: var(--text-primary);
  color: var(--bg-primary);
}

// Button.tsx
import styles from "./Button.module.css";

function Button({ children }) {
  return <button className={styles.button}>{children}</button>;
}
\`\`\`

장점:
- 클래스명 자동 해싱 → 충돌 없음
- CSS 변수와 자연스럽게 통합
- 표준 CSS 문법 그대로

## Tailwind CSS

\`\`\`tsx
function Button({ children }) {
  return (
    <button className="px-6 py-2 rounded-full bg-gray-900 text-white
      dark:bg-white dark:text-gray-900 hover:opacity-80 transition">
      {children}
    </button>
  );
}
\`\`\`

장점:
- 파일 전환 없이 빠른 개발
- 일관된 디자인 시스템 강제
- 빌드 시 사용하지 않는 CSS 자동 제거

## 비교 테이블

| 기준 | CSS Modules | Tailwind |
|------|-------------|----------|
| 학습곡선 | 낮음 (표준 CSS) | 중간 (유틸리티 클래스 암기) |
| 파일 수 | 컴포넌트당 +1 (.module.css) | 0 |
| 디자인 토큰 | CSS Variables | tailwind.config |
| 다크 모드 | \`[data-theme]\` selector | \`dark:\` prefix |
| 타입 안전성 | TypeScript plugin 필요 | className 문자열 |
| 커스터마이징 | 자유도 높음 | config 제한적 |
| 런타임 오버헤드 | 없음 | 없음 |

## 이 프로젝트에서 CSS Modules를 선택한 이유

1. **CSS 변수 기반 테마** — 3-layer 토큰 시스템을 CSS Variables로 이미 구축함
2. **복잡한 애니메이션** — GSAP, Framer Motion과 함께 커스텀 transition이 필요
3. **글로벌 specificity 관리** — 테마 transition과의 충돌을 compound selector로 해결해야 함
4. **1인 프로젝트** — Tailwind의 "팀 컨벤션 통일" 장점이 불필요

## 결론

Tailwind이 나쁜 게 아닙니다. **팀 프로젝트**에서 일관된 스타일을 빠르게 적용하는 데는 Tailwind이 더 적합할 수 있습니다. 하지만 **커스텀 디자인 시스템**을 구축하는 포트폴리오에서는 CSS Modules가 더 유연합니다.`,
    excerpt: "CSS Modules와 Tailwind CSS의 장단점을 비교하고, 이 프로젝트에서 CSS Modules를 선택한 이유를 설명합니다.",
    cover_image: "",
    tags: ["CSS", "Design", "React"],
    published: true,
    language: "ko" as const,
    view_count: 324,
    created_at: new Date(Date.now() - 51 * 86400000).toISOString(),
  },
  {
    title: "Web Animation API 입문",
    slug: "web-animation-api-intro",
    content_type: "markdown" as const,
    content: `# Web Animation API 입문

CSS 애니메이션과 JavaScript의 장점을 결합한 Web Animation API(WAAPI)를 소개합니다.

## 기본 사용법

\`\`\`javascript
const element = document.querySelector(".box");

const animation = element.animate(
  [
    { transform: "translateX(0)", opacity: 1 },
    { transform: "translateX(300px)", opacity: 0.5 },
  ],
  {
    duration: 1000,
    easing: "ease-in-out",
    fill: "forwards",
  }
);
\`\`\`

## CSS 애니메이션과의 차이

\`\`\`javascript
// CSS: 선언적 → 제어 어려움
// WAAPI: 명령적 → 세밀한 제어 가능

animation.pause();
animation.reverse();
animation.playbackRate = 2; // 2배속
animation.currentTime = 500; // 특정 시점으로 이동

// 완료 감지
animation.finished.then(() => {
  console.log("Animation complete!");
});
\`\`\`

## KeyframeEffect

더 복잡한 애니메이션을 미리 정의할 수 있습니다:

\`\`\`javascript
const effect = new KeyframeEffect(
  element,
  [
    { transform: "scale(1)", offset: 0 },
    { transform: "scale(1.2)", offset: 0.3 },
    { transform: "scale(0.8)", offset: 0.7 },
    { transform: "scale(1)", offset: 1 },
  ],
  { duration: 800, iterations: Infinity }
);

const animation = new Animation(effect, document.timeline);
animation.play();
\`\`\`

## 스크롤 연동 (ScrollTimeline)

\`\`\`javascript
const timeline = new ScrollTimeline({
  source: document.documentElement,
  axis: "block",
});

element.animate(
  { opacity: [0, 1], transform: ["translateY(50px)", "translateY(0)"] },
  { timeline, rangeStart: "entry 0%", rangeEnd: "entry 100%" }
);
\`\`\`

## GSAP vs WAAPI

| 기준 | WAAPI | GSAP |
|------|-------|------|
| 번들 크기 | 0 (네이티브) | ~30KB |
| 성능 | 최적 (브라우저 네이티브) | 우수 |
| Timeline | ScrollTimeline | ScrollTrigger |
| 호환성 | 모던 브라우저 | IE11+ |
| 기능 | 기본 | 매우 풍부 |

단순한 애니메이션은 WAAPI, 복잡한 시퀀스는 GSAP이 적합합니다.`,
    excerpt: "Web Animation API의 기본 사용법부터 ScrollTimeline, GSAP과의 비교까지.",
    cover_image: "",
    tags: ["Animation", "CSS", "Performance"],
    published: true,
    language: "ko" as const,
    view_count: 145,
    created_at: new Date(Date.now() - 48 * 86400000).toISOString(),
  },
  {
    title: "TypeScript Generics 마스터하기",
    slug: "typescript-generics-master",
    content_type: "markdown" as const,
    content: `# TypeScript Generics 마스터하기

제네릭은 타입을 파라미터화합니다. 재사용 가능하면서도 타입 안전한 코드를 작성할 수 있습니다.

## 기본 제네릭

\`\`\`typescript
// 제네릭 없이
function first(arr: any[]): any {
  return arr[0]; // 타입 정보 손실
}

// 제네릭으로
function first<T>(arr: T[]): T {
  return arr[0]; // 타입 유지
}

const num = first([1, 2, 3]);     // number
const str = first(["a", "b"]);    // string
\`\`\`

## 제약 조건 (Constraints)

\`\`\`typescript
// T는 반드시 length 속성을 가져야 함
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("hello", "hi");      // OK: string has length
longest([1, 2], [1]);         // OK: array has length
longest(10, 20);              // Error: number has no length
\`\`\`

## 유틸리티 타입 만들기

\`\`\`typescript
// Partial<T>의 내부 구현
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Pick<T, K>의 내부 구현
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Record<K, V>의 내부 구현
type MyRecord<K extends string | number | symbol, V> = {
  [P in K]: V;
};
\`\`\`

## Conditional Types

\`\`\`typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<42>;       // false

// 실전: API 응답 타입 추론
type ApiResponse<T> = T extends "user"
  ? { id: string; name: string }
  : T extends "post"
  ? { id: string; title: string; content: string }
  : never;

function fetchApi<T extends "user" | "post">(type: T): Promise<ApiResponse<T>> {
  return fetch(\`/api/\${type}\`).then(r => r.json());
}

// data의 타입이 자동으로 { id: string; name: string }
const data = await fetchApi("user");
\`\`\`

## infer 키워드

\`\`\`typescript
// 함수의 반환 타입 추출
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: "1", name: "Kim" };
}

type User = ReturnOf<typeof getUser>; // { id: string; name: string }

// Promise 내부 타입 추출
type Unwrap<T> = T extends Promise<infer U> ? U : T;

type A = Unwrap<Promise<string>>; // string
type B = Unwrap<number>;           // number
\`\`\`

## 실전 팁

제네릭은 **2번 이상 사용될 때**만 의미가 있습니다. 한 번만 쓰이는 타입 파라미터는 제거하고 직접 타입을 명시하세요.`,
    excerpt: "TypeScript 제네릭의 기본부터 Conditional Types, infer 키워드까지 실전 패턴 정리.",
    cover_image: "",
    tags: ["TypeScript", "React"],
    published: true,
    language: "ko" as const,
    view_count: 378,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    title: "Next.js ISR과 On-Demand Revalidation",
    slug: "nextjs-isr-on-demand-revalidation",
    content_type: "markdown" as const,
    content: `# Next.js ISR과 On-Demand Revalidation

ISR(Incremental Static Regeneration)은 정적 생성과 서버 렌더링의 장점을 결합합니다.

## Time-based Revalidation

\`\`\`typescript
// app/posts/page.tsx
export const revalidate = 60; // 60초마다 재생성

async function PostsPage() {
  const posts = await fetchPosts();
  return <PostList posts={posts} />;
}
\`\`\`

60초 내에 같은 페이지를 요청하면 캐시된 HTML을 반환하고, 백그라운드에서 새 버전을 생성합니다.

## On-Demand Revalidation

시간 기반이 아니라 **이벤트 기반**으로 캐시를 무효화합니다:

\`\`\`typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const { path, tag, secret } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: "Invalid secret" }, { status: 401 });
  }

  if (tag) {
    revalidateTag(tag);
  } else if (path) {
    revalidatePath(path);
  }

  return Response.json({ revalidated: true });
}
\`\`\`

## fetch와 캐시 태그

\`\`\`typescript
async function getPost(slug: string) {
  const res = await fetch(\`\${API}/posts/\${slug}\`, {
    next: {
      tags: ["posts", \`post-\${slug}\`],
      revalidate: 3600,
    },
  });
  return res.json();
}

// 특정 포스트만 무효화
revalidateTag("post-my-article");

// 모든 포스트 무효화
revalidateTag("posts");
\`\`\`

## Webhook 연동

CMS에서 콘텐츠가 변경되면 자동으로 재생성:

\`\`\`typescript
// Supabase webhook → API route → revalidate
export async function POST(request: Request) {
  const payload = await request.json();
  const { type, record } = payload;

  if (type === "UPDATE" && record.table === "posts") {
    revalidatePath(\`/posts/\${record.slug}\`);
    revalidatePath("/posts");
  }

  return Response.json({ ok: true });
}
\`\`\`

## SSR vs ISR vs SSG

| 전략 | 빌드 시 | 요청 시 | 캐시 | 적합한 경우 |
|------|---------|---------|------|------------|
| SSG | 생성 | 캐시 반환 | 영구 | 변하지 않는 페이지 |
| ISR | 생성 | 캐시 + 백그라운드 갱신 | 시간/이벤트 | 블로그, 상품 |
| SSR | - | 매번 생성 | 없음 | 실시간 데이터 |`,
    excerpt: "ISR의 Time-based / On-Demand Revalidation 패턴과 Webhook 연동 방법을 설명합니다.",
    cover_image: "",
    tags: ["Next.js", "Performance"],
    published: true,
    language: "ko" as const,
    view_count: 203,
    created_at: new Date(Date.now() - 42 * 86400000).toISOString(),
  },
  {
    title: "Accessibility 체크리스트",
    slug: "accessibility-checklist",
    content_type: "markdown" as const,
    content: `# Accessibility 체크리스트

웹 접근성은 선택이 아닌 필수입니다. 실전에서 바로 적용할 수 있는 체크리스트를 정리합니다.

## 시맨틱 HTML

\`\`\`html
<!-- Bad -->
<div class="header">
  <div class="nav">
    <div class="link" onclick="navigate()">Home</div>
  </div>
</div>

<!-- Good -->
<header>
  <nav>
    <a href="/">Home</a>
  </nav>
</header>
\`\`\`

## 키보드 네비게이션

모든 인터랙티브 요소는 키보드로 접근 가능해야 합니다:

\`\`\`tsx
// focus visible 스타일 필수
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

// 커스텀 컴포넌트에 키보드 이벤트 추가
function Dropdown() {
  return (
    <div
      role="listbox"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") selectNext();
        if (e.key === "ArrowUp") selectPrev();
        if (e.key === "Enter") confirm();
        if (e.key === "Escape") close();
      }}
    >
      {options.map(opt => (
        <div key={opt.id} role="option" aria-selected={opt.id === selected}>
          {opt.label}
        </div>
      ))}
    </div>
  );
}
\`\`\`

## ARIA 속성

\`\`\`tsx
// 모달
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm Delete</h2>
</div>

// 로딩 상태
<button aria-busy={loading} aria-disabled={loading}>
  {loading ? "Saving..." : "Save"}
</button>

// 알림
<div role="alert" aria-live="polite">
  {message}
</div>
\`\`\`

## 색상 대비

WCAG AA 기준:
- 일반 텍스트: 4.5:1 이상
- 큰 텍스트 (18px+ bold 또는 24px+): 3:1 이상
- UI 컴포넌트: 3:1 이상

\`\`\`css
/* 나쁜 예: 대비율 2.5:1 */
.muted { color: #aaa; background: #fff; }

/* 좋은 예: 대비율 4.6:1 */
.muted { color: #767676; background: #fff; }
\`\`\`

## 체크리스트 요약

- [ ] 시맨틱 HTML 태그 사용 (header, nav, main, footer)
- [ ] 이미지에 alt 텍스트
- [ ] 폼 요소에 label 연결
- [ ] 키보드로 모든 기능 사용 가능
- [ ] focus-visible 스타일
- [ ] 색상 대비 4.5:1 이상
- [ ] ARIA role, state, property 적절히 사용
- [ ] 페이지 제목(title)이 고유하고 설명적
- [ ] 에러 메시지가 명확하고 해결 방법 제시`,
    excerpt: "시맨틱 HTML, 키보드 네비게이션, ARIA, 색상 대비 등 실전 웹 접근성 체크리스트.",
    cover_image: "",
    tags: ["Design", "CSS", "React"],
    published: true,
    language: "ko" as const,
    view_count: 267,
    created_at: new Date(Date.now() - 39 * 86400000).toISOString(),
  },
  {
    title: "React Hook Form 패턴",
    slug: "react-hook-form-patterns",
    content_type: "markdown" as const,
    content: `# React Hook Form 패턴

React Hook Form은 비제어 컴포넌트 방식으로 폼 성능을 극대화합니다.

## 기본 사용법

\`\`\`tsx
import { useForm } from "react-hook-form";

interface FormData {
  email: string;
  password: string;
}

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    await login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("email", {
          required: "이메일을 입력하세요",
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i,
            message: "유효한 이메일을 입력하세요",
          },
        })}
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input
        type="password"
        {...register("password", {
          required: "비밀번호를 입력하세요",
          minLength: { value: 8, message: "8자 이상 입력하세요" },
        })}
      />
      {errors.password && <span>{errors.password.message}</span>}

      <button disabled={isSubmitting}>
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
\`\`\`

## Zod 연동

\`\`\`typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1, "제목을 입력하세요"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "소문자, 숫자, 하이픈만"),
  content: z.string().min(10, "10자 이상 작성하세요"),
  tags: z.array(z.string()).max(5, "태그는 5개까지"),
});

type PostForm = z.infer<typeof schema>;

function PostEditor() {
  const { register, handleSubmit } = useForm<PostForm>({
    resolver: zodResolver(schema),
  });
}
\`\`\`

## 동적 필드 배열

\`\`\`tsx
import { useFieldArray } from "react-hook-form";

function SkillsForm() {
  const { control, register } = useForm({
    defaultValues: { skills: [{ name: "" }] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "skills",
  });

  return (
    <>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(\`skills.\${index}.name\`)} />
          <button type="button" onClick={() => remove(index)}>삭제</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: "" })}>
        스킬 추가
      </button>
    </>
  );
}
\`\`\`

## 왜 리렌더가 적을까?

React Hook Form은 \`ref\`로 DOM에 직접 접근합니다. \`useState\`로 매 입력마다 상태를 업데이트하는 제어 컴포넌트와 달리, 입력값 변경 시 리렌더가 발생하지 않습니다. 유효성 검사와 에러 표시 시에만 리렌더됩니다.`,
    excerpt: "React Hook Form의 기본 사용법, Zod 연동, 동적 필드, 성능 원리를 정리합니다.",
    cover_image: "",
    tags: ["React", "TypeScript"],
    published: true,
    language: "ko" as const,
    view_count: 198,
    created_at: new Date(Date.now() - 36 * 86400000).toISOString(),
  },
  {
    title: "Edge Functions으로 API 최적화",
    slug: "edge-functions-api-optimization",
    content_type: "markdown" as const,
    content: `# Edge Functions으로 API 최적화

Edge Functions는 사용자와 가장 가까운 서버에서 실행됩니다. API 응답 시간을 대폭 줄일 수 있습니다.

## Supabase Edge Functions

\`\`\`typescript
// supabase/functions/og-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  const { title, description } = await req.json();

  // OG 이미지 생성 로직
  const svg = \`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0a0a"/>
      <text x="60" y="280" fill="#fff" font-size="48">
        \${title}
      </text>
      <text x="60" y="340" fill="#999" font-size="24">
        \${description}
      </text>
    </svg>
  \`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
});
\`\`\`

## Vercel Edge Functions

\`\`\`typescript
// app/api/location/route.ts
export const runtime = "edge";

export function GET(request: Request) {
  const country = request.headers.get("x-vercel-ip-country");
  const city = request.headers.get("x-vercel-ip-city");

  return Response.json(
    { country, city, timestamp: Date.now() },
    {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
\`\`\`

## 캐싱 전략

\`\`\`typescript
// 1. 정적 데이터: 오래 캐시
headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" }

// 2. 준실시간: stale-while-revalidate
headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=3600" }

// 3. 개인화 데이터: 캐시 안 함
headers: { "Cache-Control": "private, no-store" }
\`\`\`

## 실전 사례: 조회수 카운터

\`\`\`typescript
export const runtime = "edge";

export async function POST(request: Request) {
  const { slug } = await request.json();

  // KV 또는 DB에 조회수 증가
  const { data } = await supabase.rpc("increment_view", { post_slug: slug });

  return Response.json({ views: data });
}
\`\`\`

Edge에서 실행되므로 전 세계 어디서든 빠른 응답이 가능합니다. 다만 DB 연결은 여전히 DB 서버 위치에 의존하므로, DB 리전과 가까운 Edge 리전에서 가장 효과적입니다.`,
    excerpt: "Supabase/Vercel Edge Functions의 사용법과 캐싱 전략, 실전 최적화 사례를 다룹니다.",
    cover_image: "",
    tags: ["Supabase", "Next.js", "Performance"],
    published: true,
    language: "ko" as const,
    view_count: 134,
    created_at: new Date(Date.now() - 33 * 86400000).toISOString(),
  },
  {
    title: "CSS Scroll-Driven Animations",
    slug: "css-scroll-driven-animations",
    content_type: "markdown" as const,
    content: `# CSS Scroll-Driven Animations

JavaScript 없이 CSS만으로 스크롤 연동 애니메이션을 만들 수 있습니다.

## 기본 개념

\`\`\`css
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
\`\`\`

이것만으로 카드가 뷰포트에 들어올 때 fade-in 됩니다!

## scroll() vs view()

\`\`\`css
/* scroll(): 스크롤 컨테이너의 전체 진행도 기준 */
.progress-bar {
  animation: grow linear;
  animation-timeline: scroll(root block);
}

@keyframes grow {
  from { scale: 0 1; }
  to { scale: 1 1; }
}

/* view(): 요소가 뷰포트에 보이는 정도 기준 */
.section {
  animation: fadeIn linear both;
  animation-timeline: view();
}
\`\`\`

## animation-range

뷰포트의 어디서부터 어디까지 애니메이션이 진행될지 지정합니다:

\`\`\`css
/* entry: 요소가 뷰포트에 진입하는 구간 */
animation-range: entry 0% entry 100%;

/* contain: 요소가 완전히 뷰포트 안에 있는 구간 */
animation-range: contain 0% contain 100%;

/* exit: 요소가 뷰포트를 벗어나는 구간 */
animation-range: exit 0% exit 100%;

/* 커스텀 범위 */
animation-range: entry 20% cover 60%;
\`\`\`

## 실전 예제: 패럴랙스

\`\`\`css
.parallax-bg {
  animation: parallax linear;
  animation-timeline: scroll();
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(-200px); }
}
\`\`\`

## 프로그레스 바

\`\`\`css
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--color-accent);
  transform-origin: left;
  animation: progress linear;
  animation-timeline: scroll();
}

@keyframes progress {
  from { scale: 0 1; }
  to { scale: 1 1; }
}
\`\`\`

## 브라우저 지원

Chrome 115+, Edge 115+ 지원. Safari와 Firefox는 아직 미지원이므로 프로그레시브 인핸스먼트로 적용하세요:

\`\`\`css
@supports (animation-timeline: scroll()) {
  .card {
    animation: reveal linear both;
    animation-timeline: view();
  }
}
\`\`\``,
    excerpt: "CSS scroll()과 view() 타임라인으로 JavaScript 없이 스크롤 연동 애니메이션을 만드는 방법.",
    cover_image: "",
    tags: ["CSS", "Animation"],
    published: true,
    language: "ko" as const,
    view_count: 312,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    title: "모노레포 세팅 가이드 (Turborepo)",
    slug: "monorepo-turborepo-guide",
    content_type: "markdown" as const,
    content: `# 모노레포 세팅 가이드 (Turborepo)

여러 패키지를 하나의 레포에서 관리하는 모노레포 세팅을 Turborepo로 진행합니다.

## 초기 세팅

\`\`\`bash
npx create-turbo@latest my-monorepo
\`\`\`

생성되는 구조:

\`\`\`
my-monorepo/
├── apps/
│   ├── web/        # Next.js 앱
│   └── docs/       # 문서 사이트
├── packages/
│   ├── ui/         # 공유 UI 컴포넌트
│   ├── config/     # ESLint, TS config
│   └── utils/      # 공유 유틸리티
├── turbo.json
└── package.json
\`\`\`

## turbo.json 설정

\`\`\`json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
\`\`\`

\`dependsOn: ["^build"]\`는 의존하는 패키지를 먼저 빌드하라는 의미입니다.

## 공유 패키지 만들기

\`\`\`typescript
// packages/ui/src/Button.tsx
export function Button({ children, variant = "primary" }) {
  return <button className={\`btn btn-\${variant}\`}>{children}</button>;
}

// packages/ui/package.json
{
  "name": "@repo/ui",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
\`\`\`

앱에서 사용:

\`\`\`typescript
// apps/web/package.json
{ "dependencies": { "@repo/ui": "*" } }

// apps/web/src/app/page.tsx
import { Button } from "@repo/ui";
\`\`\`

## 캐싱

Turborepo의 핵심 장점은 **캐시**입니다. 코드가 변경되지 않은 패키지는 다시 빌드하지 않습니다:

\`\`\`bash
$ turbo build
• Packages in scope: @repo/ui, @repo/utils, web, docs
• Running build in 4 packages
• web:build: cache hit, replaying output
• docs:build: cache hit, replaying output
\`\`\`

## Remote Caching

팀원 간에 캐시를 공유할 수 있습니다:

\`\`\`bash
npx turbo login
npx turbo link
\`\`\`

CI에서도 로컬 빌드 캐시를 재활용하므로 빌드 시간이 크게 줄어듭니다.`,
    excerpt: "Turborepo로 모노레포를 세팅하고, 공유 패키지, 파이프라인, 캐싱을 설정하는 방법.",
    cover_image: "",
    tags: ["Node.js", "TypeScript"],
    published: true,
    language: "ko" as const,
    view_count: 178,
    created_at: new Date(Date.now() - 27 * 86400000).toISOString(),
  },
  {
    title: "Playwright E2E 테스트 전략",
    slug: "playwright-e2e-testing-strategy",
    content_type: "markdown" as const,
    content: `# Playwright E2E 테스트 전략

Playwright로 실제 사용자 시나리오를 테스트합니다.

## 설치와 설정

\`\`\`bash
npm init playwright@latest
\`\`\`

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
\`\`\`

## 기본 테스트 작성

\`\`\`typescript
// e2e/posts.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Posts", () => {
  test("should display post list", async ({ page }) => {
    await page.goto("/posts");
    await expect(page.getByRole("heading", { name: "Posts" })).toBeVisible();
    await expect(page.locator("[data-testid='post-card']")).toHaveCount(10);
  });

  test("should navigate to post detail", async ({ page }) => {
    await page.goto("/posts");
    await page.click("[data-testid='post-card']:first-child a");
    await expect(page).toHaveURL(/\\/posts\\/.+/);
    await expect(page.locator("article")).toBeVisible();
  });
});
\`\`\`

## 인증 테스트

\`\`\`typescript
// e2e/auth.setup.ts
import { test as setup, expect } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill("[name=email]", process.env.TEST_ADMIN_EMAIL!);
  await page.fill("[name=password]", process.env.TEST_ADMIN_PASSWORD!);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/admin/posts");

  // 인증 상태 저장
  await page.context().storageState({ path: ".auth/admin.json" });
});

// 인증된 상태로 테스트
test.describe("Admin", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("should create a post", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await page.fill("[name=title]", "Test Post");
    await page.click("text=Publish");
    await expect(page.locator(".status")).toHaveText(/published/i);
  });
});
\`\`\`

## Visual Regression

\`\`\`typescript
test("homepage visual", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("homepage.png", {
    maxDiffPixelRatio: 0.01,
  });
});
\`\`\`

## CI 통합

\`\`\`yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
\`\`\``,
    excerpt: "Playwright로 E2E 테스트를 작성하고, 인증 테스트, Visual Regression, CI 통합까지.",
    cover_image: "",
    tags: ["Testing", "TypeScript", "Node.js"],
    published: true,
    language: "ko" as const,
    view_count: 145,
    created_at: new Date(Date.now() - 24 * 86400000).toISOString(),
  },
  {
    title: "React Suspense 제대로 쓰기",
    slug: "react-suspense-properly",
    content_type: "markdown" as const,
    content: `# React Suspense 제대로 쓰기

Suspense는 비동기 작업의 로딩 상태를 선언적으로 처리합니다.

## 기본 사용법

\`\`\`tsx
import { Suspense } from "react";

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AsyncComponent />
    </Suspense>
  );
}
\`\`\`

## 서버 컴포넌트와 Suspense

Next.js에서 가장 강력한 조합:

\`\`\`tsx
// app/dashboard/page.tsx
async function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}

async function RevenueChart() {
  const data = await fetchRevenue(); // 2초
  return <Chart data={data} />;
}

async function RecentOrders() {
  const orders = await fetchOrders(); // 1초
  return <Table data={orders} />;
}
\`\`\`

이렇게 하면 RecentOrders가 1초 후 먼저 표시되고, RevenueChart는 2초 후에 표시됩니다. 각각 독립적으로 로딩됩니다.

## Streaming SSR

\`\`\`tsx
// loading.tsx — 자동 Suspense 경계
export default function Loading() {
  return <div className="skeleton">Loading...</div>;
}
\`\`\`

Next.js는 \`loading.tsx\`를 자동으로 Suspense boundary로 감싸줍니다.

## 중첩 Suspense

\`\`\`tsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<SidebarSkeleton />}>
    <Sidebar />
  </Suspense>
  <Suspense fallback={<ContentSkeleton />}>
    <Content />
  </Suspense>
</Suspense>
\`\`\`

외부 Suspense가 먼저 해결되면 Header가 표시되고, 내부 Suspense들은 독립적으로 로딩됩니다.

## ErrorBoundary와 함께

\`\`\`tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Skeleton />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>
\`\`\`

## 주의사항

1. **Suspense는 데이터 페칭 라이브러리와 통합해야 합니다** — 직접 Promise를 throw하지 마세요
2. **SSR에서 client-only 컴포넌트**는 Suspense로 감싸세요
3. **너무 세밀한 Suspense 경계**는 UX를 해칩니다 — 논리적 단위로 묶으세요`,
    excerpt: "React Suspense의 Server Components 통합, Streaming SSR, 중첩 패턴을 정리합니다.",
    cover_image: "",
    tags: ["React", "Next.js", "Performance"],
    published: true,
    language: "ko" as const,
    view_count: 234,
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
  },
  {
    title: "Design Token 자동화 파이프라인",
    slug: "design-token-automation-pipeline",
    content_type: "markdown" as const,
    content: `# Design Token 자동화 파이프라인

Figma에서 정의한 디자인 토큰을 코드로 자동 변환하는 파이프라인을 구축합니다.

## 토큰 구조

\`\`\`json
{
  "color": {
    "neutral": {
      "0": { "value": "#ffffff", "type": "color" },
      "50": { "value": "#fafafa", "type": "color" },
      "900": { "value": "#171717", "type": "color" },
      "950": { "value": "#0a0a0a", "type": "color" }
    },
    "accent": {
      "value": "#d40063",
      "type": "color"
    }
  },
  "spacing": {
    "xs": { "value": "4px", "type": "spacing" },
    "sm": { "value": "8px", "type": "spacing" },
    "md": { "value": "16px", "type": "spacing" }
  }
}
\`\`\`

## Style Dictionary

\`\`\`javascript
// style-dictionary.config.js
module.exports = {
  source: ["tokens/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "src/styles/tokens/",
      files: [
        {
          destination: "_colors.css",
          format: "css/variables",
          filter: { type: "color" },
        },
        {
          destination: "_spacing.css",
          format: "css/variables",
          filter: { type: "spacing" },
        },
      ],
    },
  },
};
\`\`\`

출력:

\`\`\`css
/* _colors.css */
:root {
  --color-neutral-0: #ffffff;
  --color-neutral-50: #fafafa;
  --color-neutral-900: #171717;
  --color-accent: #d40063;
}
\`\`\`

## Figma Plugin 연동

Figma Tokens Plugin에서 JSON을 GitHub에 직접 push할 수 있습니다:

1. Figma Tokens Plugin → JSON 토큰 정의
2. GitHub sync 설정 → \`tokens/\` 디렉토리에 자동 commit
3. GitHub Actions → Style Dictionary 빌드
4. 자동 PR 생성

\`\`\`yaml
# .github/workflows/tokens.yml
name: Build Design Tokens
on:
  push:
    paths: ["tokens/**"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx style-dictionary build
      - run: |
          git add src/styles/tokens/
          git commit -m "chore: rebuild design tokens"
          git push
\`\`\`

## Semantic Token 매핑

Raw token을 semantic token으로 매핑하는 추가 빌드 단계:

\`\`\`javascript
// transforms/semantic.js
module.exports = {
  name: "semantic/css",
  formatter: ({ dictionary }) => {
    const dark = dictionary.tokens.semantic.dark;
    const light = dictionary.tokens.semantic.light;

    return \`
[data-theme="dark"] {
  --text-primary: var(--color-neutral-\${dark.textPrimary.value});
  --bg-primary: var(--color-neutral-\${dark.bgPrimary.value});
}

[data-theme="light"] {
  --text-primary: var(--color-neutral-\${light.textPrimary.value});
  --bg-primary: var(--color-neutral-\${light.bgPrimary.value});
}
    \`;
  },
};
\`\`\`

디자이너가 Figma에서 토큰을 변경하면 코드에 자동으로 반영됩니다.`,
    excerpt: "Figma → Style Dictionary → CSS Variables 자동 변환 파이프라인 구축 가이드.",
    cover_image: "",
    tags: ["Design", "CSS", "Node.js"],
    published: true,
    language: "ko" as const,
    view_count: 167,
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
  {
    title: "Optimistic Updates 구현하기",
    slug: "optimistic-updates-implementation",
    content_type: "markdown" as const,
    content: `# Optimistic Updates 구현하기

서버 응답을 기다리지 않고 UI를 먼저 업데이트하면 체감 속도가 크게 향상됩니다.

## 기본 원리

1. 사용자가 액션을 수행 (좋아요 클릭)
2. UI를 즉시 업데이트 (좋아요 +1)
3. 백그라운드에서 서버에 요청
4. 실패 시 원래 상태로 롤백

## React에서 구현

\`\`\`tsx
function LikeButton({ postId, initialCount }: {
  postId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    // 1. 낙관적 업데이트
    const prevCount = count;
    const prevLiked = liked;
    setCount(c => c + (liked ? -1 : 1));
    setLiked(!liked);

    try {
      // 2. 서버 요청
      await fetch(\`/api/posts/\${postId}/like\`, {
        method: liked ? "DELETE" : "POST",
      });
    } catch {
      // 3. 실패 시 롤백
      setCount(prevCount);
      setLiked(prevLiked);
    }
  };

  return (
    <button onClick={handleLike}>
      {liked ? "♥" : "♡"} {count}
    </button>
  );
}
\`\`\`

## React 19 useOptimistic

\`\`\`tsx
function CommentList({ comments }: { comments: Comment[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    comments,
    (state, newComment: Comment) => [...state, newComment]
  );

  async function addComment(formData: FormData) {
    const text = formData.get("text") as string;
    const temp: Comment = {
      id: "temp-" + Date.now(),
      text,
      pending: true,
    };

    addOptimistic(temp);
    await createComment(text);
  }

  return (
    <>
      {optimistic.map(c => (
        <div key={c.id} style={{ opacity: c.pending ? 0.5 : 1 }}>
          {c.text}
        </div>
      ))}
      <form action={addComment}>
        <input name="text" />
        <button>Add</button>
      </form>
    </>
  );
}
\`\`\`

## 리스트 항목 삭제

\`\`\`tsx
function TodoList({ todos }: { todos: Todo[] }) {
  const [items, setItems] = useState(todos);

  const handleDelete = async (id: string) => {
    const prev = items;
    // 즉시 제거
    setItems(items.filter(t => t.id !== id));

    try {
      const res = await fetch(\`/api/todos/\${id}\`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      // 롤백
      setItems(prev);
      toast.error("삭제에 실패했습니다");
    }
  };
}
\`\`\`

## 주의사항

- **ID 생성**: 서버에서 UUID를 생성하는 경우, 임시 ID를 사용하고 서버 응답 후 교체
- **순서**: 서버 응답 순서가 보장되지 않으므로 race condition 주의
- **에러 처리**: 롤백 시 사용자에게 왜 실패했는지 알려주세요
- **중복 방지**: 버튼을 빠르게 여러 번 클릭하는 경우 debounce 필요`,
    excerpt: "Optimistic Updates의 기본 원리부터 React 19 useOptimistic, 롤백 패턴까지.",
    cover_image: "",
    tags: ["React", "Performance", "TypeScript"],
    published: true,
    language: "ko" as const,
    view_count: 189,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    title: "SVG Animation with GSAP",
    slug: "svg-animation-gsap",
    content_type: "markdown" as const,
    content: `# SVG Animation with GSAP

GSAP makes SVG animation straightforward. Here's how to create engaging path animations, morphing effects, and scroll-triggered SVG reveals.

## Path Drawing

The classic "draw on scroll" effect:

\`\`\`typescript
import gsap from "gsap";

const path = document.querySelector(".line-path") as SVGPathElement;
const length = path.getTotalLength();

// Initial state: invisible
gsap.set(path, {
  strokeDasharray: length,
  strokeDashoffset: length,
});

// Animate: draw the path
gsap.to(path, {
  strokeDashoffset: 0,
  duration: 2,
  ease: "power2.inOut",
  scrollTrigger: {
    trigger: path,
    start: "top 80%",
    end: "bottom 20%",
    scrub: 1,
  },
});
\`\`\`

## Text Along Path

\`\`\`html
<svg viewBox="0 0 500 200">
  <defs>
    <path id="curve" d="M 50 150 Q 250 0 450 150" fill="none" />
  </defs>
  <text>
    <textPath href="#curve" id="text-on-path">
      This text follows a curved path
    </textPath>
  </text>
</svg>
\`\`\`

\`\`\`typescript
gsap.from("#text-on-path", {
  attr: { startOffset: "-100%" },
  duration: 3,
  ease: "power1.out",
  scrollTrigger: {
    trigger: "svg",
    scrub: true,
  },
});
\`\`\`

## Morphing with MorphSVG

\`\`\`typescript
// GSAP MorphSVG plugin (Club GreenSock)
gsap.to("#circle", {
  morphSVG: "#star",
  duration: 1,
  ease: "elastic.out(1, 0.5)",
});
\`\`\`

## Stagger SVG Elements

\`\`\`typescript
gsap.from(".bar", {
  scaleY: 0,
  transformOrigin: "bottom",
  stagger: {
    each: 0.1,
    from: "center",
  },
  duration: 0.8,
  ease: "back.out(1.7)",
  scrollTrigger: {
    trigger: ".chart",
    start: "top 70%",
  },
});
\`\`\`

## Performance Tips

- Use \`will-change: transform\` sparingly on SVG elements
- Prefer \`transform\` over changing \`x\`, \`y\`, \`width\`, \`height\` attributes
- For complex SVGs, consider using \`<use>\` elements to reduce DOM nodes
- Disable animations on \`prefers-reduced-motion\`:

\`\`\`typescript
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
if (prefersReduced.matches) {
  gsap.globalTimeline.timeScale(0);
}
\`\`\``,
    excerpt: "GSAP으로 SVG path drawing, text along path, morphing, stagger 애니메이션을 구현하는 방법.",
    cover_image: "",
    tags: ["Animation", "GSAP", "CSS"],
    published: true,
    language: "en" as const,
    view_count: 256,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    title: "Next.js App Router 마이그레이션",
    slug: "nextjs-app-router-migration",
    content_type: "markdown" as const,
    content: `# Next.js App Router 마이그레이션

Pages Router에서 App Router로 마이그레이션한 경험을 공유합니다.

## 디렉토리 구조 변경

\`\`\`
# Pages Router
pages/
├── index.tsx           → app/page.tsx
├── about.tsx           → app/about/page.tsx
├── posts/[slug].tsx    → app/posts/[slug]/page.tsx
├── _app.tsx            → app/layout.tsx
├── _document.tsx       → (불필요)
└── api/hello.ts        → app/api/hello/route.ts
\`\`\`

## 레이아웃 변경

\`\`\`tsx
// Before: _app.tsx
function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <Navigation />
      <Component {...pageProps} />
      <Footer />
    </ThemeProvider>
  );
}

// After: app/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <ThemeProvider>
          <Navigation />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
\`\`\`

## 데이터 페칭 변경

\`\`\`tsx
// Before: getServerSideProps
export async function getServerSideProps() {
  const posts = await fetchPosts();
  return { props: { posts } };
}

function PostsPage({ posts }) {
  return <PostList posts={posts} />;
}

// After: Server Component
async function PostsPage() {
  const posts = await fetchPosts(); // 직접 호출
  return <PostList posts={posts} />;
}
\`\`\`

## API Routes 변경

\`\`\`typescript
// Before: pages/api/posts.ts
export default function handler(req, res) {
  if (req.method === "GET") {
    res.json({ posts: [] });
  }
}

// After: app/api/posts/route.ts
export async function GET() {
  return Response.json({ posts: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ created: true });
}
\`\`\`

## Metadata 변경

\`\`\`tsx
// Before: Head 컴포넌트
import Head from "next/head";

function PostPage({ post }) {
  return (
    <>
      <Head>
        <title>{post.title}</title>
        <meta name="description" content={post.excerpt} />
      </Head>
      <article>{post.content}</article>
    </>
  );
}

// After: generateMetadata
export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, images: [post.cover] },
  };
}
\`\`\`

## 주의사항

- \`useRouter\`가 \`next/router\`에서 \`next/navigation\`으로 변경
- \`router.query\` 대신 \`useParams()\`, \`useSearchParams()\` 사용
- \`getStaticPaths\` → \`generateStaticParams\`
- Client Component에서만 \`useState\`, \`useEffect\` 사용 가능`,
    excerpt: "Pages Router에서 App Router로의 마이그레이션 과정과 주요 변경점을 정리합니다.",
    cover_image: "",
    tags: ["Next.js", "React"],
    published: true,
    language: "ko" as const,
    view_count: 298,
    created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
  {
    title: "Supabase Realtime 채팅 구현",
    slug: "supabase-realtime-chat",
    content_type: "markdown" as const,
    content: `# Supabase Realtime 채팅 구현

Supabase의 Realtime 기능으로 실시간 채팅을 구현합니다.

## 테이블 설정

\`\`\`sql
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: 누구나 읽기/쓰기 가능
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access" ON messages
  FOR ALL USING (true) WITH CHECK (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
\`\`\`

## 실시간 구독

\`\`\`typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  room_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export function useMessages(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // 초기 로드
    supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data ?? []));

    // 실시간 구독
    const channel = supabase
      .channel(\`room:\${roomId}\`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: \`room_id=eq.\${roomId}\`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  return messages;
}
\`\`\`

## 메시지 전송

\`\`\`typescript
async function sendMessage(roomId: string, userName: string, content: string) {
  const supabase = createClient();
  const { error } = await supabase.from("messages").insert({
    room_id: roomId,
    user_name: userName,
    content,
  });
  if (error) throw error;
}
\`\`\`

## Presence (온라인 사용자)

\`\`\`typescript
function usePresence(roomId: string, userName: string) {
  const [users, setUsers] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel(\`presence:\${roomId}\`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const names = Object.values(state)
          .flat()
          .map((p: any) => p.user_name);
        setUsers(names);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_name: userName });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userName, supabase]);

  return users;
}
\`\`\`

## Typing Indicator

\`\`\`typescript
// Broadcast로 타이핑 상태 공유
channel.send({
  type: "broadcast",
  event: "typing",
  payload: { user_name: userName },
});

channel.on("broadcast", { event: "typing" }, ({ payload }) => {
  setTypingUsers(prev => [...new Set([...prev, payload.user_name])]);
  // 3초 후 자동 제거
  setTimeout(() => {
    setTypingUsers(prev => prev.filter(u => u !== payload.user_name));
  }, 3000);
});
\`\`\``,
    excerpt: "Supabase Realtime으로 실시간 채팅, Presence(온라인 사용자), Typing Indicator를 구현합니다.",
    cover_image: "",
    tags: ["Supabase", "React", "TypeScript"],
    published: true,
    language: "ko" as const,
    view_count: 356,
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    title: "CSS Nesting 브라우저 지원 현황",
    slug: "css-nesting-browser-support",
    content_type: "markdown" as const,
    content: `# CSS Nesting 브라우저 지원 현황

SCSS 없이도 네이티브 CSS에서 중첩 문법을 사용할 수 있게 되었습니다.

## 기본 문법

\`\`\`css
/* Before: 반복적인 셀렉터 */
.card { background: white; }
.card .title { font-size: 1.5rem; }
.card .title:hover { color: blue; }
.card .body { padding: 1rem; }

/* After: CSS Nesting */
.card {
  background: white;

  .title {
    font-size: 1.5rem;

    &:hover {
      color: blue;
    }
  }

  .body {
    padding: 1rem;
  }
}
\`\`\`

## & 셀렉터

\`\`\`css
.button {
  background: transparent;

  /* &는 부모 셀렉터를 참조 */
  &:hover {
    background: var(--bg-tertiary);
  }

  &:disabled {
    opacity: 0.5;
  }

  /* 복합 셀렉터 */
  &.primary {
    background: var(--text-primary);
    color: var(--bg-primary);
  }

  /* 부모 참조 위치 변경 */
  .dark & {
    border-color: #333;
  }
}
\`\`\`

## 미디어 쿼리 중첩

\`\`\`css
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}
\`\`\`

## 브라우저 지원 (2025년 기준)

| 브라우저 | 지원 버전 | 출시일 |
|---------|----------|--------|
| Chrome | 120+ | 2023.12 |
| Safari | 17.2+ | 2023.12 |
| Firefox | 117+ | 2023.08 |
| Edge | 120+ | 2023.12 |

**모든 주요 브라우저에서 지원됩니다.** 프로덕션에서 안전하게 사용할 수 있습니다.

## SCSS와의 차이

\`\`\`scss
// SCSS: 어떤 셀렉터든 직접 중첩 가능
.card {
  h2 { color: red; }    // OK in SCSS
  p { margin: 0; }      // OK in SCSS
}

// CSS Nesting: 요소 셀렉터는 & 필요 (relaxed syntax는 불필요)
.card {
  h2 { color: red; }    // Chrome 120+에서 OK (relaxed)
  & h2 { color: red; }  // 모든 지원 브라우저에서 OK
}
\`\`\`

## CSS Modules와 함께

CSS Modules에서도 네이티브 중첩을 사용할 수 있습니다:

\`\`\`css
/* Button.module.css */
.button {
  padding: 8px 24px;

  &:hover {
    background: var(--bg-tertiary);
  }

  &.large {
    padding: 12px 32px;
  }
}
\`\`\`

PostCSS의 \`postcss-nesting\` 플러그인 없이도 동작합니다.`,
    excerpt: "네이티브 CSS Nesting 문법, & 셀렉터, 미디어 쿼리 중첩, 브라우저 지원 현황을 정리합니다.",
    cover_image: "",
    tags: ["CSS", "Design"],
    published: true,
    language: "ko" as const,
    view_count: 211,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

async function seed() {
  console.log("Seeding posts...\n");

  for (const post of posts) {
    const { data, error } = await supabase
      .from("posts")
      .insert(post)
      .select("id, title, slug")
      .single();

    if (error) {
      if (error.code === "23505") {
        console.log(`  skip  "${post.title}" — already exists`);
      } else {
        console.error(`  fail  "${post.title}" — ${error.message}`);
      }
    } else {
      console.log(`  ok    "${data.title}" → /posts/${data.slug}`);
    }
  }

  console.log(`\nDone! Total attempted: ${posts.length}`);
}

seed();

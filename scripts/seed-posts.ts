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
  // ── 1. 포트폴리오 제작기 ──
  {
    title: "이 포트폴리오를 만든 이유와 과정",
    title_en: "Why and How I Built This Portfolio",
    slug: "why-i-built-this-portfolio",
    content_type: "markdown" as const,
    content: `# 이 포트폴리오를 만든 이유와 과정

취준생 신분으로 포트폴리오를 만들기 시작했습니다. 기존에 Notion이나 PDF로 정리해둔 것도 있었지만, 직접 웹사이트를 만들어야 한다는 생각이 들었습니다.

## 왜 직접 만들었나

템플릿을 쓰면 빠르지만, **"이 사람이 실제로 뭘 할 수 있는지"**를 보여주기 어렵습니다. 프론트엔드 개발자라면 결국 만든 사이트 자체가 실력 증명이 되어야 한다고 생각했습니다.

## 기술 스택 선택

\`\`\`
Next.js 15 (App Router)
TypeScript
CSS Modules + 디자인 토큰
GSAP + Framer Motion
Supabase (DB + Auth + Storage)
\`\`\`

React 기반이면서 SSR/ISR을 지원하는 Next.js를 선택했고, 애니메이션은 GSAP과 Framer Motion을 병행했습니다. CSS-in-JS 대신 CSS Modules를 선택한 이유는 런타임 비용이 없고, 디자인 토큰과 궁합이 좋아서입니다.

## 가장 어려웠던 부분

솔직히 **디자인**이 제일 어려웠습니다. 코드는 구글링하면 답이 나오는데, "이 레이아웃이 예쁜가?"는 정답이 없으니까요. Awwwards랑 Dribbble을 수백 개 봤습니다.

그 다음으로는 **성능 최적화**. 애니메이션을 많이 넣다 보니 Lighthouse 점수가 60점대까지 떨어졌는데, 폰트 정리와 lazy loading으로 98점까지 올렸습니다.

## 배운 것

- 완벽한 코드보다 **완성된 프로젝트**가 중요하다
- 디자인 시스템을 먼저 잡으면 나중에 편하다
- 성능 최적화는 마지막이 아니라 **중간중간** 해야 한다

다음 글에서는 이 사이트의 무한 스크롤 구현 과정을 자세히 다루겠습니다.`,
    content_en: `# Why and How I Built This Portfolio

I started building this portfolio as a job seeker. I already had a Notion page and PDF resume, but I felt I needed to make an actual website.

## Why Build From Scratch

Templates are fast but they don't show **"what this person can actually do."** As a frontend developer, the site itself should be proof of skill.

## Tech Stack Choice

\`\`\`
Next.js 15 (App Router)
TypeScript
CSS Modules + Design Tokens
GSAP + Framer Motion
Supabase (DB + Auth + Storage)
\`\`\`

I chose Next.js for its SSR/ISR support with React, and used both GSAP and Framer Motion for animations. I went with CSS Modules over CSS-in-JS for zero runtime cost and great compatibility with design tokens.

## The Hardest Part

Honestly, **design** was the hardest. Code has answers on Google, but "does this layout look good?" has no right answer. I looked at hundreds of sites on Awwwards and Dribbble.

Next was **performance optimization**. With all the animations, Lighthouse dropped to 60. After font cleanup and lazy loading, I got it back to 98.

## What I Learned

- A **finished project** beats perfect code
- Setting up a design system early pays off later
- Performance optimization should happen **throughout**, not just at the end

In the next post, I'll dive into how I implemented the infinite scroll on this site.`,
    excerpt: "취준생이 포트폴리오 사이트를 직접 만든 이유, 기술 스택 선택, 어려웠던 점과 배운 것들.",
    excerpt_en: "Why I built my portfolio from scratch as a job seeker, tech stack decisions, challenges, and lessons learned.",
    cover_image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
    tags: ["Portfolio", "Next.js", "회고"],
    published: true,
    language: "ko" as const,
    view_count: 342,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },

  // ── 2. Lenis 무한 스크롤 ──
  {
    title: "Lenis로 무한 스크롤 루프 만들기",
    title_en: "Building an Infinite Scroll Loop with Lenis",
    slug: "infinite-scroll-loop-lenis",
    content_type: "markdown" as const,
    content: `# Lenis로 무한 스크롤 루프 만들기

이 포트폴리오에서 가장 만족스러운 인터랙션 중 하나가 무한 스크롤입니다. 페이지 끝까지 내리면 다시 처음으로 돌아가는데, 사용자가 눈치채지 못할 정도로 자연스럽습니다.

## Bridge Section 기법

핵심은 **마지막에 첫 섹션의 복제본을 놓는 것**입니다. Lenis가 스크롤 위치를 되감을 때, 시각적으로 동일한 콘텐츠가 보이기 때문에 이음새가 없습니다.

\`\`\`tsx
// 홈페이지 구조
<HeroSection />
<ProfileSection />
<ServicesSection />
<WorksSection />
<CTASection />
<BridgeSection /> {/* Hero 복제 → 무한 루프의 이음새 */}
\`\`\`

## Lenis 설정

\`\`\`typescript
const lenis = new Lenis({
  infinite: true,
  duration: 1.2,
  easing: (t) => 1 - Math.pow(2, -10 * t), // expo ease out
});
\`\`\`

\`infinite: true\` 한 줄이면 Lenis가 알아서 스크롤 위치를 래핑합니다.

## 주의할 점

- 모바일에서 터치 스크롤 관성이 다르므로 반드시 테스트
- \`will-change: transform\` 남용하면 모바일에서 메모리 이슈
- GSAP ScrollTrigger와 연동할 때는 \`ScrollTrigger.update\`를 Lenis scroll 이벤트에 바인딩

결과적으로 끝없이 돌아가는 스크롤 경험을 만들었습니다.`,
    content_en: `# Building an Infinite Scroll Loop with Lenis

One of the most satisfying interactions on this portfolio is the infinite scroll. When you reach the bottom, it loops back to the top so seamlessly that users don't even notice.

## Bridge Section Technique

The key is placing **a duplicate of the first section at the end**. When Lenis rewinds the scroll position, the user sees identical content, making the seam invisible.

\`\`\`tsx
// Home page structure
<HeroSection />
<ProfileSection />
<ServicesSection />
<WorksSection />
<CTASection />
<BridgeSection /> {/* Hero duplicate → seamless loop */}
\`\`\`

## Lenis Configuration

\`\`\`typescript
const lenis = new Lenis({
  infinite: true,
  duration: 1.2,
  easing: (t) => 1 - Math.pow(2, -10 * t), // expo ease out
});
\`\`\`

Just \`infinite: true\` and Lenis handles the scroll position wrapping.

## Watch Out For

- Touch scroll inertia differs on mobile — always test
- Overusing \`will-change: transform\` causes memory issues on mobile
- When integrating with GSAP ScrollTrigger, bind \`ScrollTrigger.update\` to the Lenis scroll event

The result is an endlessly looping scroll experience.`,
    excerpt: "Lenis smooth scroll과 Bridge Section을 활용한 무한 스크롤 루프 구현 과정.",
    excerpt_en: "How I implemented seamless infinite scrolling using Lenis and the Bridge Section technique.",
    cover_image: "https://images.unsplash.com/photo-1663856542282-bf5647286f63?w=800&q=80",
    tags: ["Lenis", "Scroll", "Animation"],
    published: true,
    language: "ko" as const,
    view_count: 287,
    created_at: new Date(Date.now() - 27 * 86400000).toISOString(),
  },

  // ── 3. GSAP 가로 스크롤 갤러리 ──
  {
    title: "Works 페이지 가로 스크롤 갤러리 구현기",
    title_en: "Building the Works Page Horizontal Scroll Gallery",
    slug: "horizontal-scroll-gallery",
    content_type: "markdown" as const,
    content: `# Works 페이지 가로 스크롤 갤러리 구현기

Works 페이지는 이 포트폴리오에서 제일 고민을 많이 한 페이지입니다. 일반적인 그리드 레이아웃 대신 가로 스크롤 갤러리를 선택한 이유와 구현 과정을 공유합니다.

## 왜 가로 스크롤?

작품을 시간순이 아니라 **시각적 임팩트** 순으로 보여주고 싶었습니다. 미술관에서 그림을 감상하듯 한 작품씩 시선이 옮겨가는 경험을 만들고 싶었습니다.

## rAF 기반 자체 구현

처음에는 GSAP ScrollTrigger의 \`pin + scrub\`을 썼는데, 커스텀 마우스 반응이 어려워서 직접 requestAnimationFrame 루프로 구현했습니다.

\`\`\`typescript
const animate = () => {
  scrollX += (targetScrollX - scrollX) * SCROLL_LERP;
  velocity = scrollX - prevScrollX;

  // 무한 래핑
  if (infiniteScroll && oneSetWidth > 0) {
    while (scrollX > oneSetWidth * 3) {
      scrollX -= oneSetWidth;
      targetScrollX -= oneSetWidth;
    }
  }

  gsap.set(slider, { x: initialX - scrollX });
  rafId = requestAnimationFrame(animate);
};
\`\`\`

## 마우스 반응형 카드 효과

카드가 마우스 위치에 따라 미세하게 움직이는 효과도 넣었습니다. 마우스 속도에 비례해서 카드가 기울어지고, 이미지에는 패럴랙스가 적용됩니다.

## 모바일 대응

데스크탑과 완전히 다른 UX를 제공합니다. 모바일(≤768px)에서는 세로 스택으로 전환하고, IntersectionObserver로 진입 애니메이션을 처리합니다.

삽질을 많이 했지만, 결과적으로 가장 만족스러운 페이지가 되었습니다.`,
    content_en: `# Building the Works Page Horizontal Scroll Gallery

The Works page is where I spent the most time in this portfolio. I'll share why I chose a horizontal scroll gallery over a typical grid layout, and how I built it.

## Why Horizontal Scroll?

I wanted to present works by **visual impact**, not chronologically. Like walking through a gallery, I wanted the viewer's attention to move from one piece to the next.

## Custom rAF Implementation

I initially used GSAP ScrollTrigger's \`pin + scrub\`, but custom mouse interactions were difficult, so I built my own requestAnimationFrame loop.

\`\`\`typescript
const animate = () => {
  scrollX += (targetScrollX - scrollX) * SCROLL_LERP;
  velocity = scrollX - prevScrollX;

  // Infinite wrapping
  if (infiniteScroll && oneSetWidth > 0) {
    while (scrollX > oneSetWidth * 3) {
      scrollX -= oneSetWidth;
      targetScrollX -= oneSetWidth;
    }
  }

  gsap.set(slider, { x: initialX - scrollX });
  rafId = requestAnimationFrame(animate);
};
\`\`\`

## Mouse-Reactive Card Effects

Cards subtly shift based on mouse position. They tilt proportionally to mouse velocity, and images have parallax applied.

## Mobile Adaptation

Completely different UX on mobile. Below 768px, it switches to a vertical stack with IntersectionObserver-based entry animations.

Lots of trial and error, but it ended up being the page I'm most proud of.`,
    excerpt: "가로 스크롤 갤러리를 rAF로 직접 구현한 과정. 마우스 반응, 무한 래핑, 모바일 대응까지.",
    excerpt_en: "How I built a custom horizontal scroll gallery with rAF, mouse interactions, infinite wrapping, and mobile fallback.",
    cover_image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
    tags: ["GSAP", "Animation", "Gallery"],
    published: true,
    language: "ko" as const,
    view_count: 195,
    created_at: new Date(Date.now() - 24 * 86400000).toISOString(),
  },

  // ── 4. 디자인 토큰 시스템 ──
  {
    title: "CSS 변수로 3-Layer 디자인 토큰 시스템 만들기",
    title_en: "Building a 3-Layer Design Token System with CSS Variables",
    slug: "css-design-token-system",
    content_type: "markdown" as const,
    content: `# CSS 변수로 3-Layer 디자인 토큰 시스템 만들기

디자인 시스템 없이 컴포넌트를 만들다 보면, 어느 순간 비슷한 색상값이 20군데에 흩어져 있는 자신을 발견합니다. 이 포트폴리오에서 적용한 3계층 토큰 시스템을 소개합니다.

## 3계층 구조

**Layer 1 — Raw Tokens** (원시값)
\`\`\`css
:root {
  --color-neutral-50: #f8f6f0;
  --color-neutral-900: #212529;
  --color-accent: #d40063;
}
\`\`\`

**Layer 2 — Semantic Tokens** (의미 부여)
\`\`\`css
:root {
  --text-primary: var(--color-neutral-900);
  --bg-primary: var(--color-neutral-50);
  --bg-accent-solid: var(--color-accent);
}
\`\`\`

**Layer 3 — Context Tokens** (컴포넌트 범위)
\`\`\`css
.card {
  --_card-bg: var(--bg-primary);
  --_card-border: var(--border-tertiary-color);
  background: var(--_card-bg);
  border: 1px solid var(--_card-border);
}
\`\`\`

## 다크 모드는 Layer 1만 바꾸면 된다

\`\`\`css
[data-theme="dark"] {
  --color-neutral-50: #1d1d1f;
  --color-neutral-900: #e9ecef;
  --color-accent: #ff4da6;
}
\`\`\`

Semantic → Context 토큰은 그대로이므로, **\`data-theme\` 속성만 바꾸면 전체 테마가 전환**됩니다.

## 실수했던 것

1. 컴포넌트 CSS에 \`#f5f5f0\` 같은 하드코딩 — 토큰 안 거치면 나중에 수정 불가
2. \`var(--color-accent, #d01046)\` 같은 fallback — 토큰이 없으면 빌드 시 알아채야 하는데 fallback이 숨겨버림
3. 글로벌 transition 규칙 특이성 문제 — \`(0,1,1)\` vs \`(0,1,0)\`로 컴포넌트 transition이 씹힘

이런 삽질을 통해 규칙을 정했고, 지금은 새 컴포넌트를 만들 때 색상 고민 없이 토큰만 조합하면 됩니다.`,
    content_en: `# Building a 3-Layer Design Token System with CSS Variables

Without a design system, you eventually find the same color values scattered across 20 places. Here's the 3-layer token system I built for this portfolio.

## 3-Layer Structure

**Layer 1 — Raw Tokens** (primitive values)
\`\`\`css
:root {
  --color-neutral-50: #f8f6f0;
  --color-neutral-900: #212529;
  --color-accent: #d40063;
}
\`\`\`

**Layer 2 — Semantic Tokens** (meaningful names)
\`\`\`css
:root {
  --text-primary: var(--color-neutral-900);
  --bg-primary: var(--color-neutral-50);
  --bg-accent-solid: var(--color-accent);
}
\`\`\`

**Layer 3 — Context Tokens** (component-scoped)
\`\`\`css
.card {
  --_card-bg: var(--bg-primary);
  --_card-border: var(--border-tertiary-color);
  background: var(--_card-bg);
  border: 1px solid var(--_card-border);
}
\`\`\`

## Dark Mode Just Swaps Layer 1

\`\`\`css
[data-theme="dark"] {
  --color-neutral-50: #1d1d1f;
  --color-neutral-900: #e9ecef;
  --color-accent: #ff4da6;
}
\`\`\`

Since Semantic → Context tokens stay the same, **just toggling \`data-theme\` switches the entire theme**.

## Mistakes I Made

1. Hardcoding \`#f5f5f0\` in component CSS — impossible to update later without tokens
2. Using fallbacks like \`var(--color-accent, #d01046)\` — hides missing tokens instead of catching them at build time
3. Global transition specificity \`(0,1,1)\` overriding component transitions at \`(0,1,0)\`

These mistakes led to clear rules, and now I just compose tokens when building new components without worrying about colors.`,
    excerpt: "Raw → Semantic → Context 3계층 CSS 토큰 시스템 설계와 다크 모드, 삽질 경험.",
    excerpt_en: "Designing a Raw → Semantic → Context 3-layer CSS token system, dark mode, and mistakes I made.",
    cover_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    tags: ["CSS", "Design System", "Tokens"],
    published: true,
    language: "ko" as const,
    view_count: 156,
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
  },

  // ── 5. Lighthouse 성능 최적화 ──
  {
    title: "Lighthouse 60점에서 98점까지: 모바일 성능 최적화 여정",
    title_en: "From Lighthouse 60 to 98: Mobile Performance Optimization Journey",
    slug: "lighthouse-performance-optimization",
    content_type: "markdown" as const,
    content: `# Lighthouse 60점에서 98점까지

애니메이션을 신나게 넣고 Lighthouse를 돌렸더니 모바일 Performance가 60점이었습니다. 충격받고 최적화를 시작했습니다.

## 원인 분석

1. **미사용 폰트 4개(12파일)** — Google Fonts에서 여러 웨이트를 불러왔는데 실제로 쓰는 건 절반
2. **reCAPTCHA 초기 로딩** — 페이지 로드 시 바로 불러와서 메인 스레드 블로킹
3. **font-display 미설정** — FOIT(Flash of Invisible Text) 발생

## 수정 과정

### 폰트 정리
\`\`\`tsx
// Before: 사용하지 않는 웨이트까지 전부 로드
const inter = Inter({ subsets: ["latin"], weight: ["100","200","300","400","500","600","700","800","900"] });

// After: 실제 사용하는 웨이트만
const inter = Inter({ subsets: ["latin"], weight: ["300","400","500","600","700"], display: "swap" });
\`\`\`

### reCAPTCHA 지연 로딩
Contact 폼이 열릴 때만 reCAPTCHA를 로드하도록 변경했습니다.

### 이미지 최적화
\`next/image\`의 \`sizes\` 속성을 정확하게 지정해서 불필요한 대용량 이미지 다운로드를 방지했습니다.

## 결과

| 항목 | Before | After |
|------|--------|-------|
| Performance | 60 | 98 |
| 페이지 용량 | 3.2MB | 980KB |
| LCP | 4.2s | 1.1s |

**교훈: 애니메이션이 많아도 성능은 지킬 수 있다.** 문제는 애니메이션이 아니라 불필요한 리소스였습니다.`,
    content_en: `# From Lighthouse 60 to 98

After happily adding animations everywhere, I ran Lighthouse and got 60 on mobile Performance. Shocked, I started optimizing.

## Root Causes

1. **4 unused fonts (12 files)** — loaded every weight from Google Fonts but only used half
2. **reCAPTCHA loading on page init** — blocked the main thread immediately
3. **No font-display** — caused FOIT (Flash of Invisible Text)

## Fixes

### Font Cleanup
\`\`\`tsx
// Before: loading every weight
const inter = Inter({ subsets: ["latin"], weight: ["100","200","300","400","500","600","700","800","900"] });

// After: only weights actually used
const inter = Inter({ subsets: ["latin"], weight: ["300","400","500","600","700"], display: "swap" });
\`\`\`

### Lazy Loading reCAPTCHA
Changed to only load reCAPTCHA when the Contact form opens.

### Image Optimization
Set accurate \`sizes\` on \`next/image\` to prevent downloading oversized images.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Performance | 60 | 98 |
| Page Size | 3.2MB | 980KB |
| LCP | 4.2s | 1.1s |

**Lesson: You can have lots of animations and still have great performance.** The problem was unnecessary resources, not the animations.`,
    excerpt: "포트폴리오 Lighthouse 성능을 60점에서 98점으로 올린 과정. 폰트 정리, lazy loading, 이미지 최적화.",
    excerpt_en: "How I improved my portfolio's Lighthouse score from 60 to 98 through font cleanup, lazy loading, and image optimization.",
    cover_image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    tags: ["Performance", "Lighthouse", "Optimization"],
    published: true,
    language: "ko" as const,
    view_count: 423,
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
  },

  // ── 6. Framer Motion 실전 팁 (영어) ──
  {
    title: "Framer Motion Patterns I Actually Use",
    title_en: "Framer Motion Patterns I Actually Use",
    slug: "framer-motion-practical-patterns",
    content_type: "markdown" as const,
    content: `# Framer Motion Patterns I Actually Use

After months of building this portfolio with Framer Motion, here are the patterns that actually stuck — not the fancy demos, but the stuff I reach for every time.

## 1. Layout Animations for Real UI

\`\`\`tsx
<motion.div layout layoutId="nav-indicator">
  {/* This moves smoothly between positions */}
</motion.div>
\`\`\`

I use this for the navigation active indicator. Instead of CSS transitions between positions, \`layoutId\` makes the indicator smoothly animate to wherever the active link is.

## 2. useTransform for Mouse Parallax

\`\`\`tsx
const mouseX = useMotionValue(0);
const floatX = useTransform(mouseX, [0, window.innerWidth], [-30, 30]);
const oval2X = useTransform(floatX, (v) => -v * 0.5);
\`\`\`

The hero section ovals follow the mouse with different speeds. \`useTransform\` chains let you create layered parallax without any state management.

## 3. AnimatePresence for Page Transitions

\`\`\`tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeIndex}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
  >
    {projects[activeIndex]?.title}
  </motion.div>
</AnimatePresence>
\`\`\`

The \`mode="wait"\` ensures the exit animation completes before the enter animation starts. Without it, you get overlapping elements.

## 4. Staggered Children

\`\`\`tsx
{posts.map((post, i) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 + i * 0.06 }}
  >
    <PostCard post={post} />
  </motion.div>
))}
\`\`\`

Simple delay math creates a cascading reveal effect. I prefer this over variants because it's more explicit.

## What I'd Do Differently

I'd use \`useScroll\` + \`useTransform\` more instead of GSAP ScrollTrigger for simpler scroll animations. GSAP is powerful but Framer Motion integrates better with React's render cycle.`,
    content_en: `# Framer Motion Patterns I Actually Use

After months of building this portfolio with Framer Motion, here are the patterns that actually stuck — not the fancy demos, but the stuff I reach for every time.

## 1. Layout Animations for Real UI

\`\`\`tsx
<motion.div layout layoutId="nav-indicator">
  {/* This moves smoothly between positions */}
</motion.div>
\`\`\`

I use this for the navigation active indicator. Instead of CSS transitions between positions, \`layoutId\` makes the indicator smoothly animate to wherever the active link is.

## 2. useTransform for Mouse Parallax

\`\`\`tsx
const mouseX = useMotionValue(0);
const floatX = useTransform(mouseX, [0, window.innerWidth], [-30, 30]);
const oval2X = useTransform(floatX, (v) => -v * 0.5);
\`\`\`

The hero section ovals follow the mouse with different speeds. \`useTransform\` chains let you create layered parallax without any state management.

## 3. AnimatePresence for Page Transitions

\`\`\`tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeIndex}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
  >
    {projects[activeIndex]?.title}
  </motion.div>
</AnimatePresence>
\`\`\`

The \`mode="wait"\` ensures the exit animation completes before the enter animation starts.

## 4. Staggered Children

\`\`\`tsx
{posts.map((post, i) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 + i * 0.06 }}
  >
    <PostCard post={post} />
  </motion.div>
))}
\`\`\`

Simple delay math creates a cascading reveal. I prefer this over variants because it's more explicit.

## What I'd Do Differently

I'd use \`useScroll\` + \`useTransform\` more instead of GSAP ScrollTrigger for simpler scroll animations.`,
    excerpt: "Practical Framer Motion patterns from building a portfolio: layout animations, mouse parallax, staggered reveals.",
    excerpt_en: "Practical Framer Motion patterns from building a portfolio: layout animations, mouse parallax, staggered reveals.",
    cover_image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
    tags: ["Framer Motion", "React", "Animation"],
    published: true,
    language: "en" as const,
    view_count: 178,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },

  // ── 7. Supabase 블로그 시스템 ──
  {
    title: "Supabase로 블로그 시스템 직접 만들기",
    title_en: "Building a Blog System with Supabase",
    slug: "supabase-blog-system",
    content_type: "markdown" as const,
    content: `# Supabase로 블로그 시스템 직접 만들기

포트폴리오에 블로그가 필요했는데, 외부 CMS(Notion API, Contentful 등) 대신 Supabase로 직접 만들었습니다.

## 왜 직접 만들었나

- **Notion API**: 속도가 느리고 마크다운 변환이 번거로움
- **Contentful**: 무료 티어 제한이 빡빡함
- **Supabase**: 이미 인증에 쓰고 있어서 추가 비용 없음 + SQL 직접 제어 가능

## 테이블 설계

\`\`\`sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  content_en TEXT,
  content_type TEXT DEFAULT 'markdown',
  excerpt TEXT,
  excerpt_en TEXT,
  cover_image TEXT,
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'ko',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

양언어 지원을 위해 \`title_en\`, \`content_en\`, \`excerpt_en\` 필드를 별도로 두었습니다.

## 관리자 에디터

마크다운 에디터를 직접 만들었습니다. 실시간 미리보기, 태그 관리, 커버 이미지 업로드, 임시저장(sessionStorage) 기능을 넣었습니다.

## RLS (Row Level Security)

\`\`\`sql
-- 읽기: published된 글만 공개
CREATE POLICY "Public read" ON posts
  FOR SELECT USING (published = true);

-- 쓰기: 인증된 관리자만
CREATE POLICY "Admin write" ON posts
  FOR ALL USING (auth.role() = 'authenticated');
\`\`\`

## 결과

CMS 종속 없이 완전한 블로그 시스템을 가지게 되었습니다. 데이터는 내가 직접 관리하고, 이전도 쉽습니다.`,
    content_en: `# Building a Blog System with Supabase

I needed a blog for my portfolio but chose to build it with Supabase instead of external CMS solutions.

## Why Build It Myself

- **Notion API**: Slow and markdown conversion is tedious
- **Contentful**: Free tier limits are tight
- **Supabase**: Already using it for auth, no extra cost + direct SQL control

## Table Design

\`\`\`sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  content_en TEXT,
  content_type TEXT DEFAULT 'markdown',
  excerpt TEXT,
  excerpt_en TEXT,
  cover_image TEXT,
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'ko',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

Added \`title_en\`, \`content_en\`, \`excerpt_en\` fields for bilingual support.

## Admin Editor

Built a custom markdown editor with live preview, tag management, cover image upload, and draft auto-save (sessionStorage).

## RLS (Row Level Security)

\`\`\`sql
-- Read: only published posts are public
CREATE POLICY "Public read" ON posts
  FOR SELECT USING (published = true);

-- Write: authenticated admin only
CREATE POLICY "Admin write" ON posts
  FOR ALL USING (auth.role() = 'authenticated');
\`\`\`

## Result

A complete blog system with no CMS dependency. I own the data and migration is straightforward.`,
    excerpt: "Notion API, Contentful 대신 Supabase로 직접 블로그 시스템을 구축한 과정.",
    excerpt_en: "Building a custom blog system with Supabase instead of Notion API or Contentful.",
    cover_image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
    tags: ["Supabase", "Blog", "Database"],
    published: true,
    language: "ko" as const,
    view_count: 134,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },

  // ── 8. TypeScript 제네릭 실전 ──
  {
    title: "TypeScript 제네릭, 실제로 이렇게 씁니다",
    title_en: "TypeScript Generics: How I Actually Use Them",
    slug: "typescript-generics-practical",
    content_type: "markdown" as const,
    content: `# TypeScript 제네릭, 실제로 이렇게 씁니다

제네릭 하면 \`<T>\` 문법만 떠오르는데, 이 포트폴리오에서 실제로 사용한 패턴들을 정리했습니다.

## 1. Config 업데이트 함수

\`\`\`typescript
const update = <S extends keyof SiteConfigData>(
  section: S,
  key: keyof SiteConfigData[S],
  value: SiteConfigData[S][keyof SiteConfigData[S]]
) => {
  setConfig(prev => ({
    ...prev,
    [section]: { ...prev[section], [key]: value },
  }));
};

// 사용: 타입 자동완성이 됨
update("personal", "name", "Kim"); // ✅
update("personal", "name", 123);   // ❌ 타입 에러
\`\`\`

\`section\`을 먼저 좁히면, \`key\`와 \`value\`의 타입이 자동으로 추론됩니다.

## 2. DeepWritable 타입

\`\`\`typescript
type DeepWritable<T> = {
  -readonly [K in keyof T]: T[K] extends readonly (infer U)[]
    ? Widen<U>[]
    : T[K] extends object
      ? DeepWritable<T[K]>
      : Widen<T[K]>;
};
\`\`\`

\`as const\`로 선언한 설정 객체의 타입이 리터럴("strip")이 되는데, DB에서 오버라이드할 때는 \`string\`이어야 합니다. 이 유틸리티 타입이 모든 리터럴을 원시 타입으로 넓혀줍니다.

## 3. 컴포넌트 props 제네릭

\`\`\`typescript
interface PanelProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function Panel<T>({ data, renderItem }: PanelProps<T>) {
  return <>{data.map(renderItem)}</>;
}
\`\`\`

## 핵심 포인트

- 제네릭은 **"나중에 결정되는 타입"**을 표현하는 도구
- 2개 이상의 인자 사이에 **타입 관계**가 있을 때 가장 유용
- 과도한 제네릭은 오히려 가독성을 해침 — 필요할 때만 사용`,
    content_en: `# TypeScript Generics: How I Actually Use Them

When you hear generics, you think of \`<T>\` syntax. Here are the patterns I actually used in this portfolio.

## 1. Config Update Function

\`\`\`typescript
const update = <S extends keyof SiteConfigData>(
  section: S,
  key: keyof SiteConfigData[S],
  value: SiteConfigData[S][keyof SiteConfigData[S]]
) => {
  setConfig(prev => ({
    ...prev,
    [section]: { ...prev[section], [key]: value },
  }));
};

// Usage: autocomplete works
update("personal", "name", "Kim"); // ✅
update("personal", "name", 123);   // ❌ type error
\`\`\`

Narrowing \`section\` first lets TypeScript infer \`key\` and \`value\` types automatically.

## 2. DeepWritable Type

\`\`\`typescript
type DeepWritable<T> = {
  -readonly [K in keyof T]: T[K] extends readonly (infer U)[]
    ? Widen<U>[]
    : T[K] extends object
      ? DeepWritable<T[K]>
      : Widen<T[K]>;
};
\`\`\`

Config declared with \`as const\` gets literal types ("strip"), but DB overrides need \`string\`. This utility widens all literals to primitive types.

## Key Points

- Generics express **"types decided later"**
- Most useful when there's a **type relationship** between 2+ arguments
- Over-genericizing hurts readability — use only when needed`,
    excerpt: "포트폴리오에서 실제로 사용한 TypeScript 제네릭 패턴: config 업데이트, DeepWritable, 컴포넌트 props.",
    excerpt_en: "Real TypeScript generic patterns from my portfolio: config updates, DeepWritable, component props.",
    cover_image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80",
    tags: ["TypeScript", "Generics", "패턴"],
    published: true,
    language: "ko" as const,
    view_count: 267,
    created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
  },

  // ── 9. Next.js App Router 마이그레이션 ──
  {
    title: "Next.js App Router Migration Notes",
    title_en: "Next.js App Router Migration Notes",
    slug: "nextjs-app-router-migration",
    content_type: "markdown" as const,
    content: `# Next.js App Router Migration Notes

I started this portfolio with Pages Router and migrated to App Router midway. Here's what surprised me and what I'd do differently.

## What Changed

### Server Components by Default
Every component is a Server Component unless you add \`"use client"\`. This sounds simple but changes how you think about data fetching.

\`\`\`tsx
// This runs on the server — no useEffect needed
export default async function RootLayout({ children }) {
  const config = await getSiteConfig(); // Direct DB call
  return (
    <SiteConfigProvider initialConfig={config}>
      {children}
    </SiteConfigProvider>
  );
}
\`\`\`

### The "use client" Boundary
The biggest mental shift: \`"use client"\` doesn't mean "client only." It means "this is the boundary where hydration starts." Everything below it is still server-rendered on initial load.

## Things That Tripped Me Up

1. **Can't use hooks in Server Components** — obvious in hindsight, but \`useRouter()\` needs to be \`useRouter\` from \`next/navigation\`, not \`next/router\`
2. **Metadata API** — no more \`<Head>\` component. Export a \`metadata\` object or \`generateMetadata\` function
3. **Route Groups** — \`(dashboard)\` and \`(auth)\` folders let you share layouts without affecting the URL

## What I'd Do Differently

Start with App Router from day one. The migration wasn't terrible, but converting existing pages one by one was tedious. File-based layouts are much cleaner than the old \`_app.tsx\` approach.`,
    content_en: `# Next.js App Router Migration Notes

I started this portfolio with Pages Router and migrated to App Router midway. Here's what surprised me and what I'd do differently.

## What Changed

### Server Components by Default
Every component is a Server Component unless you add \`"use client"\`.

\`\`\`tsx
export default async function RootLayout({ children }) {
  const config = await getSiteConfig();
  return (
    <SiteConfigProvider initialConfig={config}>
      {children}
    </SiteConfigProvider>
  );
}
\`\`\`

### The "use client" Boundary
\`"use client"\` doesn't mean "client only." It's where hydration starts.

## Things That Tripped Me Up

1. **Can't use hooks in Server Components** — \`useRouter()\` must be from \`next/navigation\`
2. **Metadata API** — export \`metadata\` object instead of \`<Head>\`
3. **Route Groups** — \`(dashboard)\` and \`(auth)\` share layouts without affecting URLs

## What I'd Do Differently

Start with App Router from day one. Migration wasn't terrible but converting pages one by one was tedious.`,
    excerpt: "Migrating from Pages Router to App Router: server components, use client boundaries, and lessons learned.",
    excerpt_en: "Migrating from Pages Router to App Router: server components, use client boundaries, and lessons learned.",
    cover_image: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800&q=80",
    tags: ["Next.js", "App Router", "Migration"],
    published: true,
    language: "en" as const,
    view_count: 312,
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },

  // ── 10. mix-blend-mode 네비게이션 ──
  {
    title: "mix-blend-mode: difference로 자동 반전 네비게이션 만들기",
    title_en: "Auto-Inverting Navigation with mix-blend-mode: difference",
    slug: "mix-blend-mode-navigation",
    content_type: "markdown" as const,
    content: `# mix-blend-mode: difference로 자동 반전 네비게이션 만들기

이 사이트의 네비게이션은 배경이 밝으면 어둡게, 어두우면 밝게 자동으로 바뀝니다. JavaScript 없이 CSS 한 줄로 가능합니다.

## 핵심 코드

\`\`\`css
.nav {
  position: fixed;
  mix-blend-mode: difference;
  color: white;
  z-index: 100;
}
\`\`\`

\`mix-blend-mode: difference\`는 배경색과 요소 색상의 차이를 계산합니다:
- 흰 배경 위 흰 텍스트 → **검정** (255 - 255 = 0)
- 검정 배경 위 흰 텍스트 → **흰색** (255 - 0 = 255)

## 주의할 점

### 1. 반투명 배경 불가
\`\`\`css
/* ❌ 반투명이면 blend 결과가 이상해짐 */
.nav { background: rgba(0, 0, 0, 0.5); }

/* ✅ 배경 없이 사용 */
.nav { background: transparent; }
\`\`\`

### 2. 이미지 위에서의 동작
이미지 위에서는 이미지 색상에 따라 결과가 달라지므로, 텍스트가 읽히지 않을 수 있습니다. 중요한 UI 요소에는 fallback을 고려해야 합니다.

### 3. 색상 선택 제한
\`color: white\`만 깔끔하게 동작합니다. 브랜드 컬러를 쓰면 예측 불가능한 색상이 나옵니다.

## 실전 적용 결과

이 사이트에서는 네비게이션 텍스트, 로고, 아이콘 모두에 적용했습니다. 다크 모드 전환 시에도 별도 처리 없이 자연스럽게 반전됩니다.

CSS 한 줄이지만 효과는 강력합니다.`,
    content_en: `# Auto-Inverting Navigation with mix-blend-mode: difference

The navigation on this site automatically inverts based on the background — dark text on light backgrounds, light text on dark backgrounds. One CSS line, no JavaScript.

## Core Code

\`\`\`css
.nav {
  position: fixed;
  mix-blend-mode: difference;
  color: white;
  z-index: 100;
}
\`\`\`

\`mix-blend-mode: difference\` calculates the difference between background and element colors:
- White text on white bg → **black** (255 - 255 = 0)
- White text on black bg → **white** (255 - 0 = 255)

## Caveats

### 1. No Semi-Transparent Backgrounds
\`\`\`css
/* ❌ Semi-transparent gives weird blend results */
.nav { background: rgba(0, 0, 0, 0.5); }

/* ✅ Use transparent */
.nav { background: transparent; }
\`\`\`

### 2. Behavior Over Images
Over images, results vary with image colors. Text might become unreadable. Consider fallbacks for critical UI.

### 3. Color Limitations
Only \`color: white\` works cleanly. Brand colors produce unpredictable results.

## Result

Applied to navigation text, logo, and icons on this site. Works seamlessly during dark mode transitions with no extra handling.

One line of CSS, powerful effect.`,
    excerpt: "CSS mix-blend-mode: difference로 배경에 따라 자동 반전되는 네비게이션 구현.",
    excerpt_en: "Implementing auto-inverting navigation with CSS mix-blend-mode: difference.",
    cover_image: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=800&q=80",
    tags: ["CSS", "Navigation", "Design"],
    published: true,
    language: "ko" as const,
    view_count: 189,
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

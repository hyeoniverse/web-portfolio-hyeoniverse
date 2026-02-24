// 작품 페이지 프로젝트 데이터

import type { Language } from "@/providers/LanguageProvider";

export type CardSize = "large" | "small" | "medium" | "tall" | "wide";

export type LocalizedText = Record<Language, string>;

export interface ProjectTeamMember {
  name: string;
  role: LocalizedText;
  url?: string;
}

export interface Project {
  id: string;
  number: string;
  title: string;
  subtitle: LocalizedText;
  category: LocalizedText;
  year: string;
  description: LocalizedText;
  role: LocalizedText;
  tech: string[];
  image: string;
  size: CardSize;
  /* ── Detail page content (single field with sections as headings) ── */
  content: LocalizedText;
  contentType?: "markdown" | "richtext";
  teamMembers?: ProjectTeamMember[];
  gallery: string[];
  liveUrl?: string;
  githubUrl?: string;
}

export const projects: Project[] = [
  {
    id: "1",
    number: "01",
    title: "Oval Portfolio",
    subtitle: { ko: "직접 설계하고 구현한 풀스택 포트폴리오", en: "Full-Stack Portfolio, Designed & Built from Scratch" },
    category: { ko: "풀스택 / 개인 프로젝트", en: "Full-Stack / Personal Project" },
    year: "2025",
    description: {
      ko: "Next.js 15 App Router 기반 포트폴리오 + 자체 Admin CMS. 3-layer 디자인 토큰, GSAP 수평 스크롤, Supabase 인증/DB까지 직접 구축.",
      en: "Portfolio site + custom Admin CMS built on Next.js 15 App Router. 3-layer design tokens, GSAP horizontal scroll, Supabase auth & DB — all hand-crafted.",
    },
    role: { ko: "기획 · 디자인 · 풀스택 개발", en: "Planning · Design · Full-Stack Development" },
    tech: ["Next.js 15", "React 19", "TypeScript", "Supabase", "GSAP", "Lenis", "CSS Modules", "Vercel"],
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=700&fit=crop",
    size: "large",
    content: {
      ko: `## Overview

프론트엔드 개발자로서 기술 역량을 직접 증명하기 위해 만든 포트폴리오 사이트입니다. 외부 CMS(Contentful, Sanity) 없이 Supabase + 자체 Admin 대시보드를 구축하여 콘텐츠를 직접 관리합니다.

핵심 아키텍처:
• 3-layer 디자인 토큰 시스템 (Raw → Semantic → Context) — 테마 전환 시 CSS Custom Properties만 교체하면 전체 UI가 반응
• Server/Client Component 분리 — 데이터 fetch는 서버, 인터랙션은 클라이언트로 명확히 분리
• Admin CRUD — Posts/Works/Profile/Settings를 탭 기반 UI로 편집, Supabase RLS로 인증 보호
• GSAP ScrollTrigger + Lenis — 데스크톱에서는 수평 스크롤 갤러리, 모바일(≤1024px)에서는 수직 스택으로 자동 전환

![Overview](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=700&fit=crop)

## Challenges

1. CSS Specificity 충돌 — globals/_base.css의 html[data-theme-ready] * 전환 규칙이 specificity (0,1,1)로, 컴포넌트 단일 클래스 (0,1,0)의 transition을 완전히 덮어씌움. max-height, transform 등의 애니메이션이 작동하지 않는 원인을 추적하는 데 시간이 걸렸습니다.

2. GSAP 수평 스크롤 + Lenis 통합 — ScrollTrigger의 pin과 Lenis의 smooth scroll이 서로의 스크롤 위치 계산을 간섭. 리사이즈 시 레이아웃이 깨지는 문제도 있었습니다.

3. Markdown 에디터 스크롤 동기화 — 에디터 패널과 프리뷰 패널의 스크롤 위치를 비율 기반으로 동기화할 때, 이미지가 포함된 프리뷰의 높이가 동적으로 변해 정확한 매핑이 어려웠습니다.

![Challenges](https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=700&fit=crop)

## Solutions

1. 복합 셀렉터로 specificity 상승 — .parent .child 패턴 (0,2,0)을 적용하여 글로벌 규칙을 override. 이후 모든 컴포넌트 transition에 동일 컨벤션을 적용하고 MEMORY에 기록.

2. Lenis의 setInfinite(false) + GSAP onRefresh 콜백 — 페이지 진입 시 infinite scroll을 비활성화하고, resize 이벤트에서 ScrollTrigger.refresh()와 Lenis.resize()를 순차 호출하여 동기화.

3. scrollHeight 비율 매핑 + ResizeObserver — 프리뷰 패널에 ResizeObserver를 걸어 높이 변화를 감지하고, scrollTop / scrollHeight 비율을 실시간 재계산. requestAnimationFrame으로 스크롤 이벤트를 throttle 처리.

![Solutions](https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=700&fit=crop)`,
      en: `## Overview

A portfolio site built to directly demonstrate my frontend engineering capabilities. Instead of relying on external CMS platforms (Contentful, Sanity), I built a custom Admin dashboard with Supabase for full content management.

Core Architecture:
• 3-layer Design Token System (Raw → Semantic → Context) — swapping CSS Custom Properties on theme change cascades across the entire UI
• Server/Client Component Separation — data fetching on server, interactions on client, cleanly divided
• Admin CRUD — Tab-based editor for Posts/Works/Profile/Settings, secured with Supabase RLS
• GSAP ScrollTrigger + Lenis — horizontal scroll gallery on desktop, auto-switches to vertical stack on mobile (≤1024px)

![Overview](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=700&fit=crop)

## Challenges

1. CSS Specificity Conflict — The global html[data-theme-ready] * transition rule at specificity (0,1,1) completely overrode component-level single-class (0,1,0) transitions. Animations for max-height, transform, etc. silently broke, and tracking down the root cause took significant debugging time.

2. GSAP Horizontal Scroll + Lenis Integration — ScrollTrigger's pin mechanism and Lenis smooth scroll interfered with each other's scroll position calculations. Layout also broke on window resize events.

3. Markdown Editor Scroll Sync — Synchronizing scroll positions between editor and preview panels using ratio-based mapping was inaccurate because the preview height changed dynamically with image loading.

![Challenges](https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=700&fit=crop)

## Solutions

1. Compound Selectors for Specificity Override — Applied .parent .child pattern (0,2,0) to override the global rule. Established this as a codebase convention and documented it for future reference.

2. Lenis setInfinite(false) + GSAP onRefresh — Disabled infinite scroll on page entry, then sequentially called ScrollTrigger.refresh() and Lenis.resize() on resize events for synchronization.

3. scrollHeight Ratio Mapping + ResizeObserver — Attached ResizeObserver to the preview panel to detect height changes, recalculating scrollTop/scrollHeight ratios in real-time. Throttled scroll events via requestAnimationFrame.

![Solutions](https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=700&fit=crop)`,
    },
    gallery: [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200&h=800&fit=crop",
    ],
    githubUrl: "https://github.com",
  },
  {
    id: "2",
    number: "02",
    title: "Syncboard",
    subtitle: { ko: "충돌 없는 실시간 협업", en: "Conflict-Free Real-Time Collaboration" },
    category: { ko: "웹 앱 / 실시간 협업", en: "Web App / Real-Time Collaboration" },
    year: "2024",
    description: {
      ko: "CRDT 기반 실시간 화이트보드. 다중 커서, 동시 편집, 오프라인 동기화까지 지원하는 협업 도구.",
      en: "CRDT-based real-time whiteboard. Multi-cursor, concurrent editing, and offline sync — a collaboration tool built for teams.",
    },
    role: { ko: "프론트엔드 리드", en: "Frontend Lead" },
    tech: ["React", "TypeScript", "Yjs", "WebSocket", "Canvas API", "Zustand", "Hocuspocus"],
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=700&fit=crop",
    size: "small",
    content: {
      ko: `## Overview

Notion, Figma처럼 여러 사용자가 동시에 편집할 수 있는 화이트보드를 구현했습니다. OT(Operational Transformation) 대신 CRDT(Conflict-free Replicated Data Type)를 선택하여 서버 의존도를 낮추고, 오프라인 상태에서도 편집 후 재연결 시 자동 병합되는 구조를 설계했습니다.

User Flow:
사용자 → 보드 생성/참여 → 실시간 캔버스 편집 (도형, 텍스트, 이미지) → 다른 참여자 커서/선택 영역 실시간 표시 → 오프라인 시 로컬 저장 → 재연결 시 자동 머지

Yjs를 CRDT 엔진으로 사용하고, Hocuspocus를 WebSocket 서버로 두어 awareness(커서 위치, 사용자 정보)를 실시간 브로드캐스트합니다.

![Overview](https://images.unsplash.com/photo-1600267185393-e158a98703de?w=1200&h=700&fit=crop)

## Challenges

1. Canvas 렌더링 성능 — 수백 개의 오브젝트가 있는 보드에서 매 프레임 전체를 다시 그리면 60fps를 유지할 수 없었습니다. 특히 다른 사용자의 커서 움직임이 초당 수십 번 업데이트되면서 불필요한 리렌더링이 폭증.

2. Undo/Redo + CRDT 충돌 — Yjs의 UndoManager가 로컬 변경만 되돌리는데, 다른 사용자가 같은 영역을 수정한 경우 Undo 결과가 사용자 기대와 달라지는 문제.

3. 오프라인 → 온라인 전환 시 대량 업데이트 — 오프라인에서 쌓인 수백 개의 변경사항이 한꺼번에 동기화되면서 UI가 수 초간 멈추는 현상.

![Challenges](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=700&fit=crop)

## Solutions

1. Dirty Region 렌더링 — 변경된 영역만 추적하여 부분 리드로잉. 커서 레이어를 별도 Canvas로 분리하여 오브젝트 레이어에 영향을 주지 않도록 구성. 결과적으로 1,000개 오브젝트 보드에서도 안정적 60fps 유지.

2. UndoManager에 커스텀 TrackedOrigin 적용 — 로컬 origin과 리모트 origin을 분리하고, Undo 스택에서 리모트 변경과 인터리빙된 로컬 변경만 선택적으로 되돌리도록 구현.

3. Chunk 기반 점진적 동기화 — 오프라인 변경사항을 50개 단위 청크로 분할하여 requestIdleCallback으로 순차 적용. 동기화 진행률을 UI에 표시하여 사용자에게 피드백 제공.

![Solutions](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop)`,
      en: `## Overview

Built a whiteboard where multiple users can edit simultaneously — similar to Notion or Figma. Chose CRDT (Conflict-free Replicated Data Type) over OT (Operational Transformation) to reduce server dependency, enabling offline editing that auto-merges on reconnection.

User Flow:
User → Create/Join board → Real-time canvas editing (shapes, text, images) → Live cursors & selections of other participants → Local storage on offline → Auto-merge on reconnect

Yjs serves as the CRDT engine, with Hocuspocus as the WebSocket server for real-time awareness broadcasting (cursor positions, user info).

![Overview](https://images.unsplash.com/photo-1600267185393-e158a98703de?w=1200&h=700&fit=crop)

## Challenges

1. Canvas Rendering Performance — Redrawing the entire canvas every frame with hundreds of objects couldn't maintain 60fps. Other users' cursor movements updating dozens of times per second caused render explosion.

2. Undo/Redo + CRDT Conflict — Yjs UndoManager only reverts local changes, but when another user modified the same region, Undo results diverged from user expectations.

3. Offline → Online Bulk Update — Hundreds of changes accumulated offline caused UI freezes lasting several seconds when synchronizing all at once.

![Challenges](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=700&fit=crop)

## Solutions

1. Dirty Region Rendering — Tracked changed regions for partial redraws. Separated cursor layer into a dedicated Canvas to avoid affecting the object layer. Achieved stable 60fps with 1,000+ objects.

2. Custom TrackedOrigin for UndoManager — Separated local and remote origins, selectively reverting only local changes interleaved with remote modifications in the Undo stack.

3. Chunked Progressive Sync — Split offline changes into 50-item chunks applied sequentially via requestIdleCallback. Displayed sync progress in the UI for user feedback.

![Solutions](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop)`,
    },
    gallery: [
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&h=800&fit=crop",
    ],
  },
  {
    id: "3",
    number: "03",
    title: "Reflex Commerce",
    subtitle: { ko: "결제까지 3초, 이탈률 40% 감소", en: "3s to Checkout, 40% Drop-off Reduction" },
    category: { ko: "이커머스 / 성능 최적화", en: "E-Commerce / Performance Optimization" },
    year: "2024",
    description: {
      ko: "기존 이커머스 플랫폼의 프론트엔드를 Next.js로 마이그레이션하고, 검색·결제 플로우를 최적화하여 전환율을 개선한 프로젝트.",
      en: "Migrated a legacy e-commerce frontend to Next.js, optimizing search and checkout flows to measurably improve conversion rates.",
    },
    role: { ko: "프론트엔드 개발", en: "Frontend Development" },
    tech: ["Next.js 14", "TypeScript", "tRPC", "Prisma", "Redis", "Algolia", "Stripe", "Turborepo"],
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=700&fit=crop",
    size: "medium",
    content: {
      ko: `## Overview

Vue 2 + Nuxt 2로 구축된 기존 이커머스 프론트엔드를 Next.js 14 App Router로 마이그레이션했습니다. 단순 프레임워크 교체가 아닌, 검색 → 상품 상세 → 장바구니 → 결제의 전체 User Flow를 분석하고 각 단계의 병목을 제거했습니다.

핵심 지표:
• LCP 3.2s → 1.1s (Next.js ISR + Image Optimization)
• 검색 응답 시간 800ms → 40ms (Algolia 도입)
• 결제 플로우 이탈률 38% → 22% (단계 축소 + Optimistic UI)

Turborepo로 모노레포를 구성하여 packages/ui, packages/utils를 백오피스와 고객 앱이 공유합니다.

![Overview](https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=700&fit=crop)

## Challenges

1. 장바구니 상태 경쟁 조건 — 여러 탭에서 동시에 장바구니를 수정하면 재고 차감이 꼬이는 문제. 특히 재고가 1개 남았을 때 두 사용자가 동시에 담으면 oversell이 발생.

2. ISR 캐시 무효화 타이밍 — 상품 가격이 변경되었는데 ISR 캐시가 남아있어 구매자에게 이전 가격이 보이는 문제. revalidate 간격이 너무 짧으면 서버 부하, 너무 길면 데이터 불일치.

3. Algolia 인덱스 동기화 — PostgreSQL에서 상품 데이터가 업데이트되면 Algolia 인덱스도 갱신해야 하는데, 네트워크 실패 시 검색 결과와 실제 데이터가 어긋남.

![Challenges](https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=700&fit=crop)

## Solutions

1. Redis 기반 분산 락 + Optimistic Locking — 장바구니 추가 시 Redis SETNX로 SKU별 분산 락을 획득하고, inventory 테이블에 version 컬럼을 추가하여 UPDATE ... WHERE version = ? 패턴으로 동시성 제어.

2. On-Demand ISR + Webhook — 백오피스에서 가격 변경 시 Supabase Webhook → Next.js revalidateTag() 호출. 평상시에는 1시간 ISR, 가격/재고 변경 시 즉시 무효화.

3. Change Data Capture 패턴 — PostgreSQL의 LISTEN/NOTIFY로 상품 변경 이벤트를 감지하고, 실패 시 Dead Letter Queue에 쌓아 5분마다 재시도하는 retry 메커니즘 구현.

![Solutions](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=700&fit=crop)`,
      en: `## Overview

Migrated a Vue 2 + Nuxt 2 e-commerce frontend to Next.js 14 App Router. Beyond a framework swap, I analyzed the entire User Flow — search → product detail → cart → checkout — eliminating bottlenecks at each stage.

Key Metrics:
• LCP 3.2s → 1.1s (Next.js ISR + Image Optimization)
• Search response 800ms → 40ms (Algolia integration)
• Checkout drop-off 38% → 22% (step reduction + Optimistic UI)

Turborepo monorepo structure with packages/ui and packages/utils shared between backoffice and customer app.

![Overview](https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=700&fit=crop)

## Challenges

1. Cart Race Condition — Simultaneous cart modifications across tabs caused inventory deduction conflicts. Two users adding the last item simultaneously led to overselling.

2. ISR Cache Invalidation Timing — Product price changes weren't reflected due to stale ISR cache, showing buyers outdated prices. Too short revalidation intervals increased server load; too long caused data inconsistency.

3. Algolia Index Synchronization — Product data updates in PostgreSQL required Algolia index updates, but network failures caused search results to diverge from actual data.

![Challenges](https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=700&fit=crop)

## Solutions

1. Redis Distributed Lock + Optimistic Locking — Acquired per-SKU distributed locks via Redis SETNX on cart addition. Added a version column to the inventory table with UPDATE ... WHERE version = ? pattern for concurrency control.

2. On-Demand ISR + Webhook — Price changes in backoffice trigger Supabase Webhook → Next.js revalidateTag(). Default 1-hour ISR, with instant invalidation on price/stock changes.

3. Change Data Capture Pattern — Detected product change events via PostgreSQL LISTEN/NOTIFY, with a Dead Letter Queue retry mechanism every 5 minutes for failed Algolia index syncs.

![Solutions](https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=700&fit=crop)`,
    },
    gallery: [
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=800&fit=crop",
    ],
  },
  {
    id: "4",
    number: "04",
    title: "Prism UI",
    subtitle: { ko: "토큰 기반 디자인 시스템 구축기", en: "Building a Token-Driven Design System" },
    category: { ko: "디자인 시스템 / 오픈소스", en: "Design System / Open Source" },
    year: "2024",
    description: {
      ko: "사내 5개 프로덕트에서 공유하는 React 컴포넌트 라이브러리. Figma Tokens → Style Dictionary → CSS Custom Properties 파이프라인 구축.",
      en: "Shared React component library across 5 internal products. Built a Figma Tokens → Style Dictionary → CSS Custom Properties pipeline.",
    },
    role: { ko: "디자인 시스템 엔지니어", en: "Design System Engineer" },
    tech: ["React", "TypeScript", "Style Dictionary", "Storybook", "Rollup", "CSS Modules", "Chromatic", "Changesets"],
    image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&h=700&fit=crop",
    size: "tall",
    content: {
      ko: `## Overview

각 프로덕트마다 독립적으로 만들어진 버튼, 모달, 폼 컴포넌트가 스타일과 동작이 제각각이었습니다. 이를 통합하는 디자인 시스템 Prism UI를 구축했습니다.

아키텍처:
• Token Pipeline — Figma Variables → JSON export → Style Dictionary transform → CSS Custom Properties + TypeScript constants 자동 생성
• Component Layer — Headless 패턴(Radix Primitives)으로 접근성 기본 탑재, 스타일은 CSS Modules로 분리
• Distribution — Rollup으로 ESM/CJS 번들링, Changesets로 시맨틱 버저닝 자동화, Chromatic으로 Visual Regression Test

도입 후 신규 페이지 개발 시간이 평균 40% 단축되고, 디자이너-개발자 간 커뮤니케이션 비용이 현저히 감소했습니다.

![Overview](https://images.unsplash.com/photo-1545235617-9465d2a55698?w=1200&h=700&fit=crop)

## Challenges

1. Tree-Shaking 실패 — 초기 번들 설정에서 CSS Modules의 side effect로 인해 사용하지 않는 컴포넌트의 CSS까지 번들에 포함. 소비하는 앱의 번들 사이즈가 400KB 이상 증가.

2. 테마 전환 깜빡임(FOUC) — SSR 환경에서 초기 HTML은 기본 테마로 렌더링되고, 클라이언트 hydration 후 저장된 테마가 적용되면서 눈에 보이는 깜빡임 발생.

3. 컴포넌트 마이그레이션 저항 — 기존 프로덕트 팀들이 자체 컴포넌트를 Prism UI로 교체하는 데 거부감. API가 다르고 기존 코드 수정이 필요해서 도입 속도가 느림.

![Challenges](https://images.unsplash.com/photo-1581291518633-83b4eef1d2fa?w=1200&h=700&fit=crop)

## Solutions

1. 컴포넌트별 CSS 파일 분리 + sideEffects 배열 — Rollup 설정에서 각 컴포넌트의 CSS를 개별 파일로 추출하고, package.json의 sideEffects에 실제 사용되는 CSS만 명시. 결과적으로 미사용 컴포넌트 CSS가 제거되어 번들 사이즈 정상화.

2. data-theme 쿠키 + 블로킹 스크립트 — head에 인라인 스크립트를 삽입하여 쿠키에서 테마를 읽고 html[data-theme]을 설정. 페인트 전에 올바른 테마가 적용되어 FOUC 완전 제거.

3. Codemod 자동화 + 점진적 마이그레이션 — jscodeshift로 기존 컴포넌트 → Prism UI 변환 codemod를 작성. 팀별로 한 페이지씩 점진적으로 교체하는 전략을 수립하고, 주간 마이그레이션 리포트로 진행 상황을 공유.

![Solutions](https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1200&h=700&fit=crop)`,
      en: `## Overview

Each product had independently built buttons, modals, and form components with inconsistent styles and behaviors. I built Prism UI to unify them.

Architecture:
• Token Pipeline — Figma Variables → JSON export → Style Dictionary transform → auto-generated CSS Custom Properties + TypeScript constants
• Component Layer — Headless pattern (Radix Primitives) with built-in accessibility, styles separated via CSS Modules
• Distribution — ESM/CJS bundling with Rollup, semantic versioning via Changesets, Visual Regression Testing with Chromatic

Post-adoption, new page development time decreased by ~40%, and designer-developer communication overhead dropped significantly.

![Overview](https://images.unsplash.com/photo-1545235617-9465d2a55698?w=1200&h=700&fit=crop)

## Challenges

1. Tree-Shaking Failure — CSS Modules' side effects caused unused component CSS to be included in bundles. Consuming apps saw 400KB+ bundle size increases.

2. Theme Switch FOUC — In SSR environments, initial HTML rendered with the default theme; applying the saved theme after client hydration caused visible flickering.

3. Component Migration Resistance — Existing product teams resisted replacing their components with Prism UI due to differing APIs and required code changes, slowing adoption.

![Challenges](https://images.unsplash.com/photo-1581291518633-83b4eef1d2fa?w=1200&h=700&fit=crop)

## Solutions

1. Per-Component CSS Extraction + sideEffects Array — Configured Rollup to extract each component's CSS into individual files, specifying only used CSS in package.json sideEffects. Eliminated unused component CSS, normalizing bundle size.

2. data-theme Cookie + Blocking Script — Inserted inline script in head to read theme from cookie and set html[data-theme] before paint, completely eliminating FOUC.

3. Codemod Automation + Gradual Migration — Wrote jscodeshift codemods to auto-transform existing components to Prism UI. Established a page-by-page migration strategy per team, sharing progress via weekly migration reports.

![Solutions](https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1200&h=700&fit=crop)`,
    },
    gallery: [
      "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1581291518633-83b4eef1d2fa?w=1200&h=800&fit=crop",
    ],
    githubUrl: "https://github.com",
  },
  {
    id: "5",
    number: "05",
    title: "Docuflow",
    subtitle: { ko: "PDF 생성 자동화로 수작업 90% 제거", en: "90% Manual Work Eliminated via PDF Automation" },
    category: { ko: "SaaS / 문서 자동화", en: "SaaS / Document Automation" },
    year: "2023",
    description: {
      ko: "계약서, 견적서, 보고서 등 반복 문서를 템플릿 기반으로 자동 생성하는 B2B SaaS. 드래그앤드롭 에디터로 비개발자도 템플릿 제작 가능.",
      en: "B2B SaaS for template-based auto-generation of contracts, quotes, and reports. Drag-and-drop editor enables non-developers to create templates.",
    },
    role: { ko: "프론트엔드 개발", en: "Frontend Development" },
    tech: ["Vue 3", "TypeScript", "Pinia", "Node.js", "PostgreSQL", "Puppeteer", "AWS Lambda", "S3"],
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&h=700&fit=crop",
    size: "wide",
    content: {
      ko: `## Overview

매달 수천 건의 계약서를 수동으로 작성하던 고객사의 문제를 해결하기 위해 만든 문서 자동화 SaaS입니다.

User Flow:
관리자 → 드래그앤드롭으로 템플릿 설계 (변수 바인딩, 조건부 섹션, 반복 블록) → API 또는 Zapier 트리거 → 데이터 주입 → PDF 렌더링 → 이메일 발송 / S3 저장

프론트엔드 핵심:
• 드래그앤드롭 에디터 — Vue 3 Composition API + vuedraggable로 블록 기반 편집기 구현. 각 블록(텍스트, 표, 이미지, 서명란)이 독립적인 설정 패널을 가짐
• 실시간 프리뷰 — 편집 시 debounce된 PDF 미리보기를 iframe으로 표시
• 변수 시스템 — Mustache 문법으로 동적 데이터 바인딩, 중첩 객체 및 배열 반복 지원

![Overview](https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&h=700&fit=crop)

## Challenges

1. PDF 렌더링 일관성 — Puppeteer로 HTML → PDF 변환 시, 브라우저 렌더링과 PDF 결과물의 페이지 분할 위치가 달라 표가 중간에 잘리는 문제. 고객사마다 미세하게 다른 출력 요구사항.

2. Lambda Cold Start — PDF 생성을 AWS Lambda에서 처리하는데, Puppeteer 번들(~300MB)의 cold start가 8초 이상. 고객이 '생성' 버튼을 누르고 10초 이상 기다리는 상황.

3. 대용량 문서 메모리 이슈 — 수백 페이지짜리 보고서 생성 시 Puppeteer가 메모리 2GB 이상 사용하여 Lambda가 OOM(Out of Memory)으로 종료.

![Challenges](https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=700&fit=crop)

## Solutions

1. CSS page-break-inside: avoid + 커스텀 페이지네이션 — 표, 이미지 등 분할되면 안 되는 요소에 page-break 규칙 적용. 블록 단위로 높이를 사전 계산하여 페이지 경계를 예측하고, 자동으로 빈 공간을 삽입하는 레이아웃 엔진 자체 구현.

2. Provisioned Concurrency + 경량 PDF 엔진 분기 — 간단한 문서는 @react-pdf/renderer로 서버에서 직접 생성 (cold start 무관), 복잡한 문서만 Puppeteer Lambda로 라우팅. Provisioned Concurrency로 상시 warm 인스턴스 5개 유지하여 cold start 제거.

3. 스트리밍 렌더링 — 대용량 문서를 10페이지 단위로 분할 렌더링 후 pdf-lib로 병합. 메모리 사용량을 500MB 이내로 제한하고, 진행률을 WebSocket으로 클라이언트에 실시간 전달.

![Solutions](https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&h=700&fit=crop)`,
      en: `## Overview

A document automation SaaS built to solve the problem of clients manually creating thousands of contracts monthly.

User Flow:
Admin → Design templates via drag-and-drop (variable binding, conditional sections, repeating blocks) → API or Zapier trigger → Data injection → PDF rendering → Email delivery / S3 storage

Frontend Highlights:
• Drag-and-Drop Editor — Block-based editor using Vue 3 Composition API + vuedraggable. Each block (text, table, image, signature) has its own settings panel
• Live Preview — Debounced PDF preview displayed in iframe during editing
• Variable System — Dynamic data binding via Mustache syntax, supporting nested objects and array iteration

![Overview](https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&h=700&fit=crop)

## Challenges

1. PDF Rendering Consistency — When converting HTML → PDF via Puppeteer, page break positions differed between browser rendering and PDF output, causing tables to split mid-row. Each client had subtly different output requirements.

2. Lambda Cold Start — PDF generation on AWS Lambda with Puppeteer bundle (~300MB) caused 8+ second cold starts. Users waited 10+ seconds after clicking 'Generate'.

3. Large Document Memory Issues — Reports with hundreds of pages caused Puppeteer to consume 2GB+ memory, crashing Lambda with OOM (Out of Memory).

![Challenges](https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=700&fit=crop)

## Solutions

1. CSS page-break-inside: avoid + Custom Pagination — Applied page-break rules to elements that shouldn't split (tables, images). Built a custom layout engine that pre-calculates block heights to predict page boundaries and automatically inserts spacing.

2. Provisioned Concurrency + Lightweight PDF Engine — Simple documents generated server-side via @react-pdf/renderer (no cold start), complex documents routed to Puppeteer Lambda. Maintained 5 warm instances via Provisioned Concurrency to eliminate cold starts.

3. Streaming Rendering — Split large documents into 10-page chunks for rendering, then merged via pdf-lib. Capped memory at 500MB and delivered progress via WebSocket to the client in real-time.

![Solutions](https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&h=700&fit=crop)`,
    },
    gallery: [
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1618044733300-9472054094ee?w=1200&h=800&fit=crop",
    ],
  },
  {
    id: "6",
    number: "06",
    title: "Gridview Analytics",
    subtitle: { ko: "10만 행도 버벅임 없이", en: "100K Rows, Zero Lag" },
    category: { ko: "대시보드 / 데이터 시각화", en: "Dashboard / Data Visualization" },
    year: "2023",
    description: {
      ko: "대규모 데이터를 실시간으로 시각화하는 관제 대시보드. 가상 스크롤 테이블, WebSocket 실시간 차트, 커스텀 위젯 레이아웃.",
      en: "Real-time monitoring dashboard for large-scale data visualization. Virtual scroll tables, WebSocket live charts, and customizable widget layouts.",
    },
    role: { ko: "프론트엔드 개발", en: "Frontend Development" },
    tech: ["React", "TypeScript", "D3.js", "TanStack Virtual", "WebSocket", "Go", "ClickHouse", "Docker"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop",
    size: "small",
    content: {
      ko: `## Overview

IoT 센서 데이터, 서버 메트릭, 비즈니스 KPI를 하나의 대시보드에서 모니터링하는 관제 시스템입니다.

기술 구조:
• 데이터 레이어 — Go 서버가 ClickHouse에서 집계 쿼리를 실행하고, WebSocket으로 1초 간격 실시간 push
• 테이블 — TanStack Virtual로 10만 행 가상 스크롤. 컬럼 정렬, 필터, 고정(pin)을 서버 사이드에서 처리하여 클라이언트 메모리 절약
• 차트 — D3.js + Canvas 렌더링. SVG 대신 Canvas를 선택하여 수천 데이터포인트를 60fps로 렌더링
• 위젯 레이아웃 — react-grid-layout으로 드래그 기반 위젯 배치, 사용자별 레이아웃을 localStorage + 서버에 저장

![Overview](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop)

## Challenges

1. WebSocket 메시지 폭주 — 50개 센서가 초당 1회씩 데이터를 보내면 초당 50개 메시지. 각 메시지마다 차트를 리렌더링하면 CPU 사용률이 100%에 도달.

2. D3.js 메모리 누수 — 대시보드를 오래 띄워놓으면 차트 데이터가 계속 축적되어 브라우저 탭 메모리가 시간당 200MB씩 증가. 24시간 모니터링 환경에서 브라우저 크래시 발생.

3. 커스텀 위젯 리사이즈 시 차트 깨짐 — react-grid-layout에서 위젯 크기를 변경하면 D3.js 차트의 SVG viewBox가 즉시 반응하지 않아 차트가 잘리거나 빈 공간이 생김.

![Challenges](https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=700&fit=crop)

## Solutions

1. 메시지 배칭 + RAF 스케줄링 — WebSocket 메시지를 100ms 윈도우로 배치(batch)하고, requestAnimationFrame 콜백에서 일괄 업데이트. 초당 50회 렌더링 → 최대 10회로 감소시키면서 데이터 누락 없이 실시간성 유지.

2. 링 버퍼(Ring Buffer) 패턴 — 차트 데이터를 고정 길이 배열(최근 3,600개 = 1시간)로 관리. 새 데이터가 들어오면 가장 오래된 데이터를 덮어쓰는 순환 구조로 메모리 증가 완전 차단.

3. ResizeObserver + debounced reflow — 위젯 컨테이너에 ResizeObserver를 걸고, 리사이즈 완료 후 150ms debounce로 D3.js의 width/height를 업데이트하고 scales를 재계산. 리사이즈 중에는 CSS scale transform으로 임시 스케일링하여 시각적 끊김 방지.

![Solutions](https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1200&h=700&fit=crop)`,
      en: `## Overview

A monitoring system for IoT sensor data, server metrics, and business KPIs in a single dashboard.

Technical Architecture:
• Data Layer — Go server executes aggregate queries on ClickHouse, pushing real-time data via WebSocket at 1-second intervals
• Table — TanStack Virtual for 100K row virtual scrolling. Column sorting, filtering, and pinning handled server-side to save client memory
• Charts — D3.js + Canvas rendering. Chose Canvas over SVG for 60fps rendering of thousands of data points
• Widget Layout — react-grid-layout for drag-based widget placement, user layouts saved to localStorage + server

![Overview](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop)

## Challenges

1. WebSocket Message Flooding — 50 sensors sending data per second meant 50 messages/sec. Re-rendering charts per message pushed CPU to 100%.

2. D3.js Memory Leak — Chart data accumulated over time, increasing browser tab memory by 200MB/hour. In 24-hour monitoring environments, browser crashes occurred.

3. Chart Breakage on Widget Resize — Changing widget size in react-grid-layout caused D3.js chart viewBox to not respond immediately, resulting in clipped or empty charts.

![Challenges](https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=700&fit=crop)

## Solutions

1. Message Batching + RAF Scheduling — Batched WebSocket messages in 100ms windows, applying bulk updates in requestAnimationFrame callbacks. Reduced per-second renders from 50 to max 10 while maintaining real-time data with zero loss.

2. Ring Buffer Pattern — Managed chart data in a fixed-length array (latest 3,600 entries = 1 hour). New data overwrites the oldest entry in a circular structure, completely preventing memory growth.

3. ResizeObserver + Debounced Reflow — Attached ResizeObserver to widget containers, updating D3.js width/height and recalculating scales after a 150ms debounce on resize completion. Applied CSS scale transform during resize for visual continuity.

![Solutions](https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1200&h=700&fit=crop)`,
    },
    gallery: [
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=800&fit=crop",
    ],
  },
];

// 상수
export const PROJECT_COUNT = projects.length;
export const INFINITE_SCROLL_SETS = 10;
export const LONG_PRESS_DURATION = 800;
export const INITIAL_MARGIN = 50;

// 무한 스크롤 배열 생성
export const allProjects = Array(INFINITE_SCROLL_SETS).fill(projects).flat();

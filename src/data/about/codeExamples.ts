import type { CodeExample } from "./types";
import { codeDemoFiles } from "./codeDemoFiles";

export const codeExamples: CodeExample[] = [
  {
    title: "StaggerText Component",
    description: {
      ko: "텍스트에 마우스를 올리면 글자가 왼쪽부터 차례로 **외곽선만 남으며 비워지고**, 마우스를 떼면 **오른쪽부터 역순으로 색이 다시 채워집니다**. 한꺼번에 바뀌는 것이 아니라 글자마다 **0.04초씩 시간차**를 두어 도미노처럼 퍼지는 느낌을 줍니다.",
      en: "When you hover over text, letters **empty out to just outlines** from left to right. When you move away, colors **fill back in reverse order**. Each letter changes with a **0.04-second delay** after the previous one, creating a **domino-like ripple effect**.",
    },
    language: "javascript",
    code: `// 호버: 순방향 (첫 글자 → 마지막)
// 해제: 역방향 (마지막 → 첫 글자), stroke 유지
const forwardDelay = i * 0.04;
const reverseDelay = (totalChars - 1 - i) * 0.04;
const delay = isHovered ? forwardDelay : reverseDelay;

// CSS: step-end로 즉시 전환
.char { transition: color 0.01s step-end; }
.charHovered { color: transparent; -webkit-text-stroke: 1px; }
.charExiting { -webkit-text-stroke: 1px; } // stroke 유지`,
    demoMode: "sandbox",
    demoFiles: codeDemoFiles.staggerText,
  },
  {
    title: "SSR + ISR Server Component",
    description: {
      ko: "블로그 목록과 상세 페이지를 **Server Component로 전환**하여 초기 데이터를 서버에서 렌더링합니다. 목록은 **60초마다 재검증(ISR)**하고, 상세 페이지는 빌드 시 **35개 이상의 정적 HTML을 미리 생성**합니다. 클라이언트에서 4개의 API를 순차 호출하던 워터폴이 서버에서 **`Promise.all` 병렬 fetch로 대체**되어 TTFB가 크게 개선됩니다.",
      en: "Blog list and detail pages are converted to **Server Components** that render initial data on the server. The list **revalidates every 60 seconds (ISR)**, while detail pages **pre-generate 35+ static HTML files** at build time. The client-side waterfall of 4 sequential API calls is replaced by **`Promise.all` parallel fetch on the server**, significantly improving TTFB.",
    },
    language: "tsx",
    code: `// 서버 컴포넌트 — 빌드 시 정적 생성 + ISR 재검증
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function PostDetailPage({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  return <PostDetailClient post={post} />;
}
// → 클라이언트는 이미 렌더된 HTML을 받아 즉시 표시`,
    /* 서버 렌더링은 클라이언트 샌드박스로 시연할 수 없다. 무관한 데모를 붙이는 대신
       데모 칸을 비워 코드가 전체 폭을 쓰게 한다. */
  },
  {
    title: "Infinite Scroll Wrapping",
    description: {
      ko: "프로젝트 카드가 **좌우 어느 방향으로든 끝없이 순환**하는 가로 갤러리입니다. 같은 카드를 여러 세트 복제해 놓고, 스크롤이 끝에 가까워지면 **눈에 보이지 않게 위치를 되감아** 처음으로 돌려놓습니다. 사용자는 끊김 없이 계속 스크롤할 수 있습니다.",
      en: "A horizontal gallery where project cards **loop endlessly in both directions**. The same cards are duplicated in sets, and when you scroll near the edge, the position is **silently reset** so you never reach the end. The result is a **seamless infinite scroll** experience.",
    },
    language: "javascript",
    code: `// 연속된 인트로 간 거리로 한 세트 너비 계산
const introEls = slider.querySelectorAll('.intro');
const oneSetWidth = introEls[1].offsetLeft - introEls[0].offsetLeft;

// rAF 루프에서 양방향 래핑
while (scrollX > oneSetWidth * 3) {
  scrollX -= oneSetWidth;
  targetScrollX -= oneSetWidth;
}
while (scrollX < -oneSetWidth * 3) {
  scrollX += oneSetWidth;
  targetScrollX += oneSetWidth;
}`,
    demoMode: "sandbox",
    demoFiles: codeDemoFiles.infiniteScroll,
  },
  {
    title: "Pinned Scroll Panels",
    description: {
      ko: "About 페이지의 패널은 **화면보다 넓게** 만들어 두고, 세로로 스크롤하면 가로로 지나갑니다. 그대로 두면 글자가 같이 밀려나가므로 **밀려난 만큼 콘텐츠를 반대로 되밀어** 제자리에 고정된 것처럼 보이게 했습니다. 진행도는 **0~1로 환산해 현재 항목 번호**가 되고, 점을 누르면 그 위치로 스크롤합니다.",
      en: "About page panels are built **wider than the screen**, so scrolling down moves them sideways. Left alone the text would slide away, so the content is **pushed back by exactly the amount it shifted**, making it look pinned in place. Progress maps to **0-1 and becomes the active index**, and clicking a dot scrolls to that position.",
    },
    language: "javascript",
    code: `// _hooks/usePinnedScroll.ts — 카운터 트랜슬레이션 + 진행도 → activeIndex
const update = () => {
  const rect = panelRef.current.getBoundingClientRect();
  // 패널이 뷰포트보다 넓은 만큼이 "지나갈 거리"
  const extraWidth = rect.width - window.innerWidth;

  if (extraWidth > 0) {
    // 왼쪽으로 밀려난 만큼 콘텐츠를 오른쪽으로 되밀어 고정된 것처럼
    const offset = Math.max(0, Math.min(-rect.left, extraWidth));
    contentRef.current.style.transform = \`translateX(\${offset}px)\`;

    // 진행도 0~1 → 현재 항목 번호
    const progress = Math.max(0, Math.min(1, -rect.left / extraWidth));
    const newIndex = Math.min(itemCount - 1, Math.floor(progress * itemCount));
    if (newIndex !== prevIndex) {
      prevIndex = newIndex;
      setActiveIndex(newIndex);
    }
  }
  rafId = requestAnimationFrame(update);
};

// 점 클릭 → 해당 항목이 화면 중앙에 오도록 스크롤
const scrollToItem = (index) => {
  const targetProgress = (index + 0.5) / itemCount;
  const delta = rect.left - -(targetProgress * extraWidth);
  scrollBy ? scrollBy(delta) : window.scrollTo({ top: scrollY + delta });
};`,
    demoMode: "sandbox",
    demoFiles: codeDemoFiles.pinnedScroll,
  },
  {
    title: "3D Scroll Torus (Lissajous Curve)",
    description: {
      ko: "스크롤할 때마다 3D 토러스가 **화면 안에서 끝없이 떠다니는** 효과입니다. X와 Y 축에 **서로 다른 주파수의 사인파**를 적용하여 리사주 곡선을 그리며, 화면 밖으로 나가지 않으면서도 **반복되지 않는 유기적인 궤적**을 만듭니다. Lenis 무한 스크롤의 **누적 거리를 추적**하여 스크롤 방향에 관계없이 연속적으로 움직입니다.",
      en: "A 3D torus that **floats endlessly within the viewport** as you scroll. By applying **sine waves with different frequencies** to the X and Y axes, it traces a Lissajous curve — staying on-screen while creating an **organic, non-repeating trajectory**. It tracks **cumulative Lenis scroll distance** so the torus moves continuously regardless of scroll direction.",
    },
    language: "tsx",
    code: `// Lenis 누적 스크롤 추적 (무한 스크롤 래핑 감지)
const currentNorm = scroll / limit;
let delta = currentNorm - lastNorm;
if (delta > 0.5) delta -= 1;      // 뒤로 래핑
else if (delta < -0.5) delta += 1; // 앞으로 래핑
cumulativeRef.current += delta;

// 리사주 곡선: X·Y 주파수가 다르면 무한 궤도
const t = getCumulative();
const x = Math.sin(t * 0.7 * Math.PI * 2) * 3.5;
const y = Math.cos(t * 1.1 * Math.PI * 2) * 3.0;
const z = Math.sin(t * 0.4 * Math.PI * 2) * 1.5 - 2;

// 메탈릭 머티리얼 + 환경 반사
<Environment preset="city" />
<meshStandardMaterial
  metalness={1.0} roughness={0.08}
  envMapIntensity={1.5} />`,
    demoMode: "sandbox",
    demoFiles: codeDemoFiles.scrollTorus,
  },
];

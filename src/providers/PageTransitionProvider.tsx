"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { toRoutePath, useRoutePathname } from "@/hooks/useRoutePathname";
import { appPathOfHref } from "@/lib/siteHosts";
import MediaThumb from "@/components/ui/MediaThumb";
import { useKeepOnTopRef } from "@/hooks/useTopLayer";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { isLandingPath } from "@/components/works/landing/registry";

/* ── Types ── */
interface MorphTransitionState {
  image: string;
  /* image 가 없을 때 morph 블록의 background — caller 에서 카드 cover 색을 넘기면 그걸,
     안 넘기면 빈 문자열 (placeholder 적용) */
  color: string;
  rect: DOMRect;
  targetId: string;
  /** 넘어갈 주소. 덮개를 언제 걷을지 이 경로가 실제로 커밋됐는지로 정한다.
      제자리 전환(startTransition)이면 null — 기다릴 경로가 없다 */
  href: string | null;
  /** 전환을 시작한 시점의 경로. 리다이렉트로 href 아닌 곳에 닿아도 "넘어갔다"고 보기 위한 기준 */
  fromPath: string;
  phase: "init" | "expand" | "cover" | "morph" | "hold" | "done";
}

/** 랜딩 페이지로 가는 전환 — 참고 사이트(andreasantonsson.dev)처럼 떠나는 페이지가 어두워지는 동안
    바탕색 판이 한쪽에서 밀려 들어와 덮고, 새 페이지가 커밋되면 걷힌다. 제목 글자는 그 뒤에 나타난다(LandingShell) */
type SlideFrom = "right" | "bottom";
interface SlideTransitionState {
  href: string;
  fromPath: string;
  from: SlideFrom;
  /* in: 판이 밀려 들어온다 · cover: 다 덮은 채 커밋을 기다린다 · out: 판이 걷힌다 */
  phase: "in" | "cover" | "out";
}

interface PageTransitionContextValue {
  startTransition: (image: string, rect: DOMRect, targetId: string, color?: string) => void;
  navigateWithTransition: (href: string, image: string, rect: DOMRect, color?: string) => void;
  /** 판이 밀려 들어오는 전환으로 넘어간다(랜딩 페이지의 다음 작업물 · 간략 메뉴) */
  navigateWithSlide: (href: string, from?: SlideFrom) => void;
  /** 이 경로가 판 전환으로 넘어가는 곳인가(RouteViewTransition 이 내용을 갈아 끼울지 정한다). 렌더에서 읽으므로 바꾸지 않는다 */
  isSlideTarget: (path: string) => boolean;
  /** 판 전환이 커밋된 뒤 표시를 지운다 */
  clearSlideTarget: () => void;
  endTransition: () => void;
  isTransitioning: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextValue>({
  startTransition: () => {},
  navigateWithTransition: () => {},
  navigateWithSlide: () => {},
  isSlideTarget: () => false,
  clearSlideTarget: () => {},
  endTransition: () => {},
  isTransitioning: false,
});

export function usePageTransition() {
  return useContext(PageTransitionContext);
}

/* ── Timing ──
 * 흐름: init → expand → (cover) → morph → hold → done (image/color/placeholder 모두 동일)
 *  - expand (auto): rect → fullscreen, backdrop opacity 1
 *  - cover  (가변): 화면을 덮은 채로 새 경로가 커밋되기를 기다린다 — 아래 설명 참고
 *  - morph  (auto): fullscreen → hero 크기 (35vh). backdrop 동시에 opacity 1 → 0
 *                  → loading.tsx 의 header/content skeleton 이 morph 아래로 노출됨
 *  - hold   (가변): morph 블록만 hero 위치에 떠있고, 그 아래로 loading.tsx/real page 보임
 *  - done   (fade): morph 블록만 opacity 0 — backdrop 은 morph 끝에서 이미 사라짐
 *  - SAFETY_MS: DetailLayout mount 안 되어 endTransition 호출 안 될 때의 backstop
 *
 * cover 단계를 둔 이유(#1044). 덮개가 걷히는 시점이 morph 가 끝나는 640ms 로 고정돼 있었는데,
 * 새 경로가 커밋되는 시점은 그 시간표와 아무 관계가 없다. 목록 카드의 링크는 선불러오기를 하지
 * 않으므로 누른 다음에야 RSC 페이로드를 받아오고, 배포본에서 재보니 커밋은 1161ms 였다. 덮개가
 * 걷힌 640ms 부터 그때까지, 히어로 블록 아래로 떠나온 목록 페이지가 그대로 보였다. 그래서 확대가
 * 끝났는데 아직 안 넘어갔으면 화면을 덮은 채로 기다리고, 커밋을 확인한 뒤에 morph 를 시작한다.
 *  - COVER_MAX_MS: 커밋이 끝내 오지 않을 때(라우팅 실패 등) 덮개에 갇히지 않게 하는 상한 */
const EXPAND_MS = 380;
const MORPH_MS = 260;
const FADE_MS = 170;
const SAFETY_MS = 5000;
const COVER_MAX_MS = 4000;
/* 판 전환 — 밀려 들어오는 데 SLIDE_IN_MS, 걷히는 데 SLIDE_OUT_MS. 곡선은 부드럽게 출발해 부드럽게 멈춘다(_base.css 의 --slide-ease 와 같다) */
const SLIDE_IN_MS = 700;
const SLIDE_OUT_MS = 240;
const SLIDE_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
/* View Transition 판 — 누른 때부터 새 화면이 다 덮을 때까지(_base.css --slide-duration 750ms).
   이때까지 새 페이지의 등장 연출을 멈춰 두고, 덮기가 끝나 갈 즈음 제목이 들어오게 한다(참고 사이트는 700ms 무렵 첫 글자가 비친다).
   커밋 뒤 효과에서 재면 효과가 전환 뒤로 밀려 덮은 뒤 빈 화면이 300ms 남았다 — 누른 때부터 잰다 */
const SLIDE_VIEW_MS = 650;

/** 주소에서 앱 경로만 — 블로그 절대 주소는 /posts/… 로 읽고, 쿼리·해시를 떼고 퍼센트 인코딩을 푼다.
    usePathname 과 window.location.pathname 은 한글 슬러그에서 인코딩이 갈리므로 맞춰 놓고 비교한다 */
function pathOf(rawHref: string): string {
  const href = appPathOfHref(rawHref);
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MorphTransitionState | null>(null);
  const [slide, setSlide] = useState<SlideTransitionState | null>(null);
  /* View Transition 으로 넘어가는 주소 — RouteViewTransition 이 이 주소에 닿는 커밋에서만 내용을 갈아 끼운다 */
  const slideTargetRef = useRef<string | null>(null);
  /* 판 전환이 도는 중(누른 때부터 새 화면이 다 덮을 때까지) — 그동안 새 페이지의 제목 등장을 멈춰 둔다(참고 사이트처럼 덮은 뒤에 나타난다) */
  const [viewSliding, setViewSliding] = useState(false);
  /* 판 전환을 푸는 타이머는 따로 둔다 — 다른 전환이 clearTimers 로 지우면 등장 연출이 멈춘 채 남는다 */
  const viewSlideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseViewSlideIn = useCallback((ms: number) => {
    if (viewSlideTimerRef.current) clearTimeout(viewSlideTimerRef.current);
    viewSlideTimerRef.current = setTimeout(() => setViewSliding(false), ms);
  }, []);
  const siteConfig = useSiteConfig();
  const detailStyle = siteConfig.works?.detailStyle;
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /* 새 페이지가 morph 보다 먼저 준비되면 morph 끝나는 즉시 done 으로 직행 */
  const endRequestedRef = useRef(false);
  const router = useRouter();

  const clearTimers = () => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  };

  const endTransition = useCallback(() => {
    endRequestedRef.current = true;
    setState((prev) => {
      if (!prev) return null;
      if (prev.phase === "done") return prev;
      /* hold 상태면 곧장 done; 아니면 자동 진행 중이므로 hold 도달 후 처리 */
      if (prev.phase === "hold") {
        clearTimers();
        return { ...prev, phase: "done" };
      }
      return prev;
    });
  }, []);

  const startTransition = useCallback((image: string, rect: DOMRect, targetId: string, color: string = "") => {
    clearTimers();
    endRequestedRef.current = false;
    setState({ image, color, rect, targetId, href: null, fromPath: pathOf(toRoutePath(window.location.pathname)), phase: "init" });
    const safety = setTimeout(() => endTransition(), SAFETY_MS);
    timerRef.current.push(safety);
  }, [endTransition]);

  /* 덮개의 단계 효과가 렌더마다 다시 돌지 않게 고정된 함수로 넘긴다 */
  const setSlidePhase = useCallback((phase: SlideTransitionState["phase"]) => {
    setSlide((prev) => prev ? { ...prev, phase } : null);
  }, []);
  const clearSlide = useCallback(() => setSlide(null), []);

  const isSlideTarget = useCallback((path: string) => slideTargetRef.current !== null && slideTargetRef.current === pathOf(path), []);
  const clearSlideTarget = useCallback(() => {
    slideTargetRef.current = null;
  }, []);

  const navigateWithSlide = useCallback((href: string, from: SlideFrom = "right") => {
    clearTimers();
    setState(null);
    const fromPath = pathOf(toRoutePath(window.location.pathname));
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    /* 브라우저가 View Transition 을 지원하고 다음 화면도 랜딩이면 — 참고 사이트처럼 밀려 들어오는 판이 곧 다음 페이지의 실제 화면이다.
       React 의 <ViewTransition>(RouteViewTransition)이 새 페이지가 커밋되는 순간 떠나는 화면과 새 화면을 찍어 미끄러뜨린다.
       그래서 받아오는 동안 화면이 멈추지 않는다. 방향은 transitionTypes 로 넘긴다(_base.css).
       랜딩이 아닌 곳(메뉴의 Works · About · 홈)은 커밋 뒤에도 Suspense · 3D 준비 화면 · 등장 연출이 이어져,
       찍힌 새 화면이 빈 판이었고 준비 화면(검은 화면)과 두 번째 전환이 뒤따랐다 — 그런 곳은 아래 바탕색 판이 덮은 채로 넘어간다 */
    if (typeof document.startViewTransition === "function" && !reduceMotion && isLandingPath(pathOf(href), detailStyle)) {
      slideTargetRef.current = pathOf(href);
      setViewSliding(true);
      releaseViewSlideIn(SLIDE_VIEW_MS);
      router.push(href, { transitionTypes: [`slide-${from}`] });
      return;
    }
    /* 지원하지 않거나 랜딩이 아닌 곳이면 바탕색 판으로 */
    setSlide({ href, from, fromPath, phase: "in" });
    /* 받아오기는 지금 시작하고(prefetch), 넘어가기는 판이 화면을 다 덮은 뒤에 — 판이 반쯤 들어온 사이에
       커밋되면 아직 덮이지 않은 쪽으로 새 페이지의 로딩 화면이 비쳤다 */
    router.prefetch(href);
    timerRef.current.push(setTimeout(() => router.push(href), reduceMotion ? 0 : SLIDE_IN_MS));
  }, [router, releaseViewSlideIn, detailStyle]);

  const navigateWithTransition = useCallback((href: string, image: string, rect: DOMRect, color: string = "") => {
    /* 랜딩으로 그리는 작업물이면 커버가 커지는 연출 대신 판 전환 — 랜딩에는 커버 히어로가 없어 줄어들 자리가 없다 */
    if (isLandingPath(pathOf(href), detailStyle)) {
      navigateWithSlide(href, "right");
      return;
    }
    clearTimers();
    endRequestedRef.current = false;
    setState({ image, color, rect, targetId: href, href, fromPath: pathOf(toRoutePath(window.location.pathname)), phase: "init" });
    /* 누르는 즉시 넘어간다. 예전에는 확대가 끝나는 380ms 까지 미뤘는데, 페이로드를 받아오는 건
       그때부터라 대기가 고스란히 뒤에 붙었다. 연출은 화면에 고정된 덮개가 하는 것이라 새 페이지가
       언제 들어오든 흔들리지 않으므로, 받아오는 시간을 확대 연출과 겹치게 한다 */
    router.push(href);
    const safety = setTimeout(() => endTransition(), SAFETY_MS);
    timerRef.current.push(safety);
  }, [router, endTransition, detailStyle, navigateWithSlide]);

  /* done 진입 시 fade-out 끝나면 overlay unmount */
  useEffect(() => {
    if (state?.phase !== "done") return;
    const t = setTimeout(() => setState(null), FADE_MS);
    return () => clearTimeout(t);
  }, [state?.phase]);

  useEffect(() => () => clearTimers(), []);

  return (
    <PageTransitionContext.Provider
      value={{
        startTransition,
        navigateWithTransition,
        navigateWithSlide,
        isSlideTarget,
        clearSlideTarget,
        endTransition,
        /* 판 전환은 걷히기 시작하면(out) 끝난 것으로 — 그때부터 새 페이지의 등장 연출이 돈다 */
        isTransitioning: (state !== null && state.phase !== "done") || (slide !== null && slide.phase !== "out") || viewSliding,
      }}
    >
      {children}
      {slide && (
        <SlideOverlay state={slide} onPhase={setSlidePhase} onDone={clearSlide} />
      )}
      {state && (
        <TransitionOverlay
          state={state}
          onPhase={(phase) => setState((prev) => prev ? { ...prev, phase } : null)}
          endRequestedRef={endRequestedRef}
        />
      )}
    </PageTransitionContext.Provider>
  );
}

/* ── Overlay ── */
function TransitionOverlay({
  state,
  onPhase,
  endRequestedRef,
}: {
  state: MorphTransitionState;
  onPhase: (phase: MorphTransitionState["phase"]) => void;
  endRequestedRef: React.MutableRefObject<boolean>;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  /* 늘 맨 위(3.10-1) — 모달 · 팝오버 위로. 틀 1, 그 위에 그림 블록 1 */
  const topBackdropRef = useKeepOnTopRef<HTMLDivElement>(1, backdropRef);
  const topElRef = useKeepOnTopRef<HTMLDivElement>(1, elRef);
  const { phase, rect, image, color, href, fromPath } = state;
  /* 이 컴포넌트는 전환하는 동안만 떠 있다 — 경로 구독도 여기서만 한다.
     라우터가 새 트리를 커밋할 때 이 값이 바뀌고, 그게 곧 "넘어갔다"는 신호다. */
  const pathname = useRoutePathname();
  /* 아직 출발 경로 그대로면 안 넘어간 것. 리다이렉트로 href 아닌 데 닿았어도 경로가 달라졌으면 넘어간 것으로 본다 */
  const here = pathOf(pathname);
  const navPending = href !== null && here === fromPath && here !== pathOf(href);
  /* 확대가 끝나는 시점에 읽을 최신값 — 타이머 안에서 보려면 렌더에 묶이지 않은 자리가 필요하다 */
  const navPendingRef = useRef(navPending);
  useEffect(() => {
    navPendingRef.current = navPending;
  }, [navPending]);

  useEffect(() => {
    if (phase !== "init") return;
    const el = elRef.current;
    if (!el) return;

    /* backdrop 즉시 불투명 — 출발 페이지 위에 깜빡 없이 cover */
    if (backdropRef.current) {
      backdropRef.current.style.transition = "none";
      backdropRef.current.style.opacity = "1";
    }

    el.style.top = `${rect.top}px`;
    el.style.left = `${rect.left}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.borderRadius = "8px";
    el.style.opacity = "1";
    el.style.transition = "none";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onPhase("expand");
      });
    });
  }, [phase, rect, onPhase]);

  useEffect(() => {
    if (phase !== "expand") return;
    const el = elRef.current;
    if (!el) return;

    el.style.transition = `top ${EXPAND_MS}ms cubic-bezier(0.4,0,0.2,1), left ${EXPAND_MS}ms cubic-bezier(0.4,0,0.2,1), width ${EXPAND_MS}ms cubic-bezier(0.4,0,0.2,1), height ${EXPAND_MS}ms cubic-bezier(0.4,0,0.2,1), border-radius ${EXPAND_MS}ms cubic-bezier(0.4,0,0.2,1)`;
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "100vw";
    el.style.height = "100dvh";
    el.style.borderRadius = "0";

    if (overlayRef.current) {
      overlayRef.current.style.transition = `opacity ${EXPAND_MS}ms ease`;
      overlayRef.current.style.opacity = "1";
    }

    /* 확대가 끝나도 아직 안 넘어갔으면 덮은 채로 기다린다(cover). navPending 을 여기서 읽지 않는
       이유는, 확대가 도는 380ms 사이에 커밋이 올 수 있어서다 — 타이머가 도는 시점의 값을 봐야 한다 */
    const t = setTimeout(() => onPhase(navPendingRef.current ? "cover" : "morph"), EXPAND_MS);
    return () => clearTimeout(t);
  }, [phase, onPhase]);

  /* cover: 새 경로가 커밋되면 morph 로. 두 프레임 미루는 건 새 트리가 덮개 아래에서 먼저
     그려지게 하려는 것이다 — 커밋 직후에 덮개를 걷기 시작하면 아직 빈 화면이 비친다 */
  useEffect(() => {
    if (phase !== "cover" || navPending) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => onPhase("morph"));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [phase, navPending, onPhase]);

  /* 커밋이 끝내 오지 않아도 덮개에 갇히지는 않게 */
  useEffect(() => {
    if (phase !== "cover") return;
    const t = setTimeout(() => onPhase("morph"), COVER_MAX_MS);
    return () => clearTimeout(t);
  }, [phase, onPhase]);

  useEffect(() => {
    if (phase !== "morph") return;
    const el = elRef.current;
    if (!el) return;

    /* morph: fullscreen → hero(35vh). 동시에 backdrop fade 1→0 —
       끝나는 시점에 morph 블록만 hero 위치에 떠있고, 그 아래로 loading.tsx 보임 */
    const heroH = Math.max(240, window.innerHeight * 0.35);
    el.style.transition = `height ${MORPH_MS}ms cubic-bezier(0.4,0,0.2,1)`;
    el.style.height = `${heroH}px`;

    if (backdropRef.current) {
      backdropRef.current.style.transition = `opacity ${MORPH_MS}ms ease`;
      backdropRef.current.style.opacity = "0";
    }

    /* morph 끝났을 때 endTransition 이 이미 호출됐다면 hold 건너뛰고 즉시 done */
    const t = setTimeout(() => {
      if (endRequestedRef.current) {
        endRequestedRef.current = false;
        onPhase("done");
      } else {
        onPhase("hold");
      }
    }, MORPH_MS);
    return () => clearTimeout(t);
  }, [phase, onPhase, endRequestedRef]);

  useEffect(() => {
    if (phase !== "done") return;
    const el = elRef.current;
    if (!el) return;

    /* backdrop 은 morph 단계에서 이미 0 — 여기서는 morph 블록만 fade out */
    el.style.transition = `opacity ${FADE_MS}ms ease`;
    el.style.opacity = "0";
  }, [phase]);

  /* image > color > placeholder(--bg-tertiary) 순으로 morph 블록 채움 */
  const fillBg = color || "var(--bg-tertiary)";

  return (
    <>
    <div
      ref={topBackdropRef}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-primary)",
        opacity: 1,
        pointerEvents: "none",
      }}
    />
    <div
      ref={topElRef}
      style={{
        position: "fixed",
        overflow: "hidden",
        pointerEvents: "none",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 8,
      }}
    >
      {image ? (
        <MediaThumb
          src={image}
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
          priority
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: fillBg,
          }}
        />
      )}
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 20%), linear-gradient(to bottom, transparent 30%, var(--bg-primary) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
    </>
  );
}

/* ── 판 전환 덮개 ── */
function SlideOverlay({
  state,
  onPhase,
  onDone,
}: {
  state: SlideTransitionState;
  onPhase: (phase: SlideTransitionState["phase"]) => void;
  onDone: () => void;
}) {
  const scrimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /* 늘 맨 위(3.10-1) — 어두운 막 위에 판 */
  const topScrimRef = useKeepOnTopRef<HTMLDivElement>(1, scrimRef);
  const topPanelRef = useKeepOnTopRef<HTMLDivElement>(1, panelRef);
  const { phase, from, href, fromPath } = state;
  const pathname = useRoutePathname();
  const here = pathOf(pathname);
  const navPending = here === fromPath && here !== pathOf(href);
  const navPendingRef = useRef(navPending);
  useEffect(() => {
    navPendingRef.current = navPending;
  }, [navPending]);

  /* in: 다음 프레임에 판을 제자리로, 막을 어둡게 — 끝났을 때 아직 안 넘어갔으면 cover 로 기다린다 */
  useEffect(() => {
    if (phase !== "in") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 0 : SLIDE_IN_MS;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const panel = panelRef.current;
        const scrim = scrimRef.current;
        if (panel) {
          panel.style.transition = `transform ${ms}ms ${SLIDE_EASE}`;
          panel.style.transform = "none";
        }
        if (scrim) {
          scrim.style.transition = `opacity ${ms}ms ${SLIDE_EASE}`;
          scrim.style.opacity = "0.55";
        }
      });
    });
    const t = setTimeout(() => onPhase(navPendingRef.current ? "cover" : "out"), ms);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
  }, [phase, onPhase]);

  /* cover: 커밋되면 두 프레임 뒤(새 트리가 판 아래에서 먼저 그려지게) 걷는다. 끝내 안 오면 상한에서 걷는다 */
  useEffect(() => {
    if (phase !== "cover") return;
    const t = setTimeout(() => onPhase("out"), COVER_MAX_MS);
    if (navPending) return () => clearTimeout(t);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => onPhase("out"));
    });
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [phase, navPending, onPhase]);

  /* out: 새 페이지 맨 위에서 판을 옅게 걷는다(판은 페이지 바탕색이라 이어져 보인다) */
  useEffect(() => {
    if (phase !== "out") return;
    window.scrollTo(0, 0);
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (scrim) {
      scrim.style.transition = "none";
      scrim.style.opacity = "0";
    }
    if (panel) {
      panel.style.transition = `opacity ${SLIDE_OUT_MS}ms ease`;
      panel.style.opacity = "0";
    }
    const t = setTimeout(onDone, SLIDE_OUT_MS);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  return (
    <>
      <div
        ref={topScrimRef}
        data-nav-tone-skip
        style={{ position: "fixed", inset: 0, background: "var(--bg-black)", opacity: 0, pointerEvents: "none" }}
      />
      <div
        ref={topPanelRef}
        data-nav-tone-skip
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--bg-primary)",
          transform: from === "bottom" ? "translateY(100%)" : "translateX(100%)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

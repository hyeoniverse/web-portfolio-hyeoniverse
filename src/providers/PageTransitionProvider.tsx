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
import { useRoutePathname } from "@/hooks/useRoutePathname";
import MediaThumb from "@/components/ui/MediaThumb";

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

interface PageTransitionContextValue {
  startTransition: (image: string, rect: DOMRect, targetId: string, color?: string) => void;
  navigateWithTransition: (href: string, image: string, rect: DOMRect, color?: string) => void;
  endTransition: () => void;
  isTransitioning: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextValue>({
  startTransition: () => {},
  navigateWithTransition: () => {},
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

/** 주소에서 경로만 — 쿼리·해시를 떼고 퍼센트 인코딩을 푼다.
    usePathname 과 window.location.pathname 은 한글 슬러그에서 인코딩이 갈리므로 맞춰 놓고 비교한다 */
function pathOf(href: string): string {
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
    setState({ image, color, rect, targetId, href: null, fromPath: pathOf(window.location.pathname), phase: "init" });
    const safety = setTimeout(() => endTransition(), SAFETY_MS);
    timerRef.current.push(safety);
  }, [endTransition]);

  const navigateWithTransition = useCallback((href: string, image: string, rect: DOMRect, color: string = "") => {
    clearTimers();
    endRequestedRef.current = false;
    setState({ image, color, rect, targetId: href, href, fromPath: pathOf(window.location.pathname), phase: "init" });
    /* 누르는 즉시 넘어간다. 예전에는 확대가 끝나는 380ms 까지 미뤘는데, 페이로드를 받아오는 건
       그때부터라 대기가 고스란히 뒤에 붙었다. 연출은 화면에 고정된 덮개가 하는 것이라 새 페이지가
       언제 들어오든 흔들리지 않으므로, 받아오는 시간을 확대 연출과 겹치게 한다 */
    router.push(href);
    const safety = setTimeout(() => endTransition(), SAFETY_MS);
    timerRef.current.push(safety);
  }, [router, endTransition]);

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
        endTransition,
        isTransitioning: state !== null && state.phase !== "done",
      }}
    >
      {children}
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
    el.style.height = "100vh";
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
      ref={backdropRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-top)",
        background: "var(--bg-primary)",
        opacity: 1,
        pointerEvents: "none",
      }}
    />
    <div
      ref={elRef}
      style={{
        position: "fixed",
        overflow: "hidden",
        zIndex: "var(--z-top)",
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

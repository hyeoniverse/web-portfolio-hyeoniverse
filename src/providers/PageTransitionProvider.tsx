"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

/* ── Types ── */
interface TransitionState {
  image: string;
  rect: DOMRect;
  targetId: string;
  phase: "init" | "expand" | "morph" | "hold" | "done";
}

interface PageTransitionContextValue {
  startTransition: (image: string, rect: DOMRect, targetId: string) => void;
  navigateWithTransition: (href: string, image: string, rect: DOMRect) => void;
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
 * 흐름: init → expand → morph → hold → done
 *  - expand (600ms, auto): rect → fullscreen
 *  - morph  (400ms, auto): fullscreen → hero 크기 (예측 가능한 시점에 축소)
 *  - hold   (가변): backdrop 으로 화면 전체 덮은 채 새 페이지가 준비되길 기다림
 *  - done   (350ms): backdrop + image 함께 fade out
 *
 * Safety 두 단계:
 *  - ROUTE_FAIL_SAFETY_MS: router.push 이후에도 pathname 이 안 바뀔 때 (navigation 자체 실패)
 *  - CONTENT_LOAD_SAFETY_MS: pathname 은 바뀌었지만 DetailLayout 이 mount 못 할 때 (dev 컴파일 / 느린 SSR)
 *      → loading.tsx (Suspense fallback) 이 노출된 상태에서 overlay 가 일찍 사라지면
 *        "이미지 전환 후 skeleton 이 보이는" 증상이 생기므로 충분히 길게 둠. */
const EXPAND_MS = 600;
const MORPH_MS = 400;
const FADE_MS = 350;
const ROUTE_FAIL_SAFETY_MS = 5000;
/** pathname 도착 후 grace — dev 컴파일·콜드 번들·인터넷 느림 모두 커버하도록 충분히 길게. */
const CONTENT_LOAD_SAFETY_MS = 30000;
/** router.push 지연 — expand 가 다 끝난 뒤(=backdrop 완전 opaque)에 navigation 시작.
 *  prefetch 와 결합되면 expand 동안 페이지가 이미 캐시돼 있어 즉시 mount.
 *  더 빨리 발화하면 반투명 backdrop 사이로 loading.tsx skeleton 이 잠깐 노출됨. */
const NAV_DELAY = EXPAND_MS;
const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TransitionState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /* 새 페이지가 morph 보다 먼저 준비되면 morph 끝나는 즉시 done 으로 직행 */
  const endRequestedRef = useRef(false);
  /* pathname 이 targetId 로 바뀐 순간 = navigation 도착. 한 번만 처리하도록 가드. */
  const arrivedRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

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

  const startTransition = useCallback((image: string, rect: DOMRect, targetId: string) => {
    clearTimers();
    endRequestedRef.current = false;
    arrivedRef.current = false;
    setState({ image: image || PLACEHOLDER_IMAGE, rect, targetId, phase: "init" });
    const safety = setTimeout(() => endTransition(), ROUTE_FAIL_SAFETY_MS);
    timerRef.current.push(safety);
  }, [endTransition]);

  const navigateWithTransition = useCallback((href: string, image: string, rect: DOMRect) => {
    clearTimers();
    endRequestedRef.current = false;
    arrivedRef.current = false;
    setState({ image: image || PLACEHOLDER_IMAGE, rect, targetId: href, phase: "init" });
    const t = setTimeout(() => router.push(href), NAV_DELAY);
    timerRef.current.push(t);
    /* router.push 후에도 pathname 안 바뀌는 경우 = navigation 자체 실패 → backstop */
    const safety = setTimeout(() => endTransition(), NAV_DELAY + ROUTE_FAIL_SAFETY_MS);
    timerRef.current.push(safety);
  }, [router, endTransition]);

  /* pathname 도착 감지 + 실제 detail hero 노출 감지.
   *  1) ROUTE_FAIL_SAFETY 제거 후, CONTENT_LOAD_SAFETY 만 backstop 으로 남김
   *  2) MutationObserver 로 [data-detail-hero] 요소가 DOM 에 들어오면 즉시 endTransition
   *     → DetailLayout 의 useEffect 보다 빠르고 확실 (Suspense fallback 이 가려도 본 hero 만 잡힘) */
  useEffect(() => {
    if (!state || state.phase === "done") return;
    if (arrivedRef.current) return;
    const targetBase = state.targetId.split(/[?#]/)[0];
    const arrived =
      pathname === targetBase ||
      (pathname && targetBase && pathname.startsWith(targetBase + "/"));
    if (!arrived) return;
    arrivedRef.current = true;
    clearTimers();

    /* hero 가 이미 DOM 에 있으면 (페이지가 super fast 한 경우) 즉시 종료 */
    if (document.querySelector("[data-detail-hero]")) {
      const t = setTimeout(() => endTransition(), 0);
      timerRef.current.push(t);
      return;
    }

    /* [data-detail-hero] 가 DOM 에 들어오는 순간 = 새 페이지 hero 노출 → fade-out 안전 */
    const observer = new MutationObserver(() => {
      if (document.querySelector("[data-detail-hero]")) {
        observer.disconnect();
        endTransition();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    /* hero 가 영영 안 나타나는 경우의 backstop */
    const safety = setTimeout(() => {
      observer.disconnect();
      endTransition();
    }, CONTENT_LOAD_SAFETY_MS);
    timerRef.current.push(safety);

    return () => observer.disconnect();
  }, [pathname, state, endTransition]);

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
  state: TransitionState;
  onPhase: (phase: TransitionState["phase"]) => void;
  endRequestedRef: React.MutableRefObject<boolean>;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { phase, rect, image } = state;

  useEffect(() => {
    if (phase !== "init") return;
    const el = elRef.current;
    if (!el) return;

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

    if (backdropRef.current) {
      backdropRef.current.style.transition = `opacity ${EXPAND_MS * 0.3}ms ease`;
      backdropRef.current.style.opacity = "1";
    }
    if (overlayRef.current) {
      overlayRef.current.style.transition = `opacity ${EXPAND_MS}ms ease`;
      overlayRef.current.style.opacity = "1";
    }

    const t = setTimeout(() => onPhase("morph"), EXPAND_MS);
    return () => clearTimeout(t);
  }, [phase, onPhase]);

  useEffect(() => {
    if (phase !== "morph") return;
    const el = elRef.current;
    if (!el) return;

    const heroH = Math.max(240, window.innerHeight * 0.35);
    el.style.transition = `height ${MORPH_MS}ms cubic-bezier(0.4,0,0.2,1)`;
    el.style.height = `${heroH}px`;

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

    el.style.transition = `opacity ${FADE_MS}ms ease`;
    el.style.opacity = "0";

    if (backdropRef.current) {
      backdropRef.current.style.transition = `opacity ${FADE_MS}ms ease`;
      backdropRef.current.style.opacity = "0";
    }
  }, [phase]);

  return (
    <>
    <div
      ref={backdropRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "var(--bg-primary)",
        opacity: 0,
        pointerEvents: "none",
      }}
    />
    <div
      ref={elRef}
      style={{
        position: "fixed",
        overflow: "hidden",
        zIndex: 9999,
        pointerEvents: "none",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 8,
      }}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="100vw"
        style={{ objectFit: "cover" }}
        priority
      />
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

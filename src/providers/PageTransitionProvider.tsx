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
import Image from "next/image";

/* ── Types ── */
interface TransitionState {
  image: string;
  /* image 가 없을 때 morph 블록의 background — caller 에서 카드 cover 색을 넘기면 그걸,
     안 넘기면 빈 문자열 (placeholder 적용) */
  color: string;
  rect: DOMRect;
  targetId: string;
  phase: "init" | "expand" | "morph" | "hold" | "done";
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
 * 흐름: init → expand → morph → hold → done (image/color/placeholder 모두 동일)
 *  - expand (auto): rect → fullscreen, backdrop opacity 1
 *  - morph  (auto): fullscreen → hero 크기 (35vh). backdrop 동시에 opacity 1 → 0
 *                  → loading.tsx 의 header/content skeleton 이 morph 아래로 노출됨
 *  - hold   (가변): morph 블록만 hero 위치에 떠있고, 그 아래로 loading.tsx/real page 보임
 *  - done   (fade): morph 블록만 opacity 0 — backdrop 은 morph 끝에서 이미 사라짐
 *  - SAFETY_MS: DetailLayout mount 안 되어 endTransition 호출 안 될 때의 backstop */
const EXPAND_MS = 380;
const MORPH_MS = 260;
const FADE_MS = 170;
const SAFETY_MS = 5000;
const NAV_DELAY = EXPAND_MS;

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TransitionState | null>(null);
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
    setState({ image, color, rect, targetId, phase: "init" });
    const safety = setTimeout(() => endTransition(), SAFETY_MS);
    timerRef.current.push(safety);
  }, [endTransition]);

  const navigateWithTransition = useCallback((href: string, image: string, rect: DOMRect, color: string = "") => {
    clearTimers();
    endRequestedRef.current = false;
    setState({ image, color, rect, targetId: href, phase: "init" });
    /* expand 끝난 후 navigate — image/color/placeholder 모두 동일하게 morph 통과 */
    const t = setTimeout(() => router.push(href), NAV_DELAY);
    timerRef.current.push(t);
    const safety = setTimeout(() => endTransition(), NAV_DELAY + SAFETY_MS);
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
  state: TransitionState;
  onPhase: (phase: TransitionState["phase"]) => void;
  endRequestedRef: React.MutableRefObject<boolean>;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { phase, rect, image, color } = state;

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

    const t = setTimeout(() => onPhase("morph"), EXPAND_MS);
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
        zIndex: 9998,
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
        zIndex: 9999,
        pointerEvents: "none",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 8,
      }}
    >
      {image ? (
        <Image
          src={image}
          alt=""
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

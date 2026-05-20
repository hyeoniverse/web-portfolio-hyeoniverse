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
  rect: DOMRect;
  targetId: string;
  phase: "init" | "expand" | "morph" | "hold" | "done";
}

interface PageTransitionContextValue {
  startTransition: (image: string, rect: DOMRect, targetId: string, color?: string) => void;
  /** color: image 가 없을 때 caller 가 카드 cover 색을 넘기면 morph 블록 background 로 사용.
   *  현재는 시그니처만 받아두고 PLACEHOLDER_IMAGE 폴백 — 본격 morph 재설계는 별도 PR. */
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
 * 흐름: init → expand → morph → hold → done
 *  - expand (600ms, auto): rect → fullscreen
 *  - morph  (400ms, auto): fullscreen → hero 크기
 *  - hold   (가변): backdrop 으로 화면 전체 덮은 채 새 페이지 mount 대기
 *  - done   (350ms): backdrop + image 함께 fade out
 *  - SAFETY_MS: DetailLayout 이 mount 안 되어 endTransition 이 호출 안 될 때의 backstop */
const EXPAND_MS = 600;
const MORPH_MS = 400;
const FADE_MS = 350;
const SAFETY_MS = 5000;
const NAV_DELAY = EXPAND_MS;
const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

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

  const startTransition = useCallback((image: string, rect: DOMRect, targetId: string, _color?: string) => {
    void _color;
    clearTimers();
    endRequestedRef.current = false;
    setState({ image: image || PLACEHOLDER_IMAGE, rect, targetId, phase: "init" });
    const safety = setTimeout(() => endTransition(), SAFETY_MS);
    timerRef.current.push(safety);
  }, [endTransition]);

  const navigateWithTransition = useCallback((href: string, image: string, rect: DOMRect, _color?: string) => {
    void _color;
    clearTimers();
    endRequestedRef.current = false;
    setState({ image: image || PLACEHOLDER_IMAGE, rect, targetId: href, phase: "init" });
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

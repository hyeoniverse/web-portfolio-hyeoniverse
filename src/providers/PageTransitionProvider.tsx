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

/* ── Timing ── */
const EXPAND_MS = 600;
const MORPH_MS = 400;
const FADE_MS = 350;

/* ── Provider ── */
const NAV_DELAY = EXPAND_MS + MORPH_MS;
const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TransitionState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const router = useRouter();

  const clearTimers = () => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  };

  const startTransition = useCallback((image: string, rect: DOMRect, targetId: string) => {
    clearTimers();
    setState({ image: image || PLACEHOLDER_IMAGE, rect, targetId, phase: "init" });
  }, []);

  const navigateWithTransition = useCallback((href: string, image: string, rect: DOMRect) => {
    clearTimers();
    setState({ image: image || PLACEHOLDER_IMAGE, rect, targetId: href, phase: "init" });
    const t = setTimeout(() => router.push(href), NAV_DELAY);
    timerRef.current.push(t);
  }, [router]);

  const endTransition = useCallback(() => {
    clearTimers();
    setState((prev) => prev ? { ...prev, phase: "done" } : null);
    const t = setTimeout(() => setState(null), FADE_MS);
    timerRef.current.push(t);
  }, []);

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
        />
      )}
    </PageTransitionContext.Provider>
  );
}

/* ── Overlay ── */
function TransitionOverlay({
  state,
  onPhase,
}: {
  state: TransitionState;
  onPhase: (phase: TransitionState["phase"]) => void;
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

    if (overlayRef.current) {
      overlayRef.current.style.transition = `opacity ${MORPH_MS}ms ease`;
      overlayRef.current.style.opacity = "1";
    }

    const t = setTimeout(() => onPhase("hold"), MORPH_MS);
    return () => clearTimeout(t);
  }, [phase, onPhase]);

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

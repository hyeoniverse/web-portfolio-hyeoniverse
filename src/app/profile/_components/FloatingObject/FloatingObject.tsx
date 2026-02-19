"use client";

import { Suspense, useMemo, useEffect, useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { useTheme } from "@/providers/ThemeProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import { createSafeRenderer } from "@/utils/three";
import { useLanguage } from "@/providers/LanguageProvider";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import styles from "./FloatingObject.module.css";

const FloatingScene = dynamic(() => import("./FloatingScene"), { ssr: false });

const BUBBLE_OFFSET_Y = -110;

export default function FloatingObject() {
  const { theme } = useTheme();
  const { isMobile, isTouch } = useIsMobile();
  const { t } = useLanguage();
  const activeSection = useProfileSectionStore((s) => s.activeSection);

  const mouseNDC = useRef({ x: 0, y: 0 });
  const pointerActive = useRef(false);
  const screenPosRef = useRef({ x: 0, y: 0 });
  const smileRef = useRef(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  const [bubbleText, setBubbleText] = useState("");
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    const updateNDC = (clientX: number, clientY: number) => {
      mouseNDC.current.x = (clientX / window.innerWidth) * 2 - 1;
      mouseNDC.current.y = -(clientY / window.innerHeight) * 2 + 1;
      pointerActive.current = true;
    };

    const onMouseMove = (e: MouseEvent) => updateNDC(e.clientX, e.clientY);

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updateNDC(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updateNDC(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      pointerActive.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const cameraConfig = useMemo(
    () => ({
      position: [0, 0, 8] as [number, number, number],
      fov: 50,
      near: 0.1,
      far: 100,
    }),
    []
  );

  // Bubble text fade transition on section change
  useEffect(() => {
    if (isMobile) return;
    const text = t(`profilePage.bubble.${activeSection}`);
    setShowBubble(false);
    const tid = window.setTimeout(() => {
      setBubbleText(text);
      setShowBubble(true);
      smileRef.current = true;
    }, 300);
    const smileTid = window.setTimeout(() => {
      smileRef.current = false;
    }, 1800);
    return () => {
      window.clearTimeout(tid);
      window.clearTimeout(smileTid);
    };
  }, [activeSection, t, isMobile]);

  // rAF loop: sync bubble DOM position to bunny screen coords
  const syncBubble = useCallback(() => {
    const el = bubbleRef.current;
    if (el) {
      const x = screenPosRef.current.x;
      const y = screenPosRef.current.y + BUBBLE_OFFSET_Y;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
    rafId.current = requestAnimationFrame(syncBubble);
  }, []);

  useEffect(() => {
    if (isMobile) return;
    rafId.current = requestAnimationFrame(syncBubble);
    return () => cancelAnimationFrame(rafId.current);
  }, [syncBubble, isMobile]);

  const dpr = isTouch
    ? Math.min(
        typeof window !== "undefined" ? window.devicePixelRatio : 1,
        1.5
      )
    : Math.min(
        typeof window !== "undefined" ? window.devicePixelRatio : 1,
        2
      );

  return (
    <div className={styles.overlay}>
      <Canvas
        camera={cameraConfig}
        dpr={dpr}
        gl={(d) =>
          createSafeRenderer(d, {
            alpha: true,
            antialias: !isTouch,
            powerPreference: "high-performance",
          })
        }
        style={{ background: "transparent" }}
        frameloop="always"
      >
        <Suspense fallback={null}>
          <FloatingScene
            theme={theme}
            isMobile={isMobile}
            mouseNDC={mouseNDC}
            pointerActive={pointerActive}
            screenPosRef={screenPosRef}
            smileRef={smileRef}
          />
        </Suspense>
      </Canvas>

      {!isMobile && (
        <div
          ref={bubbleRef}
          className={`${styles.speechBubble} ${showBubble ? styles.speechBubbleVisible : ""}`}
        >
          {bubbleText}
        </div>
      )}
    </div>
  );
}

"use client";

import { Suspense, useMemo, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { useTheme } from "@/providers/ThemeProvider";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "./ScrollTorus.module.css";

const TorusScene = dynamic(() => import("./TorusScene"), { ssr: false });

export default function ScrollTorus() {
  const { theme } = useTheme();
  const { getCumulative } = useScrollProgress();
  const { isMobile, isTouch } = useIsMobile();

  // R3F Canvas의 pointer-events를 차단하므로 window에서 직접 마우스/터치 추적
  const mouseNDC = useRef({ x: 0, y: 0 });
  const pointerActive = useRef(false);

  useEffect(() => {
    const updateNDC = (clientX: number, clientY: number) => {
      mouseNDC.current.x = (clientX / window.innerWidth) * 2 - 1;
      mouseNDC.current.y = -(clientY / window.innerHeight) * 2 + 1;
      pointerActive.current = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateNDC(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updateNDC(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updateNDC(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      pointerActive.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
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

  const dpr = isTouch
    ? Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 1.5)
    : Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);

  return (
    <div className={styles.torusOverlay}>
      <Canvas
        camera={cameraConfig}
        dpr={dpr}
        gl={{
          alpha: true,
          antialias: !isTouch,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
        frameloop="always"
      >
        <Suspense fallback={null}>
          <TorusScene
            getCumulative={getCumulative}
            theme={theme}
            isMobile={isMobile}
            mouseNDC={mouseNDC}
            pointerActive={pointerActive}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

"use client";

import { Suspense, useMemo } from "react";
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
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

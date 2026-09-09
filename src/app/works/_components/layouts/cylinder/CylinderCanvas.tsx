"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import IntroBunny from "../CylinderIntroBunny";
import VerticalCylinder, { TransparentBg, ResponsiveCamera } from "./VerticalCylinder";
import { createIntroDataUrl } from "./scene";
import type { useCylinderStage } from "./useCylinderStage";

/* 무대 훅이 만든 ref 들을 그대로 받는다 — 타입을 따로 적으면 훅이 바뀔 때 어긋난다. */
type Stage = ReturnType<typeof useCylinderStage>;

/* 원통의 3D 부분만 떼어 둔 조각.

   three.js 는 서버에서 그릴 수 없어 ssr: false 로 불러와야 하는데, 그 호출이 화면 본체와
   같은 모듈에 있으면 Next 가 감싸는 Suspense 경계를 통째로 클라이언트 렌더로 넘긴다.
   그러면 3D 가 아닌 인트로 패널·제목 같은 DOM 까지 서버 HTML 에서 빠져, 첫 픽셀이
   자바스크립트 체인이 다 끝난 뒤(실측 5.3초)에야 나온다.

   Canvas 만 이 파일로 옮기고 본체는 정적 import 로 되돌리면, 본체는 서버에서 그려지고
   3D 만 나중에 붙는다. */

interface CylinderCanvasProps {
  canvasClassName: string;
  hoveredItemClassName: string;
  hoveredOverlayClassName: string;
  projectImages: string[];
  isDark: boolean;
  segAngle: number;
  arc: number;
  scrollRef: Stage["scrollRef"];
  mouseRef: Stage["mouseRef"];
  actualRotRef: Stage["actualRotRef"];
  screenPosRef: Stage["screenPosRef"];
  hoverDimRef: Stage["hoverDimRef"];
  slotRefs: Stage["slotRefs"];
  overlayRefs: Stage["overlayRefs"];
  onSlotClick: (projectIdx: number) => void;
}

export default function CylinderCanvas({
  canvasClassName,
  hoveredItemClassName,
  hoveredOverlayClassName,
  projectImages,
  isDark,
  segAngle,
  arc,
  scrollRef,
  mouseRef,
  actualRotRef,
  screenPosRef,
  hoverDimRef,
  slotRefs,
  overlayRefs,
  onSlotClick,
}: CylinderCanvasProps) {
  /* allImages[0] = 인트로, [1..N] = 작품. 인트로는 캔버스로 만들어야 해서 여기서 계산한다. */
  const allImages = useMemo(
    () => [createIntroDataUrl(isDark), ...projectImages],
    [isDark, projectImages],
  );

  return (
    <Canvas
      className={canvasClassName}
      camera={{ position: [0, 0, 9], fov: 55 }}
      gl={{ antialias: true, alpha: true }}
    >
      <TransparentBg />
      <ResponsiveCamera />
      <VerticalCylinder
        allImages={allImages}
        segAngle={segAngle}
        arc={arc}
        scrollRef={scrollRef}
        mouseRef={mouseRef}
        actualRotRef={actualRotRef}
        screenPosRef={screenPosRef}
        dimRef={hoverDimRef}
        onMeshHover={(idx) => {
          slotRefs.current.get(idx)?.classList.add(hoveredItemClassName);
          overlayRefs.current.get(idx)?.classList.add(hoveredOverlayClassName);
        }}
        onMeshLeave={(idx) => {
          slotRefs.current.get(idx)?.classList.remove(hoveredItemClassName);
          overlayRefs.current.get(idx)?.classList.remove(hoveredOverlayClassName);
        }}
        onMeshClick={(idx) => {
          // idx 0 = intro slot (no click), 1+ = projects
          if (idx > 0) onSlotClick(idx - 1);
        }}
      />
      <IntroBunny screenPosRef={screenPosRef} arc={arc} actualRotRef={actualRotRef} />
    </Canvas>
  );
}

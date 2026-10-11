"use client";

import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import IntroBunny from "../CylinderIntroBunny";
import BunnyHearts from "@/app/profile/_components/FloatingObject/BunnyHearts";
import VerticalCylinder, { TransparentBg, ResponsiveCamera } from "./VerticalCylinder";
import { createIntroDataUrl, createFallbackPanelDataUrl, CAMERA_Z, CAMERA_FOV } from "./scene";

/* 원통에 두르는 텍스처는 원본 주소를 그대로 받고 있었다. 작품 이미지는 1200×700 원본이라
   5장에 660KB 였고, 첫 화면을 다 그린 뒤에도 12.8초까지 계속 내려받았다.
   Next 의 이미지 최적화를 거치면 같은 자리에 AVIF/WebP 로 훨씬 작게 온다.
   원통 한 칸은 화면 폭을 넘지 않으므로 640px 이면 충분하다. 인트로는 캔버스로 만든
   data URL 이라 최적화 대상이 아니다. */
const TEXTURE_WIDTH = 640;
/* next.config 의 images.qualities 를 따로 두지 않아 기본값 75 만 허용된다 — 다른 값은 400 이다. */
const TEXTURE_QUALITY = 75;

function optimized(url: string): string {
  if (!url.startsWith("http")) return url;
  /* SVG 는 최적화를 거치지 않는다 — next/image 는 dangerouslyAllowSVG 를 켜지 않으면 SVG 요청을
     400 으로 거부하고, 그 주소를 텍스처로 받으면 원통이 통째로 죽는다. 그림 파일 자체는 그대로
     받아 쓸 수 있다(브라우저는 <img> 로 SVG 를 그릴 수 있다). 벡터라 용량도 문제되지 않는다 */
  if (/\.svg(\?|#|$)/i.test(url)) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${TEXTURE_WIDTH}&q=${TEXTURE_QUALITY}`;
}
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
  /** 몽이를 쓰다듬을 때 뜨는 하트 층 — 캔버스 위에 오게 쌓임 순서를 준다 */
  heartsClassName: string;
  hoveredItemClassName: string;
  hoveredOverlayClassName: string;
  projectImages: string[];
  /** 표지가 없는 칸에 그릴 판의 씨앗 — projectImages 와 같은 순서다 */
  projectSeeds: string[];
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
  /** 판을 그리지 않는다 — 보여줄 것이 없을 때. 몽이만 남는다 */
  hidePanels?: boolean;
  onSlotClick: (projectIdx: number, e: MouseEvent) => void;
}

export default function CylinderCanvas({
  canvasClassName,
  heartsClassName,
  hoveredItemClassName,
  hoveredOverlayClassName,
  projectImages,
  projectSeeds,
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
  hidePanels,
  onSlotClick,
}: CylinderCanvasProps) {
  /* allImages[0] = 인트로, [1..N] = 작품. 인트로와 빈 칸의 판은 캔버스로 만들어야 해서 여기서 계산한다.
     표지가 없는 칸에 빈 주소를 넘기면 TextureLoader 가 죽으므로 반드시 대신 그릴 것을 준다(#1062) */
  /* 판 위에 있을 때 커서 표시를 달아 둘 캔버스 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /* 몽이의 화면 좌표와 쓰다듬는 중인지 — 몽이가 매 프레임 적고 하트가 읽는다 */
  const bunnyScreenRef = useRef({ x: 0, y: 0 });
  const pettingRef = useRef(false);
  const allImages = useMemo(
    () => [
      createIntroDataUrl(isDark),
      ...projectImages.map((url, i) => (url ? optimized(url) : createFallbackPanelDataUrl(projectSeeds[i] ?? String(i)))),
    ],
    [isDark, projectImages, projectSeeds],
  );

  return (
    <>
    <Canvas
      className={canvasClassName}
      ref={canvasRef}
      camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: true }}
    >
      <TransparentBg />
      <ResponsiveCamera loop={segAngle * allImages.length} />
      <VerticalCylinder
        allImages={allImages}
        segAngle={segAngle}
        arc={arc}
        scrollRef={scrollRef}
        mouseRef={mouseRef}
        actualRotRef={actualRotRef}
        screenPosRef={screenPosRef}
        dimRef={hoverDimRef}
        hidePanels={hidePanels}
        onMeshHover={(idx) => {
          slotRefs.current.get(idx)?.classList.add(hoveredItemClassName);
          overlayRefs.current.get(idx)?.classList.add(hoveredOverlayClassName);
          /* 판은 캔버스에 그려진 그림이라 커서가 스스로 알아보지 못한다 — 판 위에 있는 동안만
             캔버스에 표시를 달아 "눌러서 더 보기" 커서가 되게 한다(인트로 칸은 뺀다) */
          if (idx > 0) {
            canvasRef.current?.setAttribute("data-clickable", "true");
            canvasRef.current?.setAttribute("data-more", "true");
          }
        }}
        onMeshLeave={(idx) => {
          slotRefs.current.get(idx)?.classList.remove(hoveredItemClassName);
          overlayRefs.current.get(idx)?.classList.remove(hoveredOverlayClassName);
          canvasRef.current?.removeAttribute("data-clickable");
          canvasRef.current?.removeAttribute("data-more");
        }}
        onMeshClick={(idx, e) => {
          // idx 0 = intro slot (no click), 1+ = projects
          if (idx > 0) onSlotClick(idx - 1, e);
        }}
      />
      <IntroBunny
        screenPosRef={screenPosRef}
        arc={arc}
        loop={segAngle * allImages.length}
        actualRotRef={actualRotRef}
        isDark={isDark}
        bunnyScreenRef={bunnyScreenRef}
        pettingRef={pettingRef}
      />
    </Canvas>
    <BunnyHearts className={heartsClassName} screenPosRef={bunnyScreenRef} pettingRef={pettingRef} />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { measureImageTone } from "@/lib/imageTone";
import { isVideoUrl } from "@/lib/isVideoUrl";
import styles from "./DetailLayout.module.css";

/* nav 로고가 앉는 커버 구역(비율) — 왼쪽 위. 그 위에 깔린 검은 막(heroOverlay 위쪽 25% → 0)의 평균만큼 어둡게 본다 */
const LOGO_REGION = { x0: 0, y0: 0, x1: 0.3, y1: 0.25 };
const LOGO_REGION_DIM = 0.12;

export interface DetailHeroProps {
  image: string;
  alt?: string;
  /** 커버 세로 위치 % (object-position, 0~100). 기본 50 — 편집기 CoverBanner 와 동일 */
  position?: number;
  /** 커버 확대 배율 (scale, 1~2.5). 기본 1 */
  zoom?: number;
  onError?: () => void;
}

/** 상세 페이지 맨 위의 커버. DetailLayout 이 그리거나, 상세 경로의 레이아웃이 셸에서 그린다(DetailShell) */
export default function DetailHero({ image, alt = "", position = 50, zoom = 1, onError }: DetailHeroProps) {
  /* nav 로고 밑 밝기 — 이 커버 윗부분이 어두운지 검은 막까지 셈해 재고 data-nav-tone 으로 적어 둔다.
     nav 는 로고 밑 요소를 직접 재는데(lib/navBackdrop), 이 커버는 그 위에 막이 깔려 있어 스스로 잰 값이 더 맞다 */
  const [tone, setTone] = useState<"dark" | "light" | null>(null);
  useEffect(() => {
    let alive = true;
    if (!isVideoUrl(image)) {
      void measureImageTone(image, LOGO_REGION, LOGO_REGION_DIM).then((t) => { if (alive) setTone(t); });
    }
    return () => { alive = false; };
  }, [image]);

  return (
    <motion.div
      className={styles.hero}
      data-nav-tone={tone ?? undefined}
      /* 서버 HTML 부터 보이게 둔다(#911). opacity 0 에서 시작하면 커버가 하이드레이션 뒤 페이드가 끝날 때까지 안 보여,
         이미 받아 둔 이미지를 느린 회선에서 몇 초씩 감추고 LCP 도 그만큼 늦었다. 카드에서 넘어오는 전환은 원래 1 에서
         시작했다. ProgressiveImage 의 priority 처리와 같은 이유다 */
      initial={false}
      animate={{ opacity: 1 }}
    >
      <ProgressiveImage
        src={image}
        alt={alt}
        fill
        sizes="100vw"
        priority
        className={styles.heroCover}
        style={{
          objectPosition: `50% ${position}%`,
          ...(zoom !== 1 ? { transform: `scale(${zoom})`, transformOrigin: "center" } : {}),
        }}
        onError={onError}
      />
      <div className={styles.heroOverlay} />
    </motion.div>
  );
}

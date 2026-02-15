"use client";

import { useCallback, useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignFeature } from "@/data/webflow";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}
import DynamicFrameLayout, {
  type Frame,
  defaultFrames,
} from "@/components/common/DynamicFrame/DynamicFrameLayout";
import { checkMobileLayout } from "../../_hooks/mobileCheck";
import styles from "../WebFlowSection.module.css";

interface FeaturesPanelProps {
  language: Language;
  features: DesignFeature[];
}

/* 기능 → 3×3 그리드, 기능별 이미지 사용 */
function buildFrames(features: DesignFeature[]): Frame[] {
  return features.map((feature, i) => ({
    ...defaultFrames[i % defaultFrames.length],
    id: i + 1,
    defaultPos: { x: (i % 3) * 4, y: Math.floor(i / 3) * 4, w: 4, h: 4 },
    image: feature.image,
    video: feature.image ? undefined : defaultFrames[i % defaultFrames.length].video,
  }));
}

export default function FeaturesPanel({
  language,
  features,
}: FeaturesPanelProps) {
  const frames = buildFrames(features);
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = checkMobileLayout();

  /* 모바일/태블릿: 폴더 크기, 탭 너비를 균일하게 맞추고 음수 마진으로
     카드가 균일하게 겹치게 함. CSS flex-column이 배치를 처리 —
     브라우저가 균등 간격을 보장. */
  useLayoutEffect(() => {
    if (!isMobile || !gridRef.current) return;

    const grid = gridRef.current;
    const wraps = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderWrap}`),
    );
    const tabs = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderTab}`),
    );

    const pinnedEl = grid.querySelector(
      `.${styles.featureGridPinned}`,
    ) as HTMLElement | null;

    const measure = () => {
      // 측정을 위해 자연 크기로 초기화
      wraps.forEach((wrap) => {
        wrap.style.height = "auto";
        wrap.style.marginTop = "";
      });
      tabs.forEach((tab) => { tab.style.minWidth = ""; });
      if (pinnedEl) pinnedEl.style.paddingTop = "";

      // 가장 높은 카드, 가장 넓은 탭, 탭 요소 높이 계산
      let maxCardHeight = 0;
      let maxTabWidth = 0;
      wraps.forEach((wrap) => { maxCardHeight = Math.max(maxCardHeight, wrap.offsetHeight); });
      tabs.forEach((tab) => { maxTabWidth = Math.max(maxTabWidth, tab.offsetWidth); });
      const tabElementHeight = tabs[0] ? tabs[0].offsetHeight : 40;

      // 균일한 크기 적용
      wraps.forEach((wrap) => { wrap.style.height = `${maxCardHeight}px`; });
      tabs.forEach((tab) => { tab.style.minWidth = `${maxTabWidth}px`; });

      // 음수 마진 = -(카드 높이 - 간격)
      // 간격 = 탭 높이 + gap → 각 카드의 탭이 완전히 보임
      const gap = 16;
      const spacing = tabElementHeight + gap;
      const overlapMargin = -(maxCardHeight - spacing);
      wraps.forEach((wrap, i) => {
        if (i > 0) wrap.style.marginTop = `${overlapMargin}px`;
      });

      // 스택을 하단으로 밀어서 아래 여백 확보
      if (pinnedEl) {
        const viewportHeight = window.innerHeight;
        const totalVisible = wraps.length * spacing;
        const bottomPadding = spacing * 2;
        pinnedEl.style.paddingTop = `${Math.max(0, viewportHeight - totalVisible - bottomPadding)}px`;
      }
    };

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      wraps.forEach((wrap) => { wrap.style.height = ""; wrap.style.marginTop = ""; });
      tabs.forEach((tab) => { tab.style.minWidth = ""; });
      if (pinnedEl) pinnedEl.style.paddingTop = "";
    };
  }, [isMobile, language]);

  /* 모바일/태블릿: GSAP ScrollTrigger로 .featureGrid를 뷰포트에 고정.
     카드는 이미 CSS로 배치됨 (flex column + 음수 마진).
     이 이펙트는 스크롤 시 날아가는 애니메이션만 처리. */
  useLayoutEffect(() => {
    if (!isMobile || !gridRef.current) return;

    const grid = gridRef.current;
    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderWrap}`),
    );
    const count = cards.length;
    if (count === 0) return;

    const lastIdx = count - 1;
    const isTablet = window.innerWidth >= 768;

    const baseScroll = isTablet ? 300 : 200;
    const scrollDist = count * baseScroll;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: grid,
        start: "top top",
        end: `+=${scrollDist}`,
        pin: true,
        pinSpacing: true,
        onUpdate: (self) => {
          const cardHeight = cards[0].offsetHeight;
          const progress = self.progress;

          const animFraction = Math.min(progress / 0.95, 1);
          const step = lastIdx > 0 ? 1 / lastIdx : 1;
          const duration = step * 4;

          for (let i = 0; i < count; i++) {
            if (i < lastIdx) {
              const cardStart = i * step;
              const animProgress = Math.max(
                0,
                Math.min(1, (animFraction - cardStart) / duration),
              );
              if (animProgress > 0) {
                const exitY = -(cardHeight + window.innerHeight);
                cards[i].style.transform = `translateY(${exitY * animProgress}px)`;
              } else {
                cards[i].style.transform = "";
              }
            }
            // 마지막 카드는 제자리 유지 — transform 불필요
          }
        },
      });
    }, grid);

    return () => {
      cards.forEach((card) => { card.style.transform = ""; });
      ctx.revert();
    };
  }, [isMobile]);

  const renderOverlay = useCallback(
    (_frame: Frame, index: number) => {
      const feature = features[index];
      if (!feature) return null;
      return (
        <div className={styles.featureDfOverlay}>
          <div className={styles.featureDfInfo}>
            <h4 className={styles.featureDfTitle}>{feature.title}</h4>
            <p className={styles.featureDfDesc}>
              {feature.description[language]}
            </p>
            <p className={styles.featureDfTech}>{feature.tech.join(" · ")}</p>
          </div>
        </div>
      );
    },
    [features, language],
  );

  return (
    <div className={`${styles.panel} ${styles.panelWide}`}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>03</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>
        Key Features.
      </h3>

      {/* 데스크톱: DynamicFrameLayout */}
      <div className={styles.featureDynamic}>
        <DynamicFrameLayout
          initialFrames={frames}
          initialGapSize={0}
          initialHoverSize={6}
          initialAutoplayMode="all"
          renderOverlay={renderOverlay}
        />
      </div>

      {/* 모바일: 겹쳐진 폴더 카드 (스크롤 애니메이션) */}
      <div
        className={styles.featureGrid}
        ref={gridRef}
        style={{ "--feature-count": features.length } as React.CSSProperties}
      >
        <div className={styles.featureGridPinned}>
          {features.map((feature, index) => (
            <div
              key={index}
              className={styles.featureFolderWrap}
              style={{ zIndex: index + 1 }}
            >
              <span className={styles.featureFolderTab}>{feature.title}</span>
              <div className={styles.featureFolderCard}>
                <p className={styles.featureFolderDesc}>
                  {feature.description[language]}
                </p>
                <p className={styles.featureFolderTech}>
                  {feature.tech.join(" · ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

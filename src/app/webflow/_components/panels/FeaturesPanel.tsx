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

  /* 모바일/태블릿: 폴더 크기·탭 너비 균일화, 음수 마진으로 겹침 배치.
     뷰포트에 안 들어가는 하단 카드만 추가로 겹침. */
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
      const tabH = tabs[0] ? tabs[0].offsetHeight : 40;

      // 마지막 카드: description 영역만 가려지도록 bodyPeek 계산
      // card의 paddingTop 영역까지만 보이고 desc 텍스트는 뷰포트 아래
      const lastCardEl = wraps[wraps.length - 1]?.querySelector(
        `.${styles.featureFolderCard}`,
      ) as HTMLElement | null;
      const bodyPeek = lastCardEl
        ? parseFloat(window.getComputedStyle(lastCardEl).paddingTop)
        : (maxCardHeight - tabH) * 0.3;

      // 균일한 크기 적용
      wraps.forEach((wrap) => { wrap.style.height = `${maxCardHeight}px`; });
      tabs.forEach((tab) => { tab.style.minWidth = `${maxTabWidth}px`; });

      const gap = 48;
      const idealSpacing = tabH + gap;
      const count = wraps.length;
      const slots = count - 1; // 첫 카드 제외 간격 슬롯 수

      const vh = window.innerHeight;
      const desiredTopPadding = idealSpacing * 2; // 넉넉한 상단 여백

      // 전체 카드가 idealSpacing으로 펼쳐질 때 필요한 높이
      const idealTotal = slots * idealSpacing + tabH + bodyPeek;

      let topPadding: number;
      let collapseCount = 0;

      if (vh >= idealTotal + desiredTopPadding) {
        // 모든 카드가 여유롭게 들어감
        topPadding = vh - idealTotal;
      } else {
        // 공간 부족 → 하단 카드들을 완전히 겹쳐서 공간 확보
        const available = vh - desiredTopPadding - tabH - bodyPeek;
        const maxSlots = Math.max(0, Math.floor(available / idealSpacing));
        collapseCount = Math.max(0, slots - maxSlots);
        collapseCount = Math.min(collapseCount, count - 2);

        const collapsedTotal =
          (slots - collapseCount) * idealSpacing + tabH + bodyPeek;
        topPadding = Math.max(0, vh - collapsedTotal);
      }

      // 가시 카드: idealSpacing 간격 (겹침 없음, 균일 간격)
      // 겹침 카드: 완전 겹침 → 마지막 카드(최상위 z-index) 뒤에 숨김
      const uniformMargin = -(maxCardHeight - idealSpacing);
      const fullyOverlappedMargin = -maxCardHeight;

      const firstCollapsedIdx = count - 1 - collapseCount;

      wraps.forEach((wrap, i) => {
        if (i === 0) return;
        if (collapseCount > 0 && i > firstCollapsedIdx) {
          wrap.style.marginTop = `${fullyOverlappedMargin}px`;
        } else {
          wrap.style.marginTop = `${uniformMargin}px`;
        }
      });

      if (pinnedEl) {
        pinnedEl.style.paddingTop = `${topPadding}px`;
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
     카드가 순서대로 위로 날아감 — 마지막 카드는 고정 유지.
     겹침 카드도 스크롤 시 날아가며 자연스럽게 드러남. */
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

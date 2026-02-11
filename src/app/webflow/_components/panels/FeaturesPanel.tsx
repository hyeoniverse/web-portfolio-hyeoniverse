"use client";

import {
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
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
import styles from "../WebFlowSection.module.css";

interface FeaturesPanelProps {
  language: Language;
  features: DesignFeature[];
}

/* 9 features → 3×3 grid, reuse default video URLs */
function buildFrames(count: number): Frame[] {
  return Array.from({ length: count }, (_, i) => ({
    ...defaultFrames[i % defaultFrames.length],
    id: i + 1,
    defaultPos: { x: (i % 3) * 4, y: Math.floor(i / 3) * 4, w: 4, h: 4 },
  }));
}

const MOBILE_WIDTH = 1024;

export default function FeaturesPanel({
  language,
  features,
}: FeaturesPanelProps) {
  const frames = buildFrames(features.length);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* Mobile: GSAP ScrollTrigger pins .featureGrid to viewport,
     then animates cards based on scroll progress.
     Card 0 (top, z-index 1) flies up first → card 8 (front, z-index 9) stays. */
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

    const ctx = gsap.context(() => {
      const scrollDist = count * (isTablet ? 1000 : 150);

      ScrollTrigger.create({
        trigger: grid,
        start: "top top",
        end: `+=${scrollDist}`,
        pin: true,
        pinSpacing: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const viewportH = window.innerHeight;
          const cardH = cards[0].offsetHeight;

          /* Tablet: show card bodies between cards.
             Mobile: tight stack, only tabs visible. */
          const tabH = isTablet ? Math.round(cardH * 0.1) : 28;

          /* Anchor last card to viewport bottom, stack others above */
          const bottomGap = -(cardH * 0.7);
          const lastCardY = viewportH - bottomGap - cardH;

          const animFrac = Math.min(progress / 0.95, 1);
          const perCard = lastIdx > 0 ? 1 / lastIdx : 1;

          for (let i = 0; i < count; i++) {
            const restY = lastCardY - (lastIdx - i) * tabH;

            if (i < lastIdx) {
              const cardStart = i * perCard;
              const t = Math.max(
                0,
                Math.min(1, (animFrac - cardStart) / perCard),
              );
              const exitY = -cardH - 40;
              const y = restY + (exitY - restY) * t;
              cards[i].style.transform = `translateY(${y}px)`;
            } else {
              cards[i].style.transform = `translateY(${restY}px)`;
            }
          }
        },
      });
    }, grid);

    return () => ctx.revert();
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

      {/* Desktop: DynamicFrameLayout */}
      <div className={styles.featureDynamic}>
        <DynamicFrameLayout
          initialFrames={frames}
          initialGapSize={0}
          initialHoverSize={6}
          initialAutoplayMode="all"
          renderOverlay={renderOverlay}
        />
      </div>

      {/* Mobile: stacked folder cards (scroll animation) */}
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

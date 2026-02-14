"use client";

import {
  useCallback,
  useRef,
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
import { checkMobileLayout } from "../../_hooks/mobileCheck";
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

export default function FeaturesPanel({
  language,
  features,
}: FeaturesPanelProps) {
  const frames = buildFrames(features.length);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const check = () => setIsMobile(checkMobileLayout());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* Mobile/Tablet: equalise folder sizes, tab widths, and set negative
     margins so cards overlap uniformly.  CSS flex-column handles the
     positioning — the browser guarantees equal spacing. */
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
      // Reset to natural sizes for measurement
      wraps.forEach((w) => {
        w.style.height = "auto";
        w.style.marginTop = "";
      });
      tabs.forEach((t) => { t.style.minWidth = ""; });
      if (pinnedEl) pinnedEl.style.paddingTop = "";

      // Find tallest card, widest tab, and tab element height
      let maxH = 0;
      let maxTabW = 0;
      wraps.forEach((w) => { maxH = Math.max(maxH, w.offsetHeight); });
      tabs.forEach((t) => { maxTabW = Math.max(maxTabW, t.offsetWidth); });
      const tabElH = tabs[0] ? tabs[0].offsetHeight : 40;

      // Apply uniform sizes
      wraps.forEach((w) => { w.style.height = `${maxH}px`; });
      tabs.forEach((t) => { t.style.minWidth = `${maxTabW}px`; });

      // Negative margin = -(cardHeight - spacing).
      // spacing = tab height + gap → each card's tab is fully visible.
      const gap = 16;
      const spacing = tabElH + gap;
      const overlapMargin = -(maxH - spacing);
      wraps.forEach((w, i) => {
        if (i > 0) w.style.marginTop = `${overlapMargin}px`;
      });

      // Push the stack toward the bottom with some breathing room below
      if (pinnedEl) {
        const vh = window.innerHeight;
        const totalVisible = wraps.length * spacing;
        const bottomPadding = spacing * 2;
        pinnedEl.style.paddingTop = `${Math.max(0, vh - totalVisible - bottomPadding)}px`;
      }
    };

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      wraps.forEach((w) => { w.style.height = ""; w.style.marginTop = ""; });
      tabs.forEach((t) => { t.style.minWidth = ""; });
      if (pinnedEl) pinnedEl.style.paddingTop = "";
    };
  }, [isMobile, language]);

  /* Mobile/Tablet: GSAP ScrollTrigger pins .featureGrid to viewport.
     Cards are already positioned by CSS (flex column + negative margins).
     This effect only handles the fly-away animation on scroll. */
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
          const cardH = cards[0].offsetHeight;
          const progress = self.progress;

          const animFrac = Math.min(progress / 0.95, 1);
          const step = lastIdx > 0 ? 1 / lastIdx : 1;
          const duration = step * 4;

          for (let i = 0; i < count; i++) {
            if (i < lastIdx) {
              const cardStart = i * step;
              const t = Math.max(
                0,
                Math.min(1, (animFrac - cardStart) / duration),
              );
              if (t > 0) {
                const exitY = -(cardH + window.innerHeight);
                cards[i].style.transform = `translateY(${exitY * t}px)`;
              } else {
                cards[i].style.transform = "";
              }
            }
            // Last card stays in place — no transform needed
          }
        },
      });
    }, grid);

    return () => {
      cards.forEach((c) => { c.style.transform = ""; });
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

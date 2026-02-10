"use client";

import { useCallback } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignFeature } from "@/data/webflow";
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

export default function FeaturesPanel({
  language,
  features,
}: FeaturesPanelProps) {
  const frames = buildFrames(features.length);

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
            <p className={styles.featureDfTech}>
              {feature.tech.join(" · ")}
            </p>
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

      {/* Mobile: folder tab cards */}
      <div className={styles.featureGrid}>
        {features.map((feature, index) => (
          <div
            key={index}
            className={`${styles.featureFolder} ${styles.animate}`}
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
  );
}

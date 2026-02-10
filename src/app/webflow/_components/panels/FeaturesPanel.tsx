import type { Language } from "@/providers/LanguageProvider";
import type { DesignFeature } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

interface FeaturesPanelProps {
  language: Language;
  features: DesignFeature[];
}

export default function FeaturesPanel({ language, features }: FeaturesPanelProps) {
  return (
    <div className={`${styles.panel} ${styles.panelWide}`}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>03</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Key Features.</h3>
      <div className={styles.featureGrid}>
        {features.map((feature, index) => (
          <div key={index} className={`${styles.featureFolder} ${styles.animate}`}>
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

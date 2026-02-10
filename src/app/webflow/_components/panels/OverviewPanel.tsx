import type { Language } from "@/providers/LanguageProvider";
import styles from "../WebFlowSection.module.css";

interface OverviewPanelProps {
  language: Language;
  overview: {
    description: Record<Language, string>;
    stats: { value: string; label: Record<Language, string> }[];
  };
}

export default function OverviewPanel({ language, overview }: OverviewPanelProps) {
  return (
    <div className={styles.panel}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>01</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Overview.</h3>
      <p className={`${styles.overviewDesc} ${styles.animate}`}>
        {overview.description[language]}
      </p>
      <div className={styles.overviewStats}>
        {overview.stats.map((stat, i) => (
          <div key={i} className={`${styles.overviewStat} ${styles.animate}`}>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label[language]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

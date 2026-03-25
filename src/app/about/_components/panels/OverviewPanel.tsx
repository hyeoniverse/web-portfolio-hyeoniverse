import type { Language } from "@/providers/LanguageProvider";
import shared from "../AboutSection.module.css";
import local from "./OverviewPanel.module.css";
const styles = { ...shared, ...local };

interface OverviewPanelProps {
  language: Language;
  overview: {
    description: Record<Language, string>;
    highlights: string[];
    stats: { value: string; label: Record<Language, string> }[];
  };
}

export default function OverviewPanel({ language, overview }: OverviewPanelProps) {
  return (
    <div className={styles.panel}>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Overview.</h3>
      <div className={styles.overviewLayout}>
        <div className={styles.overviewTop}>
          <p className={`${styles.overviewDesc} ${styles.animate}`}>
            {overview.description[language]}
          </p>
          <div className={`${styles.overviewHighlights} ${styles.animate}`}>
            {overview.highlights.map((tag) => (
              <span key={tag} className={styles.overviewTag}>{tag}</span>
            ))}
          </div>
        </div>
        <div className={`${styles.overviewStats} ${styles.animate}`}>
          {overview.stats.map((stat, i) => (
            <div key={i} className={styles.overviewStat}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label[language]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

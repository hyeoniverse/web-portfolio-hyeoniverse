import type { Language } from "@/providers/LanguageProvider";
import type { UserFlow } from "@/data/about";
import styles from "../AboutSection.module.css";

interface OverviewPanelProps {
  language: Language;
  overview: {
    description: Record<Language, string>;
    highlights: string[];
    stats: { value: string; label: Record<Language, string> }[];
  };
  userFlows: UserFlow[];
}

export default function OverviewPanel({ language, overview, userFlows }: OverviewPanelProps) {
  return (
    <div className={`${styles.panel} ${styles.panelWide}`}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>01</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Overview.</h3>
      <div className={styles.overviewSplitLayout}>
        <div className={styles.overviewLeft}>
          <p className={`${styles.overviewDesc} ${styles.animate}`}>
            {overview.description[language]}
          </p>
          <div className={`${styles.overviewHighlights} ${styles.animate}`}>
            {overview.highlights.map((tag) => (
              <span key={tag} className={styles.overviewTag}>{tag}</span>
            ))}
          </div>
          <div className={styles.overviewStats}>
            {overview.stats.map((stat, i) => (
              <div key={i} className={`${styles.overviewStat} ${styles.animate}`}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label[language]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${styles.overviewRight} ${styles.animate}`}>
          <h4 className={styles.overviewFlowTitle}>
            {language === "ko" ? "User Flow" : "User Flow"}
          </h4>
          <div className={styles.overviewFlowList}>
            {userFlows.map((flow, fi) => (
              <div key={fi} className={styles.overviewFlowItem}>
                <div className={styles.overviewFlowHeader}>
                  <span className={styles.overviewFlowIcon}>{flow.title}</span>
                  <span className={styles.overviewFlowDesc}>
                    {flow.description[language]}
                  </span>
                </div>
                <div className={styles.overviewFlowSteps}>
                  {flow.steps.map((step, si) => (
                    <span key={si} className={styles.overviewFlowStep}>
                      {si > 0 && <span className={styles.overviewFlowArrow}>→</span>}
                      <span className={styles.overviewFlowStepLabel}>
                        {step.label[language]}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

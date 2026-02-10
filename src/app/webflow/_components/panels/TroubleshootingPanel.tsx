import type { Language } from "@/providers/LanguageProvider";
import type { TroubleShootingItem } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

interface TroubleshootingPanelProps {
  language: Language;
  t: (key: string) => string;
  items: TroubleShootingItem[];
}

export default function TroubleshootingPanel({
  language,
  t,
  items,
}: TroubleshootingPanelProps) {
  return (
    <div className={styles.panel}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>07</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>
        Trouble Shooting.
      </h3>
      <div className={styles.troubleTimeline}>
        {items.map((item, index) => (
          <div key={index} className={`${styles.troubleItem} ${styles.animate}`}>
            <div className={styles.troubleNode}>
              <span className={styles.troubleNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div className={styles.troubleContent}>
              <h4 className={styles.troubleTitle}>
                {item.problem[language]}
              </h4>
              <div className={styles.troubleBody}>
                <div className={styles.troubleEntry}>
                  <span className={styles.troubleLabel}>
                    {t("webflow.troubleshooting.cause")}
                  </span>
                  <p>{item.cause[language]}</p>
                </div>
                <div className={styles.troubleEntry}>
                  <span
                    className={`${styles.troubleLabel} ${styles.troubleLabelAccent}`}
                  >
                    {t("webflow.troubleshooting.solution")}
                  </span>
                  <p>{item.solution[language]}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

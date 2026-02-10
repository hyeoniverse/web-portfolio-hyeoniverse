import type { Language } from "@/providers/LanguageProvider";
import type { ProcessStep } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

interface ProcessPanelProps {
  language: Language;
  process: ProcessStep[];
}

export default function ProcessPanel({ language, process }: ProcessPanelProps) {
  return (
    <div className={`${styles.panel} ${styles.panelCompact}`}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>05</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Design Process.</h3>
      <div className={styles.processGrid}>
        {process.map((p, index) => (
          <div key={index} className={`${styles.processItem} ${styles.animate}`}>
            <span className={styles.processNumber}>{p.step}</span>
            <h4 className={styles.processTitle}>{p.title[language]}</h4>
            <p className={styles.processDesc}>{p.description[language]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

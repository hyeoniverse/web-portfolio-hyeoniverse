import type { TechStackItem } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

interface TechStackPanelProps {
  techStack: TechStackItem[];
}

export default function TechStackPanel({ techStack }: TechStackPanelProps) {
  return (
    <div className={styles.panel}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>05</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Tech Stack.</h3>
      <div className={styles.techGrid}>
        {techStack.map((tech, index) => (
          <div key={index} className={`${styles.techItem} ${styles.animate}`}>
            <span className={styles.techName}>{tech.name}</span>
            <span className={styles.techCategory}>{tech.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

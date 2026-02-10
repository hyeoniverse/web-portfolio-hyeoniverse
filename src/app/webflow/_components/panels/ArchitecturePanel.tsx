import type { Language } from "@/providers/LanguageProvider";
import type { StructureItem } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

interface ArchitecturePanelProps {
  language: Language;
  structure: StructureItem[];
}

export default function ArchitecturePanel({ language, structure }: ArchitecturePanelProps) {
  return (
    <div className={styles.panel}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>02</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Architecture.</h3>
      <div className={styles.archGrid}>
        {structure.map((item, i) => (
          <div
            key={i}
            className={`${styles.archItem} ${styles.animate} ${
              item.indent === 1
                ? styles.archIndent1
                : item.indent === 2
                  ? styles.archIndent2
                  : ""
            }`}
          >
            <span className={styles.archPath}>{item.path}</span>
            <span className={styles.archDesc}>
              {item.description[language]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

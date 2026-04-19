import SharedCreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import styles from "../AboutSection.module.css";

export default function CreditsPanel() {
  return (
    <div className={`${styles.panel} ${styles.panelNarrow}`} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className={styles.animate}>
        <SharedCreditsPanel />
      </div>
    </div>
  );
}

import CreditsFooter from "@/components/layout/CreditsFooter/CreditsFooter";
import styles from "../WebFlowSection.module.css";

export default function CreditsPanel() {
  return (
    <div
      className={`${styles.panel} ${styles.panelNarrow} ${styles.creditsPanel}`}
    >
      <CreditsFooter variant="panel" className={styles.animate} />
    </div>
  );
}

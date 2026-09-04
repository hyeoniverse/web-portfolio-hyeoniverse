import SharedCreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
const styles = { ...frame, ...shell };

export default function CreditsPanel() {
  return (
    <div className={`${styles.panel} ${styles.panelNarrow}`} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className={styles.animate}>
        <SharedCreditsPanel />
      </div>
    </div>
  );
}

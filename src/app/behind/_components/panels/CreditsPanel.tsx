import SharedCreditsPanel from "@/components/layout/CreditsFooter/CreditsPanel";
import styles from "../BehindSection.module.css";

export default function CreditsPanel() {
  return (
    <SharedCreditsPanel className={`${styles.panel} ${styles.animate}`} />
  );
}

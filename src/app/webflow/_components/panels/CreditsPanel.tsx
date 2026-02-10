import styles from "../WebFlowSection.module.css";

interface CreditsPanelProps {
  t: (key: string) => string;
  nickname: string;
}

export default function CreditsPanel({ t, nickname }: CreditsPanelProps) {
  return (
    <div
      className={`${styles.panel} ${styles.panelNarrow} ${styles.creditsPanel}`}
    >
      <p className={`${styles.creditsText} ${styles.animate}`}>
        {t("webflow.credits")} {nickname}
      </p>
    </div>
  );
}

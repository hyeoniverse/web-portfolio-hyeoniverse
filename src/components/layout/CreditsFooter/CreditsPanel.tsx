import CreditsFooter from "./CreditsFooter";
import styles from "./CreditsPanel.module.css";

interface CreditsPanelProps {
  className?: string;
}

export default function CreditsPanel({ className }: CreditsPanelProps) {
  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <CreditsFooter variant="panel" />
    </div>
  );
}

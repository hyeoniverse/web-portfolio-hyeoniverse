import styles from "./LoadingDots.module.css";

interface LoadingDotsProps {
  className?: string;
}

export default function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <span className={`${styles.loadingDots}${className ? ` ${className}` : ""}`}>
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
    </span>
  );
}

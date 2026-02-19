import styles from "../../AboutSection.module.css";

const spacingTokens = [
  { token: "2xs", px: 4 },
  { token: "xs", px: 8 },
  { token: "sm", px: 12 },
  { token: "md", px: 16 },
  { token: "lg", px: 24 },
  { token: "xl", px: 32 },
  { token: "2xl", px: 48 },
];

export default function LayoutSpacingDemo() {
  const maxPx = spacingTokens[spacingTokens.length - 1].px;

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcSpacingList}>
        {spacingTokens.map((t) => (
          <div key={t.token} className={styles.dcSpacingRow}>
            <span className={styles.dcSpacingLabel}>{t.token}</span>
            <div
              className={styles.dcSpacingBar}
              style={{ width: `${(t.px / maxPx) * 100}%` }}
            />
            <span className={styles.dcSpacingPx}>{t.px}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

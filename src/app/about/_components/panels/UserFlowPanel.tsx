import type { Language } from "@/providers/LanguageProvider";
import type { UserFlow } from "@/data/about";
import styles from "../AboutSection.module.css";

interface UserFlowPanelProps {
  language: Language;
  userFlows: UserFlow[];
}

const FLOW_COLORS = [
  "var(--color-accent)",
  "var(--color-success)",
  "var(--text-accent)",
];

export default function UserFlowPanel({ language, userFlows }: UserFlowPanelProps) {
  return (
    <div className={`${styles.panel} ${styles.panelWide}`}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>01.5</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>User Flow.</h3>

      <div className={styles.ufContainer}>
        {userFlows.map((flow, fi) => (
          <div key={fi} className={`${styles.ufLane} ${styles.animate}`}>
            <div className={styles.ufLaneHeader}>
              <span
                className={styles.ufLaneIcon}
                style={{ "--_uf-color": FLOW_COLORS[fi % FLOW_COLORS.length] } as React.CSSProperties}
              />
              <div className={styles.ufLaneInfo}>
                <span className={styles.ufLaneTitle}>{flow.title}</span>
                <span className={styles.ufLaneDesc}>{flow.description[language]}</span>
              </div>
            </div>

            <div className={styles.ufPipeline}>
              {flow.steps.map((step, si) => (
                <div key={si} className={styles.ufStepGroup}>
                  {si > 0 && (
                    <div className={styles.ufConnector}>
                      <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
                        <path
                          d="M0 6 L24 6 M20 2 L26 6 L20 10"
                          stroke="var(--text-muted)"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                  <span
                    className={styles.ufNode}
                    style={{ "--_uf-color": FLOW_COLORS[fi % FLOW_COLORS.length] } as React.CSSProperties}
                  >
                    <span className={styles.ufNodeIndex}>{String(si + 1).padStart(2, "0")}</span>
                    <span className={styles.ufNodeLabel}>{step.label[language]}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

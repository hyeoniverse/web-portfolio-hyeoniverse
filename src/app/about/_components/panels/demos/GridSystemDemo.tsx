import { BREAKPOINT } from "@/constants";
import styles from "../DesignSystemPanel.module.css";

const breakpoints = [
  { name: "XS", px: 320 },
  { name: "SM", px: 480 },
  { name: "MD", px: BREAKPOINT.mobile },
  { name: "LG", px: BREAKPOINT.tablet },
  { name: "XL", px: 1280 },
  { name: "2XL", px: 1440 },
  { name: "4K", px: 1920 },
];

export default function GridSystemDemo() {
  const maxPx = breakpoints[breakpoints.length - 1].px;

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcBreakpoints}>
        {breakpoints.map((bp) => (
          <div
            key={bp.name}
            className={styles.dcBpBar}
            style={{ height: `${(bp.px / maxPx) * 100}%` }}
          >
            <span className={styles.dcBpName}>{bp.name}</span>
            <span className={styles.dcBpLabel}>{bp.px}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import styles from "../../BehindSection.module.css";

const breakpoints = [
  { name: "XS", px: 320 },
  { name: "SM", px: 480 },
  { name: "MD", px: 768 },
  { name: "LG", px: 1024 },
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

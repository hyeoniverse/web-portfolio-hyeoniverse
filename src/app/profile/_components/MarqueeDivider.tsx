"use client";

import styles from "./MarqueeDivider.module.css";

const ITEMS = [
  "React",
  "TypeScript",
  "Next.js",
  "GSAP",
  "Framer Motion",
  "CSS",
  "Node.js",
  "Figma",
  "Three.js",
  "Tailwind",
];

const SEPARATOR = " · ";

function buildLine() {
  return ITEMS.join(SEPARATOR) + SEPARATOR;
}

export default function MarqueeDivider({
  className,
}: {
  className?: string;
}) {
  const line = buildLine();

  return (
    <div className={`${styles.divider} ${className ?? ""}`} aria-hidden="true">
      {/* Left column — scrolls up */}
      <div className={styles.column}>
        <span className={`${styles.text} ${styles.up}`}>
          {line}
          {line}
        </span>
      </div>

      {/* Right column — scrolls down */}
      <div className={styles.column}>
        <span className={`${styles.text} ${styles.down}`}>
          {line}
          {line}
        </span>
      </div>
    </div>
  );
}

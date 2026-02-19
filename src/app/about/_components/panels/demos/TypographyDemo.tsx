"use client";

import { useState } from "react";
import styles from "../../AboutSection.module.css";

const fonts = [
  { label: "Inter", family: "var(--font-inter)" },
  { label: "Instrument", family: "var(--font-instrument)" },
  { label: "JetBrains", family: "var(--font-jetbrains)" },
  { label: "Grotesk", family: "var(--font-space-grotesk)" },
];

export default function TypographyDemo() {
  const [activeFont, setActiveFont] = useState(0);

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcFontTabs}>
        {fonts.map((f, i) => (
          <button
            key={f.label}
            className={`${styles.dcToggleBtn} ${i === activeFont ? styles.dcToggleBtnActive : ""}`}
            onClick={() => setActiveFont(i)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div
        className={styles.dcSpecimen}
        style={{ fontFamily: fonts[activeFont].family }}
      >
        Aa Bb Cc 123
      </div>
    </div>
  );
}

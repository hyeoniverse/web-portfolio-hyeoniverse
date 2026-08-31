"use client";

import { useState } from "react";
import shared from "../../AboutSection.module.css";
import local from "../DesignSystemPanel.module.css";
import Pressable from "@/components/ui/Pressable";
const styles = { ...shared, ...local };

const fonts = [
  { label: "Inter", family: "var(--font-inter)" },
  { label: "Instrument", family: "var(--font-instrument)" },
  { label: "JetBrains", family: "var(--font-mono)" },
  { label: "Grotesk", family: "var(--font-space-grotesk)" },
];

export default function TypographyDemo() {
  const [activeFont, setActiveFont] = useState(0);

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcFontTabs}>
        {fonts.map((f, i) => (
          <Pressable
            key={f.label}
            className={`${styles.dcToggleBtn} ${i === activeFont ? styles.dcToggleBtnActive : ""}`}
            onClick={() => setActiveFont(i)}
          >
            {f.label}
          </Pressable>
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

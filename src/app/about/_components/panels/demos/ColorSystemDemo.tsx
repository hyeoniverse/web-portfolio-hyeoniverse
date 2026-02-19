"use client";

import { useState } from "react";
import styles from "../../AboutSection.module.css";

const palettes = {
  dark: [
    { label: "primary", hex: "#D40063" },
    { label: "accent", hex: "#667EEA" },
    { label: "bg", hex: "#0A0A0A" },
    { label: "text", hex: "#F5F5F5" },
    { label: "border", hex: "#2A2A2A" },
    { label: "muted", hex: "#6B7280" },
  ],
  light: [
    { label: "primary", hex: "#D40063" },
    { label: "accent", hex: "#667EEA" },
    { label: "bg", hex: "#FFFFFF" },
    { label: "text", hex: "#111111" },
    { label: "border", hex: "#E5E5E5" },
    { label: "muted", hex: "#9CA3AF" },
  ],
};

function hexLuminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function ColorSystemDemo() {
  const [demoTheme, setDemoTheme] = useState<"dark" | "light">("dark");
  const swatches = palettes[demoTheme];

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcThemeToggle}>
        <button
          className={`${styles.dcToggleBtn} ${demoTheme === "light" ? styles.dcToggleBtnActive : ""}`}
          onClick={() => setDemoTheme("light")}
        >
          Light
        </button>
        <button
          className={`${styles.dcToggleBtn} ${demoTheme === "dark" ? styles.dcToggleBtnActive : ""}`}
          onClick={() => setDemoTheme("dark")}
        >
          Dark
        </button>
      </div>
      <div className={styles.dcSwatchRow}>
        {swatches.map((s) => (
          <div
            key={s.label}
            className={styles.dcSwatch}
            style={{
              backgroundColor: s.hex,
              color:
                hexLuminance(s.hex) > 0.5 ? "#111" : "rgba(255,255,255,0.8)",
            }}
            title={`${s.label}: ${s.hex}`}
          >
            {s.label.slice(0, 2)}
          </div>
        ))}
      </div>
    </div>
  );
}

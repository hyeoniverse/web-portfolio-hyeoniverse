"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "../DesignSystemPanel.module.css";
import Pressable from "@/components/ui/Pressable";

function hexLuminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = [a.slice(1, 3), a.slice(3, 5), a.slice(5, 7)].map((h) => parseInt(h, 16));
  const [br, bg, bb] = [b.slice(1, 3), b.slice(3, 5), b.slice(5, 7)].map((h) => parseInt(h, 16));
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[mix(ar, br), mix(ag, bg), mix(ab, bb)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export default function ColorSystemDemo() {
  const { theme } = useTheme();
  const [demoTheme, setDemoTheme] = useState<"dark" | "light">("dark");
  const config = useSiteConfig();

  // 현재 테마에 맞춰 초기값 동기화
  useEffect(() => {
    setDemoTheme(theme);
  }, [theme]);

  const accent = config.theme?.accentColor || "#d40063";
  const palettes = {
    light: [
      { label: "accent", hex: accent },
      { label: "bg", hex: config.theme?.lightBg || "#f5f5f0" },
      { label: "text", hex: config.theme?.lightText || "#1a1a1a" },
      { label: "border", hex: mixHex(config.theme?.lightBg || "#f5f5f0", config.theme?.lightText || "#1a1a1a", 0.15) },
      { label: "muted", hex: mixHex(config.theme?.lightText || "#1a1a1a", config.theme?.lightBg || "#f5f5f0", 0.45) },
    ],
    dark: [
      { label: "accent", hex: accent },
      { label: "bg", hex: config.theme?.darkBg || "#0a0a0a" },
      { label: "text", hex: config.theme?.darkText || "#f5f5f0" },
      { label: "border", hex: mixHex(config.theme?.darkBg || "#0a0a0a", config.theme?.darkText || "#f5f5f0", 0.15) },
      { label: "muted", hex: mixHex(config.theme?.darkText || "#f5f5f0", config.theme?.darkBg || "#0a0a0a", 0.45) },
    ],
  };

  const swatches = palettes[demoTheme];

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcThemeToggle}>
        <Pressable
          className={`${styles.dcToggleBtn} ${demoTheme === "light" ? styles.dcToggleBtnActive : ""}`}
          onClick={() => setDemoTheme("light")}
        >
          Light
        </Pressable>
        <Pressable
          className={`${styles.dcToggleBtn} ${demoTheme === "dark" ? styles.dcToggleBtnActive : ""}`}
          onClick={() => setDemoTheme("dark")}
        >
          Dark
        </Pressable>
      </div>
      <div className={styles.dcSwatchRow}>
        {swatches.map((s) => (
          <div
            key={s.label}
            className={styles.dcSwatch}
            style={{
              backgroundColor: s.hex,
              color: hexLuminance(s.hex) > 0.5 ? "#111" : "rgba(255,255,255,0.8)",
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

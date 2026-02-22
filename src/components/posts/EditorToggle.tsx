"use client";

import styles from "./EditorToggle.module.css";

interface EditorToggleProps {
  value: "markdown" | "richtext";
  onChange: (value: "markdown" | "richtext") => void;
}

export default function EditorToggle({ value, onChange }: EditorToggleProps) {
  return (
    <div className={styles.toggle}>
      <button
        type="button"
        className={`${styles.option} ${value === "markdown" ? styles.active : ""}`}
        onClick={() => onChange("markdown")}
      >
        Markdown
      </button>
      <button
        type="button"
        className={`${styles.option} ${value === "richtext" ? styles.active : ""}`}
        onClick={() => onChange("richtext")}
      >
        Rich Text
      </button>
    </div>
  );
}

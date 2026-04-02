"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./PostEditor.module.css";

export default function ShortcutsModalContent() {
  const { t } = useLanguage();
  return (
    <div className={styles.helpGrid}>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpTextFormat")}</p>
        <div className={styles.helpRows}>
          {([[t("editor.bold"), "⌘B"], [t("editor.italic"), "⌘I"], [t("editor.underline"), "⌘U"], [t("editor.strikethrough"), "⌘⇧S"], [t("editor.inlineCode"), "⌘E"]]).map(([label, key]) => (
            <div key={label} className={styles.helpRow}><span>{label}</span><kbd className={styles.helpKbd}>{key}</kbd></div>
          ))}
        </div>
      </div>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpParagraph")}</p>
        <div className={styles.helpRows}>
          {([[t("editor.heading1"), "⌘⌥1"], [t("editor.heading2"), "⌘⌥2"], [t("editor.heading3"), "⌘⌥3"], [t("editor.blockquote"), "⌘⇧B"], [t("editor.helpBulletList"), "⌘⇧8"], [t("editor.helpOrderedList"), "⌘⇧7"]]).map(([label, key]) => (
            <div key={label} className={styles.helpRow}><span>{label}</span><kbd className={styles.helpKbd}>{key}</kbd></div>
          ))}
        </div>
      </div>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpEdit")}</p>
        <div className={styles.helpRows}>
          {([[t("editor.undo"), "⌘Z"], [t("editor.redo"), "⌘⇧Z"]]).map(([label, key]) => (
            <div key={label} className={styles.helpRow}><span>{label}</span><kbd className={styles.helpKbd}>{key}</kbd></div>
          ))}
        </div>
      </div>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpFont")}</p>
        <div className={styles.helpRows}>
          <div className={styles.helpRow}><span>{t("editor.helpFontDblClick")}</span><span className={styles.helpDesc}>{t("editor.helpDirectInput")}</span></div>
          <div className={styles.helpRow}><span>Enter</span><span className={styles.helpDesc}>{t("editor.helpConfirmInput")}</span></div>
          <div className={styles.helpRow}><span>Escape</span><span className={styles.helpDesc}>{t("editor.helpCancelInput")}</span></div>
        </div>
      </div>
    </div>
  );
}

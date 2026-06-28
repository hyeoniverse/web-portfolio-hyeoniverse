"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./PostEditor.module.css";

// 키 조합을 개별 키로 분리 — "⌘⇧S" → ["⌘","⇧","S"]. 수식 기호(⌘⇧⌥⌃)는 각각, 나머지는 마지막 키로.
// 마크다운 문법(#, ** 등)은 수식 기호가 없어 그대로 한 badge.
const MODS = ["⌘", "⇧", "⌥", "⌃"];
// 수식 기호 → 기호 + 텍스트 이름
const MOD_LABELS: Record<string, string> = {
  "⌘": "⌘ Command",
  "⇧": "⇧ Shift",
  "⌥": "⌥ Option",
  "⌃": "⌃ Control",
};
function splitKeys(combo: string): string[] {
  // 명시적 " + " 로 구분된 조합 (예: "# + Space", "``` + Enter")
  if (combo.includes(" + ")) return combo.split(" + ");
  // 수식 기호 조합 (예: "⌘⇧S")
  const keys: string[] = [];
  let rest = combo;
  while (rest.length > 0 && MODS.includes(rest[0])) {
    keys.push(rest[0]);
    rest = rest.slice(1);
  }
  if (rest) keys.push(rest);
  return keys;
}
function KeyBadges({ combo }: { combo: string }) {
  const keys = splitKeys(combo);
  return (
    <span className={styles.helpKeys}>
      {keys.flatMap((k, i) => {
        const kbd = <kbd key={`k${i}`} className={styles.helpKbd}>{MOD_LABELS[k] ?? k}</kbd>;
        // 동시 입력(여러 키)이면 키 사이에 + 표시
        return i === 0 ? [kbd] : [<span key={`p${i}`} className={styles.helpKeyPlus}>+</span>, kbd];
      })}
    </span>
  );
}

export default function ShortcutsModalContent() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"rich" | "md">("rich");
  // 두 패널을 grid 로 겹쳐 컨테이너 높이를 항상 더 큰 쪽으로 고정 → 탭 전환 시 모달 높이 안 변함
  const richCls = `${styles.helpPanel}${tab !== "rich" ? ` ${styles.helpPanelHidden}` : ""}`;
  const mdCls = `${styles.helpPanel}${tab !== "md" ? ` ${styles.helpPanelHidden}` : ""}`;

  return (
    <div>
      <div className={styles.helpTabs}>
        <button type="button" className={`${styles.helpTab} ${tab === "rich" ? styles.helpTabActive : ""}`} onClick={() => setTab("rich")}>Rich Text</button>
        <button type="button" className={`${styles.helpTab} ${tab === "md" ? styles.helpTabActive : ""}`} onClick={() => setTab("md")}>Markdown</button>
      </div>

      <div className={styles.helpPanels}>
        <div className={richCls}>
        <div className={styles.helpGrid}>
          <div className={styles.helpSection}>
            <p className={styles.helpSectionTitle}>{t("editor.helpTextFormat")}</p>
            <div className={styles.helpRows}>
              {([[t("editor.bold"), "⌘B"], [t("editor.italic"), "⌘I"], [t("editor.underline"), "⌘U"], [t("editor.strikethrough"), "⌘⇧S"], [t("editor.inlineCode"), "⌘E"]]).map(([label, key]) => (
                <div key={label} className={styles.helpRow}><span>{label}</span><KeyBadges combo={key} /></div>
              ))}
            </div>
          </div>
          <div className={styles.helpSection}>
            <p className={styles.helpSectionTitle}>{t("editor.helpParagraph")}</p>
            <div className={styles.helpRows}>
              {([[t("editor.heading1"), "⌘⌥1"], [t("editor.heading2"), "⌘⌥2"], [t("editor.heading3"), "⌘⌥3"], [t("editor.blockquote"), "⌘⇧B"], [t("editor.helpBulletList"), "⌘⇧8"], [t("editor.helpOrderedList"), "⌘⇧7"]]).map(([label, key]) => (
                <div key={label} className={styles.helpRow}><span>{label}</span><KeyBadges combo={key} /></div>
              ))}
            </div>
          </div>
          <div className={styles.helpSection}>
            <p className={styles.helpSectionTitle}>{t("editor.helpEdit")}</p>
            <div className={styles.helpRows}>
              {([[t("editor.undo"), "⌘Z"], [t("editor.redo"), "⌘⇧Z"]]).map(([label, key]) => (
                <div key={label} className={styles.helpRow}><span>{label}</span><KeyBadges combo={key} /></div>
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
        </div>
        <div className={mdCls}>
        <div className={styles.helpGrid}>
          <div className={`${styles.helpSection} ${styles.helpSectionWide}`}>
            <p className={styles.helpSectionTitle}>{t("editor.helpMdBlock")}</p>
            <div className={styles.helpRows}>
              {([[t("editor.helpMdHeading"), "# ~ ###### + Space"], [t("editor.helpMdQuote"), "> + Space"], [t("editor.helpMdDivider"), "---"], [t("editor.helpBulletList"), "- + Space"], [t("editor.helpOrderedList"), "1. + Space"], [t("editor.helpMdTask"), "[] + Space"], [t("editor.helpMdCodeBlock"), "``` + Enter"]]).map(([label, key]) => (
                <div key={label} className={styles.helpRow}><span>{label}</span><KeyBadges combo={key} /></div>
              ))}
            </div>
          </div>
          <div className={`${styles.helpSection} ${styles.helpSectionWide}`}>
            <p className={styles.helpSectionTitle}>{t("editor.helpMdInlineFormat")}</p>
            <div className={styles.helpRows}>
              {([[t("editor.bold"), "**…**"], [t("editor.italic"), "*…*"], [t("editor.strikethrough"), "~~…~~"], [t("editor.highlight"), "==…=="], [t("editor.inlineCode"), "`…`"]]).map(([label, key]) => (
                <div key={label} className={styles.helpRow}><span>{label}</span><KeyBadges combo={key} /></div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

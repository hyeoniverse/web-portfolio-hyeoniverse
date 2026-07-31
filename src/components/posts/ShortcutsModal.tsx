"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./PostEditor.module.css";

// OS 별 표시 — combo 문자열은 Mac 기호(⌘⇧⌥⌃)로 통일해두고, 렌더 시 OS 에 맞게 매핑.
// (기능은 에디터 mod=Cmd/Ctrl, altKey=Option/Alt 로 이미 크로스플랫폼 — 표시만 다름)
const MacCtx = createContext(true);

// 키 조합을 개별 키로 분리 — "⌘⇧S" → ["⌘","⇧","S"]. 수식 기호(⌘⇧⌥⌃)는 각각, 나머지는 마지막 키로.
// 마크다운 문법(#, ** 등)은 수식 기호가 없어 그대로 한 badge.
const MODS = ["⌘", "⇧", "⌥", "⌃"];
// 수식 기호 → 표시 라벨 (Mac / Windows·Linux)
const MOD_LABELS_MAC: Record<string, string> = {
  "⌘": "⌘ Command",
  "⇧": "⇧ Shift",
  "⌥": "⌥ Option",
  "⌃": "⌃ Control",
};
const MOD_LABELS_WIN: Record<string, string> = {
  "⌘": "Ctrl",
  "⇧": "Shift",
  "⌥": "Alt",
  "⌃": "Ctrl",
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
  const isMac = useContext(MacCtx);
  const modLabels = isMac ? MOD_LABELS_MAC : MOD_LABELS_WIN;
  const keys = splitKeys(combo);
  return (
    <span className="tw:inline-flex tw:items-center tw:flex-wrap tw:justify-end tw:gap-4xs">
      {keys.flatMap((k, i) => {
        const plus = i === 0 ? [] : [<span key={`p${i}`} className={styles.helpKeyPlus}>+</span>];
        // 방향키 묶음(↑↓←→)은 각 화살표를 개별 badge 로, + 없이 촘촘하게 (뭉쳐놓으면 못생김)
        if (/^[↑↓←→]{2,}$/.test(k)) {
          return [...plus, (
            <span key={`ag${i}`} className={styles.helpArrowGroup}>
              {k.split("").map((a, j) => <kbd key={`a${i}-${j}`} className={styles.helpKbd}>{a}</kbd>)}
            </span>
          )];
        }
        return [...plus, <kbd key={`k${i}`} className={styles.helpKbd}>{modLabels[k] ?? k}</kbd>];
      })}
    </span>
  );
}

export default function ShortcutsModalContent() {
  const { t, language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [tab, setTab] = useState<"block" | "rich" | "md">("block");
  const [isMac, setIsMac] = useState(true);
  useEffect(() => { setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);
  // 패널들을 grid 로 겹쳐 컨테이너 높이를 항상 가장 큰 쪽으로 고정 → 탭 전환 시 모달 높이 안 변함
  const blockCls = `${styles.helpPanel}${tab !== "block" ? ` ${styles.helpPanelHidden}` : ""}`;
  const richCls = `${styles.helpPanel}${tab !== "rich" ? ` ${styles.helpPanelHidden}` : ""}`;
  const mdCls = `${styles.helpPanel}${tab !== "md" ? ` ${styles.helpPanelHidden}` : ""}`;

  return (
    <MacCtx.Provider value={isMac}>
      <div className={styles.helpTabs}>
        <button type="button" className={`${styles.helpTab} ${tab === "block" ? styles.helpTabActive : ""}`} onClick={() => setTab("block")}>{L("블록", "Blocks")}</button>
        <button type="button" className={`${styles.helpTab} ${tab === "rich" ? styles.helpTabActive : ""}`} onClick={() => setTab("rich")}>Rich Text</button>
        <button type="button" className={`${styles.helpTab} ${tab === "md" ? styles.helpTabActive : ""}`} onClick={() => setTab("md")}>Markdown</button>
      </div>

      <div className="tw:grid">
        {/* ── 블록 (이동·선택) + 삽입 트리거 ── */}
        <div className={blockCls}>
        <div className={styles.helpGrid}>
          <div className={`${styles.helpSection} ${styles.helpSectionWide}`}>
            <p className={styles.helpSectionTitle}>{L("블록 이동 · 선택", "Block move · select")}</p>
            <div className={styles.helpRows}>
              <div className={styles.helpRow}><span>{L("블록 간 이동 (커서)", "Move between blocks")}</span><KeyBadges combo="⌥↑↓" /></div>
              <div className={styles.helpRow}><span>{L("블록 이동", "Move block")}</span><KeyBadges combo="⌘⌥⇧↑↓←→" /></div>
              <div className={styles.helpRow}><span>{L("블록 선택", "Select blocks")}</span><KeyBadges combo="⇧↑↓ / ⇧Click" /></div>
            </div>
          </div>
          <div className={`${styles.helpSection} ${styles.helpSectionWide}`}>
            <p className={styles.helpSectionTitle}>{L("삽입 트리거", "Insert triggers")}</p>
            <div className={styles.helpRows}>
              <div className={styles.helpRow}><span>{L("슬래시 메뉴 (블록 삽입)", "Slash menu (insert blocks)")}</span><KeyBadges combo="/" /></div>
              <div className={styles.helpRow}><span>{L("날짜 멘션 (오늘·내일·날짜 선택)", "Date mention (today·tomorrow·pick)")}</span><KeyBadges combo="@" /></div>
              <div className={styles.helpRow}><span>{L("이모지 피커 열기", "Open the emoji picker")}</span><KeyBadges combo=":" /></div>
              <div className={styles.helpRow}><span>{L("이모지 바로 검색 (예: :smile)", "Inline emoji search (e.g. :smile)")}</span><KeyBadges combo={L(": + 키워드", ": + keyword")} /></div>
            </div>
          </div>
        </div>
        </div>
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
    </MacCtx.Provider>
  );
}

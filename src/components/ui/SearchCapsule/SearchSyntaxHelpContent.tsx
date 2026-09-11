"use client";

import type { SearchOptions, SyntaxMode } from "@/lib/searchQuery";
import styles from "./SearchCapsule.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";

/** 검색 syntax 도움말 본문 — 공통 문법 + 매칭 강도(prefix/regex) 표.
 *  패널(배경·보더·radius·그림자·위치·애니메이션)은 공통 Popover 가 담당하고, 여기선 내용만.
 *  options/update 는 호출 측에서 주입한다 — useSearchOptions 는 hook 인스턴스마다 상태가 분리돼
 *  있어서, 같은 bucket 을 쓰는 SearchCapsule 의 상태와 live 로 sync 되려면 내려받아야 한다
 *  (여기서 다시 useSearchOptions 를 부르면 별도 인스턴스라 토글이 SearchCapsule 에 반영 안 됨). */
export default function SearchSyntaxHelpContent({
  options,
  update,
}: {
  options: Required<SearchOptions>;
  update: (patch: Partial<SearchOptions>) => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      {/* 공통 문법 */}
      <div className={styles.helpSection}>
        <div className={styles.helpSectionLabel}>{t("common.searchHelp.basics")}</div>
        <ul className={styles.helpList}>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>a b</code>
            <span className={styles.helpDesc}>{t("common.searchHelp.and")}</span>
          </li>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>+a</code>
            <span className={styles.helpDesc}>{t("common.searchHelp.must")}</span>
          </li>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>-a</code>
            <span className={styles.helpDesc}>{t("common.searchHelp.exclude")}</span>
          </li>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>&quot;a b&quot;</code>
            <span className={styles.helpDesc}>{t("common.searchHelp.phrase")}</span>
          </li>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>a OR b</code>
            <span className={styles.helpDesc}>{t("common.searchHelp.or")}</span>
          </li>
        </ul>
      </div>

      {/* 매칭 강도 + mode 토글 */}
      <div className={styles.helpSection}>
        <div className={styles.helpSectionHeader}>
          <div className={styles.helpSectionLabel}>{t("common.searchHelp.strictness")}</div>
          <div className={styles.helpModeToggle}>
            {(["prefix", "regex"] as SyntaxMode[]).map((m) => (
              <Pressable
                key={m}
                type="button"
                className={`${styles.helpModeBtn} ${options.syntaxMode === m ? styles.helpModeBtnActive : ""}`}
                onClick={() => update({ syntaxMode: m })}
              >
                {m === "prefix" ? "Prefix" : "Regex"}
              </Pressable>
            ))}
          </div>
        </div>
        {options.syntaxMode === "prefix" ? (
          <ul className={styles.helpList}>
            <li className={styles.helpRow}>
              <code className={styles.helpKey}>c:a</code>
              <span className={styles.helpDesc}>{t("common.searchHelp.caseExact")}</span>
            </li>
            <li className={styles.helpRow}>
              <code className={styles.helpKey}>w:a</code>
              <span className={styles.helpDesc}>{t("common.searchHelp.wordOnly")}</span>
            </li>
            <li className={styles.helpRow}>
              <code className={styles.helpKey}>cw:a</code>
              <span className={styles.helpDesc}>{t("common.searchHelp.caseWord")}</span>
            </li>
            <li className={styles.helpRow}>
              <code className={styles.helpKey}>c:&quot;a b&quot;</code>
              <span className={styles.helpDesc}>{t("common.searchHelp.casePhrase")}</span>
            </li>
          </ul>
        ) : (
          <>
            <ul className={styles.helpList}>
              <li className={styles.helpRow}>
                <code className={styles.helpKey}>/a/</code>
                <span className={styles.helpDesc}>{t("common.searchHelp.regex")}</span>
              </li>
              <li className={styles.helpRow}>
                <code className={styles.helpKey}>/a/i</code>
                <span className={styles.helpDesc}><code>i</code> {t("common.searchHelp.flagI")}</span>
              </li>
              <li className={styles.helpRow}>
                <code className={styles.helpKey}>/\ba\b/</code>
                <span className={styles.helpDesc}>{t("common.searchHelp.wordBoundary")}</span>
              </li>
            </ul>
            <p className={styles.helpFootnote}>
              {t("common.searchHelp.regexLead")} <code>.</code> <code>*</code> <code>+</code> <code>|</code> <code>^</code> <code>$</code> <code>\d</code> <code>\w</code> <code>\s</code> {t("common.searchHelp.regexEtc")} <code>\</code> {t("common.searchHelp.regexEscape")} <code>\.</code>)
            </p>
          </>
        )}
      </div>
    </>
  );
}

"use client";

import type { SearchOptions, SyntaxMode } from "@/lib/searchQuery";
import styles from "./SearchCapsule.module.css";
import Pressable from "@/components/ui/Pressable";

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
  return (
    <>
      {/* 공통 문법 */}
      <div className={styles.helpSection}>
        <div className={styles.helpSectionLabel}>공통</div>
        <ul className={styles.helpList}>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>a b</code>
            <span className={styles.helpDesc}>a 와 b 가 모두 포함된 결과만 (AND)</span>
          </li>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>+a</code>
            <span className={styles.helpDesc}>a 가 반드시 들어가야 함 (명시적 AND, naked term 과 동일)</span>
          </li>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>-a</code>
            <span className={styles.helpDesc}>a 가 들어간 결과는 모두 제외</span>
          </li>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>&quot;a b&quot;</code>
            <span className={styles.helpDesc}>a b 가 공백 포함해 정확히 그 순서로 붙어있는 결과만</span>
          </li>
          <li className={styles.helpRow}>
            <code className={styles.helpKey}>a OR b</code>
            <span className={styles.helpDesc}>a 또는 b 중 하나만 있어도 매칭 (대문자 OR 필수)</span>
          </li>
        </ul>
      </div>

      {/* 매칭 강도 + mode 토글 */}
      <div className={styles.helpSection}>
        <div className={styles.helpSectionHeader}>
          <div className={styles.helpSectionLabel}>매칭 강도</div>
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
              <span className={styles.helpDesc}>대소문자까지 정확히 (a 매칭, A 는 제외)</span>
            </li>
            <li className={styles.helpRow}>
              <code className={styles.helpKey}>w:a</code>
              <span className={styles.helpDesc}>단어 자체만 (apple 매칭, apples / pineapple 제외)</span>
            </li>
            <li className={styles.helpRow}>
              <code className={styles.helpKey}>cw:a</code>
              <span className={styles.helpDesc}>대소문자 + 단어 단위 둘 다 적용 (가장 엄격)</span>
            </li>
            <li className={styles.helpRow}>
              <code className={styles.helpKey}>c:&quot;a b&quot;</code>
              <span className={styles.helpDesc}>구문 매칭에 대소문자 조건까지 적용 (조합 가능)</span>
            </li>
          </ul>
        ) : (
          <>
            <ul className={styles.helpList}>
              <li className={styles.helpRow}>
                <code className={styles.helpKey}>/a/</code>
                <span className={styles.helpDesc}>regex 패턴 매칭 (기본은 대소문자 구분)</span>
              </li>
              <li className={styles.helpRow}>
                <code className={styles.helpKey}>/a/i</code>
                <span className={styles.helpDesc}><code>i</code> 플래그 = case insensitive</span>
              </li>
              <li className={styles.helpRow}>
                <code className={styles.helpKey}>/\ba\b/</code>
                <span className={styles.helpDesc}>단어 boundary — 합성어 제외</span>
              </li>
            </ul>
            <p className={styles.helpFootnote}>
              JS regex 표준 그대로 지원 — <code>.</code> <code>*</code> <code>+</code> <code>|</code> <code>^</code> <code>$</code> <code>\d</code> <code>\w</code> <code>\s</code> 등. 메타문자를 글자로 찾으려면 <code>\</code> escape (예: <code>\.</code>)
            </p>
          </>
        )}
      </div>
    </>
  );
}

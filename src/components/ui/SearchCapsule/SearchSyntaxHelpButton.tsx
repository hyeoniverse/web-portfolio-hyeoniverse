"use client";

import Popover from "@/components/ui/Popover";
import HelpButton from "@/components/ui/HelpButton";
import { useSearchOptions } from "./useSearchOptions";
import type { SyntaxMode } from "@/lib/searchQuery";
import styles from "./SearchCapsule.module.css";

interface Props {
  /** options bucket key — 기본 "global". 페이지별로 다르게 가지려면 지정. */
  optionsKey?: string;
  /** trigger 버튼에 적용할 className */
  className?: string;
}

/** 검색 syntax 도움말 + 매칭 강도 모드 선택을 보여주는 standalone 버튼.
 *  SearchCapsule 안의 ? 버튼과 분리 — 페이지에 1개만 두면 됨.
 *
 *  포털/위치계산/바깥클릭/애니메이션은 전부 공통 Popover 가 담당한다.
 *  (예전엔 createPortal + getBoundingClientRect clamp 로 직접 구현했는데, 공통 Popover 가
 *   하는 일을 재구현한 것이었고 그 과정에서 배경/보더/radius 가 댓글쪽 도움말과 달라졌었다.) */
export default function SearchSyntaxHelpButton({ optionsKey, className }: Props) {
  const { options: searchOptions, update: updateSearchOptions } = useSearchOptions(optionsKey ?? "global");

  return (
    <Popover
      placement="bottom-end"
      contentClassName={styles.searchHelpPopover}
      trigger={
        <HelpButton
          aria-label="검색 문법 도움말"
          title="검색 문법 + 옵션"
          className={className}
        />
      }
    >
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
                      <button
                        key={m}
                        type="button"
                        className={`${styles.helpModeBtn} ${searchOptions.syntaxMode === m ? styles.helpModeBtnActive : ""}`}
                        onClick={() => updateSearchOptions({ syntaxMode: m })}
                      >
                        {m === "prefix" ? "Prefix" : "Regex"}
                      </button>
                    ))}
                  </div>
                </div>
                {searchOptions.syntaxMode === "prefix" ? (
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
    </Popover>
  );
}

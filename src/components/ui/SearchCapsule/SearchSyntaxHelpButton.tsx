"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
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
 *  SearchCapsule 안의 ? 버튼과 분리 — 페이지에 1개만 두면 됨. */
export default function SearchSyntaxHelpButton({ optionsKey, className }: Props) {
  const { options: searchOptions, update: updateSearchOptions } = useSearchOptions(optionsKey ?? "global");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);

  /* 위치 계산 — trigger 의 우측 아래에 popover 배치 */
  useEffect(() => {
    if (!open) { setRect(null); return; }
    const update = () => {
      const el = triggerRef.current as Element | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.right });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  /* 바깥 클릭으로 닫기 */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const trigger = triggerRef.current as Element | null;
      if (trigger?.contains(e.target as Node)) return;
      const popover = document.getElementById("search-syntax-help-popover");
      if (popover?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="outline"
        shape="circle"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="검색 문법 도움말"
        title="검색 문법 + 옵션"
        className={`${styles.helpBtnStandalone} ${className ?? ""}`}
      >
        ?
      </Button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              id="search-syntax-help-popover"
              className={`${styles.helpDropdown} ${styles.helpDropdownSolid}`}
              initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              style={{
                transformOrigin: "top right",
                position: "fixed",
                top: rect.top,
                /* trigger 의 우측 모서리 기준 — popover 의 right edge 를 그 위치에 맞춤 */
                left: rect.left - 360,
                width: 360,
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

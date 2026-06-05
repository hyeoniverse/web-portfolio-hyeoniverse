"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Eraser, History, HelpCircle } from "lucide-react";
import Select from "@/components/ui/Select";
import CloseButton from "@/components/ui/CloseButton";
import type { SearchOptions, SyntaxMode } from "@/lib/searchQuery";
import { useSearchHistory } from "./useSearchHistory";
import { useSearchOptions } from "./useSearchOptions";
import styles from "./SearchCapsule.module.css";

export interface SearchCapsuleProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** 검색 타입 selector — 객체로 묶어 "셋 다 또는 0개" 를 타입으로 강제 */
  typeSelector?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  };
  align?: "left" | "right";
  className?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
  /** capsule 높이 — md=32 (default), sm=28 */
  size?: "sm" | "md";
  /** 검색 이력 bucket key — 미지정 시 현재 pathname 사용. null 명시 시 이력 기능 비활성. */
  historyKey?: string | null;
  /** 이력 최대 개수 (default 8). */
  historyLimit?: number;
  /** URL query 동기화 — string 으로 param 이름 지정 (예: "q") 시 ?q=... 로 자동 반영 + 초기값 hydrate. */
  routeParam?: string;
  /** 도움말 + 엄격도 옵션 UI 표시. default true (호출처 변경 없이 노출) — false 면 숨김. */
  showHelp?: boolean;
  /** 엄격도 옵션 변경 콜백 — 페이지가 필터 로직에 사용할 때. */
  onSearchOptionsChange?: (options: Required<SearchOptions>) => void;
  /** 검색 결과 유무 — true 일 때 검색어가 안정되면 (1초 후) 이력에 자동 저장. 오타/노이즈 필터링. */
  hasResults?: boolean;
}

/** 공통 검색 capsule — Select(옵션) + 아이콘 + input + 검색 이력 dropdown. */
export default function SearchCapsule({
  search,
  onSearchChange,
  placeholder = "Search...",
  typeSelector,
  align = "right",
  className,
  autoFocus,
  onBlur,
  size = "md",
  historyKey,
  historyLimit = 10,
  routeParam,
  showHelp = false,
  onSearchOptionsChange,
  hasResults,
}: SearchCapsuleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const enabled = historyKey !== null;
  const key = historyKey ?? pathname ?? "default";
  const { items: history, add: addHistory, remove: removeHistory, clear: clearHistory } = useSearchHistory(key, historyLimit);
  const { options: searchOptions, update: updateSearchOptions } = useSearchOptions(key);

  /* options 변경 시 호출처에 알림 */
  useEffect(() => {
    onSearchOptionsChange?.(searchOptions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOptions.syntaxMode]);

  /* routeParam 초기 hydrate — URL ?<param>=... 가 있고 props.search 가 비어있으면 URL 값 적용 */
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!routeParam || hydratedRef.current) return;
    hydratedRef.current = true;
    const fromUrl = searchParams?.get(routeParam) ?? "";
    if (fromUrl && !search) onSearchChange(fromUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParam]);

  /* search 값 → URL sync (replaceState 로 history entry 누적 방지) */
  useEffect(() => {
    if (!routeParam) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const current = params.get(routeParam) ?? "";
    const trimmed = search.trim();
    if (trimmed === current) return;
    if (trimmed) params.set(routeParam, trimmed);
    else params.delete(routeParam);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, routeParam]);

  const [focused, setFocused] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* dropdown 을 portal 로 렌더 — 부모 overflow:hidden 영향 피함.
     capsule 의 viewport 위치 (top/left/width) 를 추적해서 fixed 로 배치.
     초기 위치만 state, 이후 스크롤/리사이즈 갱신은 ref + 직접 DOM (rAF) 으로 처리 —
     setState 매 프레임 호출 시 React commit 1프레임 lag → search 입력과 dropdown 사이 bounce 발생. */
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const helpDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focused && !helpOpen) { setDropdownRect(null); return; }
    const measure = () => {
      const el = rootRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.bottom, left: r.left, width: r.width };
    };
    const initial = measure();
    if (initial) setDropdownRect(initial);
    let rafId: number | null = null;
    const applyDirect = () => {
      rafId = null;
      const m = measure();
      if (!m) return;
      for (const dd of [historyDropdownRef.current, helpDropdownRef.current]) {
        if (!dd) continue;
        dd.style.top = `${m.top}px`;
        dd.style.left = `${m.left}px`;
        dd.style.width = `${m.width}px`;
      }
    };
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(applyDirect);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [focused, helpOpen]);

  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => { setPortalMounted(true); }, []);

  /* 바깥 클릭으로 dropdown 닫기 */
  useEffect(() => {
    if (!focused && !helpOpen) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setFocused(false);
        setHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused, helpOpen]);

  const commit = (q: string) => {
    if (enabled) addHistory(q);
  };

  /* 결과가 유의미할 때 — 검색어 안정화 후 (1s) 자동 저장. 오타/노이즈 필터링. */
  useEffect(() => {
    if (!enabled || !hasResults) return;
    const trimmed = search.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => { addHistory(trimmed); }, 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, hasResults, enabled]);

  const showHistory = enabled && focused && history.length > 0 && !search.trim() && !helpOpen;

  return (
    <div ref={rootRef} className={`${styles.capsule} ${size === "sm" ? styles.capsuleSm : ""} ${align === "right" ? styles.right : ""} ${focused ? styles.capsuleFocused : ""} ${className ?? ""}`}>
      {typeSelector && (
        <Select
          value={typeSelector.value}
          options={typeSelector.options}
          onChange={typeSelector.onChange}
          className={styles.selectWrap}
          size={size === "sm" ? "sm" : "default"}
        />
      )}
      <Search className={styles.icon} size={14} />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          if (search.trim()) commit(search);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && search.trim()) commit(search);
        }}
        autoFocus={autoFocus}
        className={styles.input}
      />
      {/* X 버튼 — 항상 layout 차지 (capsule 너비 변동 방지). search 없을 때 visibility hidden + pointer-events none. */}
      <button
        type="button"
        className={`${styles.clearBtn} ${!search ? styles.clearBtnHidden : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSearchChange("");
        }}
        aria-label="clear"
        title="지우기"
        tabIndex={search ? 0 : -1}
        aria-hidden={!search}
      >
        <Eraser size={11} strokeWidth={2} />
      </button>
      {showHelp && (
        <button
          type="button"
          className={styles.helpBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            setHelpOpen((v) => !v);
            if (!helpOpen) setFocused(false);
          }}
          aria-label="검색 문법 도움말"
          title="검색 문법 + 옵션"
        >
          <HelpCircle size={12} strokeWidth={2} />
        </button>
      )}

      {portalMounted && createPortal(
        <>
      <AnimatePresence>
        {showHistory && dropdownRect && (
          <motion.div
            ref={historyDropdownRef}
            className={`${styles.historyDropdown} ${focused ? styles.capsuleFocused : ""}`}
            initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{
              transformOrigin: "top center",
              position: "fixed",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            <div className={styles.historyHeader}>
              <span className={styles.historyHeaderLabel}>
                <History size={11} strokeWidth={2} />
                <span>최근 검색</span>
              </span>
              <button
                type="button"
                className={styles.historyClearAll}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); clearHistory(); }}
              >
                전체 삭제
              </button>
            </div>
            <ul className={styles.historyList}>
              {history.map((q) => (
                <li key={q} className={styles.historyItem}>
                  <button
                    type="button"
                    className={styles.historyText}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSearchChange(q);
                      commit(q);
                      setFocused(false);
                      inputRef.current?.blur();
                    }}
                  >
                    {q}
                  </button>
                  <span className={styles.historyRemoveWrap} onMouseDown={(e) => e.preventDefault()}>
                    <CloseButton
                      size="xs"
                      className={styles.historyRemove}
                      ariaLabel={`이력 제거: ${q}`}
                      title="제거"
                      onClick={(e) => { e.stopPropagation(); removeHistory(q); }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {helpOpen && dropdownRect && (
          <motion.div
            ref={helpDropdownRef}
            className={`${styles.helpDropdown} ${focused ? styles.capsuleFocused : ""}`}
            initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{
              transformOrigin: "top center",
              position: "fixed",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
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

            {/* 모드별 매칭 강도 문법 — label 줄 우측에 prefix/regex 토글 */}
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
      </AnimatePresence>
        </>,
        document.body,
      )}
    </div>
  );
}

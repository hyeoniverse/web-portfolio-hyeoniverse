"use client";

import { useRef, useState, useEffect, useContext } from "react";
import { useHasMounted } from "@/hooks/useHasMounted";
import type { SelectOption } from "@/types";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Eraser, History, HelpCircle } from "@/components/icons";
import Select from "@/components/ui/Select";
import CloseButton from "@/components/ui/CloseButton";
import Popover from "@/components/ui/Popover";
import type { SearchOptions } from "@/lib/searchQuery";
import { useSearchHistory } from "./useSearchHistory";
import { useSearchOptions } from "./useSearchOptions";
import SearchSyntaxHelpButton from "./SearchSyntaxHelpButton";
import SearchSyntaxHelpContent from "./SearchSyntaxHelpContent";
import styles from "./SearchCapsule.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";

export interface SearchCapsuleProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** 검색 타입 selector — 객체로 묶어 "셋 다 또는 0개" 를 타입으로 강제 */
  typeSelector?: {
    value: string;
    options: SelectOption[];
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
  /** 검색창 오른쪽에 문법 도움말(SearchSyntaxHelpButton)을 함께 렌더. 페이지에서 별도 배치 불필요. */
  syntaxHelp?: boolean;
  /** 엄격도 옵션 변경 콜백 — 페이지가 필터 로직에 사용할 때. */
  onSearchOptionsChange?: (options: Required<SearchOptions>) => void;
  /** 검색 결과 유무 — true 일 때 검색어가 안정되면 (1초 후) 이력에 자동 저장. 오타/노이즈 필터링. */
  hasResults?: boolean;
  /** circle → capsule morph 모드 — 접힌 원형에서 클릭 시 펼쳐지고, 비었을 때 blur 로 다시 접힘.
   *  시리즈 영역처럼 compact 배치가 필요할 때. 펼친 너비는 collapsedWidth 로 조정. */
  collapsible?: boolean;
  /** collapsible 펼침 너비(px). default 280. */
  expandedWidth?: number;
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
  syntaxHelp = false,
  onSearchOptionsChange,
  hasResults,
  collapsible = false,
  expandedWidth = 280,
}: SearchCapsuleProps) {
  const { t } = useLanguage();
  const clearLabel = t("common.clear");
  const pathname = usePathname();
  // App Router 컨텍스트 직접 구독 — 리더 island(createRoot) 처럼 router provider 밖에서 마운트돼도 throw 없이 null
  const router = useContext(AppRouterContext);
  /* URL 쿼리는 effect 안에서 window.location.search 로 읽는다(#913). useSearchParams() 를 부르면 정적 렌더에서 가장 가까운
     Suspense 경계까지 브라우저 렌더로 빠져, 이 캡슐을 쓰는 페이지의 본문이 미리 그린 HTML 에서 통째로 빠졌다. 값은 effect 에서만
     쓰므로 렌더 중에 구독할 필요가 없다. 네비게이션도 같은 이유로 이렇게 읽는다 */
  const readUrlParams = () => new URLSearchParams(window.location.search);
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
    const fromUrl = readUrlParams().get(routeParam) ?? "";
    if (fromUrl && !search) onSearchChange(fromUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParam]);

  /* search 값 → URL sync (replaceState 로 history entry 누적 방지) */
  useEffect(() => {
    if (!routeParam) return;
    const params = readUrlParams();
    const current = params.get(routeParam) ?? "";
    const trimmed = search.trim();
    if (trimmed === current) return;
    if (trimmed) params.set(routeParam, trimmed);
    else params.delete(routeParam);
    const qs = params.toString();
    router?.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, routeParam]);

  const [focused, setFocused] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  /** collapsible morph 펼침 상태 (collapsible=false 면 무시) */
  const [morphOpen, setMorphOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* morph 펼칠 때 width transition(0.25s) 후 input 포커스 */
  useEffect(() => {
    if (!collapsible || !morphOpen) return;
    const id = setTimeout(() => inputRef.current?.focus(), 180);
    return () => clearTimeout(id);
  }, [collapsible, morphOpen]);

  /* dropdown 을 portal 로 렌더 — 부모 overflow:hidden 영향 피함.
     capsule 의 viewport 위치 (top/left/width) 를 추적해서 fixed 로 배치.
     초기 위치만 state, 이후 스크롤/리사이즈 갱신은 ref + 직접 DOM (rAF) 으로 처리 —
     setState 매 프레임 호출 시 React commit 1프레임 lag → search 입력과 dropdown 사이 bounce 발생. */
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focused) { setDropdownRect(null); return; }
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
      for (const dd of [historyDropdownRef.current]) {
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
  }, [focused]);

  const portalMounted = useHasMounted();

  /* 바깥 클릭으로 dropdown 닫기 */
  useEffect(() => {
    if (!focused) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused]);

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

  const morphExpanded = collapsible && morphOpen;

  const capsule = (
    <div
      ref={rootRef}
      className={`${styles.capsule} ${size === "sm" ? styles.capsuleSm : ""} ${align === "right" ? styles.right : ""} ${focused ? styles.capsuleFocused : ""} ${collapsible ? styles.collapsible : ""} ${morphExpanded ? styles.collapsibleOpen : ""} ${className ?? ""}`}
      style={collapsible && morphOpen ? { width: expandedWidth } : undefined}
      onClick={collapsible && !morphOpen ? () => setMorphOpen(true) : undefined}
      onBlur={collapsible ? (e) => {
        // 캡슐 내부(예: 스코프 Select trigger)로 포커스 이동 시엔 유지, 완전히 벗어나고 검색어 없으면 접기
        if (search.trim()) return;
        const next = e.relatedTarget as Node | null;
        if (!next || !rootRef.current?.contains(next)) setMorphOpen(false);
      } : undefined}
    >
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
        tabIndex={collapsible && !morphOpen ? -1 : undefined}
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
      <Pressable noTapScale
        type="button"
        className={`${styles.clearBtn} ${!search ? styles.clearBtnHidden : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSearchChange("");
        }}
        aria-label={clearLabel}
        title={clearLabel}
        tabIndex={search ? 0 : -1}
        aria-hidden={!search}
      >
        <Eraser size={11} strokeWidth={2} />
      </Pressable>
      {showHelp && (
        // 문법 도움말 — 공통 Popover 의 말풍선(arrow) variant. ? 버튼을 beak 으로 가리킨다.
        // (예전엔 helpDropdown 을 손으로 portal + 위치계산했는데 공통 Popover 재구현이라 제거)
        <Popover
          open={helpOpen}
          onOpenChange={(o) => { setHelpOpen(o); if (o) setFocused(false); }}
          placement="bubble"
          openOnHover
          contentClassName={styles.searchHelpPopover}
          trigger={
            <Pressable noTapScale
              type="button"
              className={styles.helpBtn}
              aria-label={t("common.searchHelp.title")}
              title={t("common.searchHelp.tooltip")}
            >
              <HelpCircle size={12} strokeWidth={2} />
            </Pressable>
          }
        >
          <SearchSyntaxHelpContent options={searchOptions} update={updateSearchOptions} />
        </Popover>
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
                <span>{t("common.searchHelp.recent")}</span>
              </span>
              <Pressable noTapScale
                type="button"
                className={styles.historyClearAll}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); clearHistory(); }}
              >
                {t("common.searchHelp.clearAll")}
              </Pressable>
            </div>
            <ul className={styles.historyList}>
              {history.map((q) => (
                <li key={q} className={styles.historyItem}>
                  <Pressable noTapScale
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
                  </Pressable>
                  <span className={styles.historyRemoveWrap} onMouseDown={(e) => e.preventDefault()}>
                    <CloseButton
                      size="xs"
                      className={styles.historyRemove}
                      ariaLabel={fillTemplate(t("common.searchHelp.removeItem"), { query: q })}
                      title={t("common.searchHelp.removeShort")}
                      onClick={(e) => { e.stopPropagation(); removeHistory(q); }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
        </>,
        document.body,
      )}
    </div>
  );

  if (!syntaxHelp) return capsule;
  // 검색창 + 도움말 버튼을 함께 렌더 — 둘 사이 간격은 페이지 컨테이너의 flex gap 이 담당.
  return (
    <>
      {capsule}
      <SearchSyntaxHelpButton optionsKey={key} />
    </>
  );
}

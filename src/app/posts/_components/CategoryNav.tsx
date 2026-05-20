"use client";

import { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useCategories, type BilingualCategory } from "@/hooks/useCategories";
import T from "@/components/ui/T";
import styles from "./CategoryNav.module.css";

interface CategoryNavProps {
  extraCategories?: string[];
  activeCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
}

export default function CategoryNav({
  extraCategories = [],
  activeCategory,
  onCategoryChange,
  expanded,
  onExpandChange,
}: CategoryNavProps) {
  const categories = useCategories();
  const navRef = useRef<HTMLDivElement>(null);
  const [overflowCount, setOverflowCount] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [rowHeight, setRowHeight] = useState(46);
  const [fullHeight, setFullHeight] = useState(9999);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  // ResizeObserver로 nav 크기 변경 시 자동 재측정
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const buttons = el.querySelectorAll<HTMLButtonElement>("button");
      if (buttons.length === 0) return;
      if (!expandedRef.current) {
        setRowHeight(buttons[0].offsetHeight);
        const firstTop = buttons[0].offsetTop;
        let hidden = 0;
        buttons.forEach((btn) => {
          if (btn.offsetTop > firstTop) hidden++;
        });
        setOverflowCount(hidden);
        setFullHeight(el.scrollHeight);
      }
    };
    const debouncedMeasure = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 100);
    };
    const ro = new ResizeObserver(debouncedMeasure);
    ro.observe(el);
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, []);

  // extra categories (DB에 있지만 config에 없는 카테고리) 통합
  const extraBilingual = useMemo<BilingualCategory[]>(
    () =>
      extraCategories
        .filter((ec) => !categories.some((c) => c.ko === ec || c.en === ec))
        .map((ec) => ({ ko: ec, en: ec })),
    [extraCategories, categories],
  );

  const allCategories = useMemo(
    () => [...categories, ...extraBilingual],
    [categories, extraBilingual],
  );

  // 활성 카테고리를 "All" 다음 첫 자리로 pin — collapsed (1 row) 일 때 항상 visible 보장.
  // active 가 +N 안에 가려져있는 경우를 방지. framer-motion layout 으로 reorder 부드럽게 처리.
  const orderedCategories = useMemo(() => {
    if (!activeCategory) return allCategories;
    const idx = allCategories.findIndex(
      (c) => c.ko === activeCategory || c.en === activeCategory,
    );
    if (idx < 0) return allCategories;
    return [
      allCategories[idx],
      ...allCategories.slice(0, idx),
      ...allCategories.slice(idx + 1),
    ];
  }, [allCategories, activeCategory]);

  // ko 또는 en 값으로 매칭
  const isActive = (cat: BilingualCategory) =>
    activeCategory === cat.ko || activeCategory === cat.en;

  const [settled, setSettled] = useState(!expanded);
  const prevExpandedRef = useRef(expanded);

  // useLayoutEffect: React가 DOM을 커밋한 직후, 브라우저 paint 전에 실행
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) { prevExpandedRef.current = expanded; return; }

    if (prevExpandedRef.current && !expanded) {
      // 닫기: transition 끄고 현재 높이 고정 → transition 켜고 rowHeight로
      setSettled(false);
      const currentH = el.getBoundingClientRect().height;
      el.style.transition = "none";
      el.style.maxHeight = `${currentH}px`;
      el.getBoundingClientRect(); // force reflow
      el.style.transition = "";
      el.style.maxHeight = `${rowHeight}px`;
    }
    if (!prevExpandedRef.current && expanded) {
      // 열기: transition 끄고 현재 높이 고정 → transition 켜고 fullHeight로
      setSettled(false);
      const currentH = el.getBoundingClientRect().height;
      el.style.transition = "none";
      el.style.maxHeight = `${currentH}px`;
      el.getBoundingClientRect(); // force reflow
      el.style.transition = "";
      el.style.maxHeight = `${fullHeight}px`;
    }
    prevExpandedRef.current = expanded;
  }, [expanded, rowHeight, fullHeight]);

  // 초기 렌더 + rowHeight 가 ResizeObserver 측정으로 갱신될 때마다 maxHeight 동기화.
  // (default rowHeight 46 → 측정 후 28 로 바뀌어도 maxHeight 가 안 따라가면 두 번째 row 잔여가 노출됨)
  // expanded 중엔 useLayoutEffect 의 transition 로직이 처리하므로 collapsed 일 때만 동기화.
  useEffect(() => {
    const el = navRef.current;
    if (el && !expanded) {
      el.style.maxHeight = `${rowHeight}px`;
    }
  }, [rowHeight, expanded]);

  // orderedCategories 변경 (active pin 으로 reorder) 시 overflow count 재계산.
  // ResizeObserver 는 nav 크기 변화에만 fire — 순서 바뀜만으론 트리거 안 되어 +N 값이 stale 됨.
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el || expanded) return;
    const buttons = el.querySelectorAll<HTMLButtonElement>("button");
    if (buttons.length === 0) return;
    const firstTop = buttons[0].offsetTop;
    let hidden = 0;
    buttons.forEach((btn) => {
      if (btn.offsetTop > firstTop) hidden++;
    });
    setOverflowCount(hidden);
    setFullHeight(el.scrollHeight);
  }, [orderedCategories, expanded]);

  const handleTransitionEnd = () => {
    setSettled(true);
  };

  const navCls = `${styles.nav} ${expanded && settled ? styles.navExpanded : ""}`;

  // indicator target: hover takes priority, fallback to active
  const activeId = activeCategory ?? "__all__";
  const indicatorId = hoveredId ?? activeId;

  const indicatorEl = (
    <motion.span
      className={styles.indicator}
      layoutId="catIndicator"
      layout="position"
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
    />
  );

  return (
    <div className={styles.wrapper}>
      <div
        className={navCls}
        ref={navRef}
        onTransitionEnd={handleTransitionEnd}
        onMouseLeave={() => setHoveredId(null)}
      >
        <button
          className={`${styles.btn} ${!activeCategory ? styles.btnActive : ""}`}
          onClick={() => onCategoryChange(null)}
          onMouseEnter={() => setHoveredId("__all__")}
          data-clickable="true"
        >
          All
          {indicatorId === "__all__" && indicatorEl}
        </button>
        {orderedCategories.map((cat) => (
          <motion.button
            key={cat.ko}
            layout="position"
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className={`${styles.btn} ${isActive(cat) ? styles.btnActive : ""}`}
            onClick={() => onCategoryChange(isActive(cat) ? null : cat.ko)}
            onMouseEnter={() => setHoveredId(cat.ko)}
            data-clickable="true"
          >
            <T ko={cat.ko} en={cat.en} delay={0} alwaysTooltip />
            {indicatorId === cat.ko && indicatorEl}
          </motion.button>
        ))}
      </div>
      {(overflowCount > 0 || expanded) && (
        <button
          className={`${styles.moreBtn} ${expanded ? styles.moreBtnOpen : ""}`}
          onClick={() => onExpandChange(!expanded)}
          data-clickable="true"
        >
          {expanded ? "Close" : `+${overflowCount}`}
        </button>
      )}
    </div>
  );
}

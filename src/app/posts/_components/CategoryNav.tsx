"use client";

import { useRef, useState, useEffect, useMemo } from "react";
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
        let maxBottom = 0;
        buttons.forEach((btn) => {
          if (btn.offsetTop > firstTop) hidden++;
          maxBottom = Math.max(maxBottom, btn.offsetTop + btn.offsetHeight);
        });
        setOverflowCount(hidden);
        // Measure full height by summing all rows (maxBottom = full content height)
        setFullHeight(maxBottom);
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

  // ko 또는 en 값으로 매칭
  const isActive = (cat: BilingualCategory) =>
    activeCategory === cat.ko || activeCategory === cat.en;

  const navStyle: React.CSSProperties = expanded
    ? { maxHeight: fullHeight }
    : { maxHeight: rowHeight };

  const navCls = `${styles.nav} ${expanded ? styles.navExpanded : ""}`;

  // indicator target: hover takes priority, fallback to active
  const activeId = activeCategory ?? "__all__";
  const indicatorId = hoveredId ?? activeId;

  const indicatorEl = (
    <motion.span
      className={styles.indicator}
      layoutId="catIndicator"
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
    />
  );

  return (
    <div className={styles.wrapper}>
      <div
        className={navCls}
        ref={navRef}
        style={navStyle}
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
        {allCategories.map((cat) => (
          <button
            key={cat.ko}
            className={`${styles.btn} ${isActive(cat) ? styles.btnActive : ""}`}
            onClick={() => onCategoryChange(isActive(cat) ? null : cat.ko)}
            onMouseEnter={() => setHoveredId(cat.ko)}
            data-clickable="true"
          >
            <T ko={cat.ko} en={cat.en} delay={0} alwaysTooltip />
            {indicatorId === cat.ko && indicatorEl}
          </button>
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

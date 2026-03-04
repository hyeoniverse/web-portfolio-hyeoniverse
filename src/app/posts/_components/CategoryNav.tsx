"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useCategories, type BilingualCategory } from "@/hooks/useCategories";
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
  const { language } = useLanguage();
  const categories = useCategories();
  const navRef = useRef<HTMLDivElement>(null);
  const [overflowCount, setOverflowCount] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [rowHeight, setRowHeight] = useState(46);

  const checkOverflow = useCallback(() => {
    const el = navRef.current;
    if (!el || expanded) return;
    const buttons = el.querySelectorAll("button");
    if (buttons.length === 0) return;
    setRowHeight(buttons[0].offsetHeight);
    const firstTop = buttons[0].offsetTop;
    let hidden = 0;
    buttons.forEach((btn) => {
      if (btn.offsetTop > firstTop) hidden++;
    });
    setOverflowCount(hidden);
  }, [expanded]);

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [checkOverflow]);

  // extra categories (DB에 있지만 config에 없는 카테고리) 통합
  const extraBilingual: BilingualCategory[] = extraCategories
    .filter((ec) => !categories.some((c) => c.ko === ec || c.en === ec))
    .map((ec) => ({ ko: ec, en: ec }));

  const allCategories = [...categories, ...extraBilingual];

  const getLabel = (cat: BilingualCategory) =>
    language === "ko" ? cat.ko : cat.en;

  // ko 또는 en 값으로 매칭
  const isActive = (cat: BilingualCategory) =>
    activeCategory === cat.ko || activeCategory === cat.en;

  const navStyle: React.CSSProperties = {
    maxHeight: expanded
      ? (navRef.current?.scrollHeight ?? 500)
      : rowHeight,
  };

  const navCls = styles.nav;

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
            {getLabel(cat)}
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
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}

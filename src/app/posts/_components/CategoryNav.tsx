"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useCategories, type BilingualCategory } from "@/hooks/useCategories";
import styles from "./CategoryNav.module.css";

interface CategoryNavProps {
  extraCategories?: string[];
  activeCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
}

export default function CategoryNav({
  extraCategories = [],
  activeCategory,
  onCategoryChange,
}: CategoryNavProps) {
  const { language } = useLanguage();
  const categories = useCategories();

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

  return (
    <div className={styles.nav}>
      <button
        className={`${styles.btn} ${!activeCategory ? styles.btnActive : ""}`}
        onClick={() => onCategoryChange(null)}
        data-clickable="true"
      >
        All
        {!activeCategory && (
          <motion.span
            className={styles.indicator}
            layoutId="catIndicator"
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
          />
        )}
      </button>
      {allCategories.map((cat) => (
        <button
          key={cat.ko}
          className={`${styles.btn} ${isActive(cat) ? styles.btnActive : ""}`}
          onClick={() => onCategoryChange(isActive(cat) ? null : cat.ko)}
          data-clickable="true"
        >
          {getLabel(cat)}
          {isActive(cat) && (
            <motion.span
              className={styles.indicator}
              layoutId="catIndicator"
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

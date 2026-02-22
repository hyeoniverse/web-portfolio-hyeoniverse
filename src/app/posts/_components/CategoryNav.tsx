"use client";

import { CATEGORIES } from "@/constants/categories";
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
  // Merge preset + custom categories (from DB), deduplicated
  const allCategories = [
    ...CATEGORIES,
    ...extraCategories.filter((c) => !CATEGORIES.includes(c as never)),
  ];

  return (
    <div className={styles.nav}>
      <div className={styles.primaryRow}>
        <button
          className={`${styles.btn} ${!activeCategory ? styles.btnActive : ""}`}
          onClick={() => onCategoryChange(null)}
          data-clickable="true"
        >
          All
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat}
            className={`${styles.btn} ${activeCategory === cat ? styles.btnActive : ""}`}
            onClick={() => onCategoryChange(cat === activeCategory ? null : cat)}
            data-clickable="true"
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

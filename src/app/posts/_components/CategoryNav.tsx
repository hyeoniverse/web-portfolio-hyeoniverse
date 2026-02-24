"use client";

import { useCategories } from "@/hooks/useCategories";
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
  const categories = useCategories();
  // Merge preset + custom categories (from DB), deduplicated
  const allCategories = [
    ...categories,
    ...extraCategories.filter((c) => !categories.includes(c)),
  ];

  return (
    <div className={styles.nav}>
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
  );
}

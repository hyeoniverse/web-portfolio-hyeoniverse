"use client";

import { useCategories } from "@/hooks/useCategories";
import CategoryLabel from "@/components/ui/CategoryLabel";
import T from "@/components/ui/T";
import Pressable from "@/components/ui/Pressable";
import styles from "./BlogSidebar.module.css";

/* blog 레이아웃 사이드바의 카테고리 목록 — 대분류 · 소분류를 세로 목록으로. 누르면 그 카테고리 하나로 거르고,
   선택된 것을 다시 누르면 해제한다(상단 CategoryNav 와 같은 필터 상태를 쓴다). */
export default function BlogCategories({
  activeCategories,
  onCategoriesChange,
}: {
  activeCategories: string[];
  onCategoriesChange: (next: string[]) => void;
}) {
  const categories = useCategories();
  if (categories.length === 0) return null;
  const isActive = (ko: string, en: string) => activeCategories.includes(ko) || activeCategories.includes(en);
  const select = (ko: string, en: string) => onCategoriesChange(isActive(ko, en) ? [] : [ko]);

  return (
    <section className={styles.section}>
      <div className={styles.label}><T k="postsPage.categories" /></div>
      <ul className={styles.catList}>
        <li>
          <Pressable
            noTapScale
            className={`${styles.catItem} ${activeCategories.length === 0 ? styles.catActive : ""}`}
            onClick={() => onCategoriesChange([])}
          >
            <T k="postsPage.allCategories" />
          </Pressable>
        </li>
        {categories.map((cat) => (
          <li key={cat.ko}>
            <Pressable
              noTapScale
              className={`${styles.catItem} ${isActive(cat.ko, cat.en) ? styles.catActive : ""}`}
              onClick={() => select(cat.ko, cat.en)}
            >
              <CategoryLabel category={cat.ko} />
            </Pressable>
            {cat.children && cat.children.length > 0 && (
              <ul className={styles.catChildren}>
                {cat.children.map((ch) => (
                  <li key={ch.ko}>
                    <Pressable
                      noTapScale
                      className={`${styles.catItem} ${styles.catChild} ${isActive(ch.ko, ch.en) ? styles.catActive : ""}`}
                      onClick={() => select(ch.ko, ch.en)}
                    >
                      <CategoryLabel category={ch.ko} />
                    </Pressable>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

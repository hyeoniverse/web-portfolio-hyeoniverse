"use client";

import Button from "@/components/ui/Button";
import styles from "./SeriesCategoryFilter.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

/* 시리즈 카테고리 필터 — "전체" + 카테고리별 버튼(개수). 여러 개 동시 선택 가능(합집합),
   활성 버튼 재클릭으로 개별 해제, "전체"로 모두 해제. 카테고리가 없으면 렌더하지 않는다. */
export default function SeriesCategoryFilter({
  buckets,
  total,
  active,
  onToggle,
  onClear,
}: {
  buckets: Map<string, number>;
  total: number;
  active: ReadonlySet<string>;
  onToggle: (category: string) => void;
  onClear: () => void;
}) {
  const { t } = useLanguage();
  if (buckets.size === 0) return null;
  return (
    <div className={styles.categoryRow}>
      <Button
        type="button"
        variant="outline"
        size="xs"
        active={active.size === 0}
        onClick={onClear}
        data-clickable="true"
      >
        {t("common.all")}
        <span className={styles.categoryCount}>{total}</span>
      </Button>
      {Array.from(buckets.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => {
          const isActive = active.has(cat);
          return (
            <Button
              key={cat}
              type="button"
              variant="outline"
              size="xs"
              active={isActive}
              onClick={() => onToggle(cat)}
              data-clickable="true"
            >
              {cat}
              <span className={styles.categoryCount}>{count}</span>
            </Button>
          );
        })}
    </div>
  );
}

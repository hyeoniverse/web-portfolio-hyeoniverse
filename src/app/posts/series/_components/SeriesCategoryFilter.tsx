"use client";

import Button from "@/components/ui/Button";
import styles from "./SeriesCategoryFilter.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

/* 시리즈 카테고리 필터 — "전체" + 카테고리별 버튼(개수), 활성 버튼 재클릭으로 해제. 카테고리가 없으면 렌더하지 않는다. */
export default function SeriesCategoryFilter({
  buckets,
  total,
  active,
  onChange,
}: {
  buckets: Map<string, number>;
  total: number;
  active: string | null;
  onChange: (category: string | null) => void;
}) {
  const { t } = useLanguage();
  if (buckets.size === 0) return null;
  return (
    <div className={styles.categoryRow}>
      <Button
        type="button"
        variant="outline"
        size="xs"
        active={active === null}
        onClick={() => onChange(null)}
        data-clickable="true"
      >
        {t("common.all")}
        <span className={styles.categoryCount}>{total}</span>
      </Button>
      {Array.from(buckets.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => {
          const isActive = active === cat;
          return (
            <Button
              key={cat}
              type="button"
              variant="outline"
              size="xs"
              active={isActive}
              onClick={() => onChange(isActive ? null : cat)}
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

"use client";

import { useMemo } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import styles from "./Pagination.module.css";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 2)
      return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, page - 1, page, page + 1, -1, totalPages];
  }, [page, totalPages]);

  const singlePage = totalPages <= 1;

  return (
    <div className={`${styles.pagination} ${className ?? ""}`}>
      <button type="button" disabled={page <= 1} onClick={() => onChange(1)} className={styles.pageBtn} title="First">
        <ChevronsLeft size={14} />
      </button>
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className={styles.pageBtn}>
        <ChevronLeft size={14} />
      </button>
      {singlePage ? (
        <button type="button" className={`${styles.pageBtn} ${styles.pageBtnActive}`}>1</button>
      ) : pageNumbers.map((p, i) =>
        p === -1 ? (
          <span key={`ellipsis-${i}`} className={styles.ellipsis}>&hellip;</span>
        ) : (
          <button
            type="button"
            key={p}
            onClick={() => onChange(p)}
            className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={styles.pageBtn}>
        <ChevronRight size={14} />
      </button>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(totalPages)} className={styles.pageBtn} title="Last">
        <ChevronsRight size={14} />
      </button>
    </div>
  );
}

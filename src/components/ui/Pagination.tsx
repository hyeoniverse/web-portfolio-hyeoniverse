"use client";

import { useMemo } from "react";
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

  if (totalPages <= 1) return null;

  return (
    <div className={`${styles.pagination} ${className ?? ""}`}>
      <button disabled={page <= 1} onClick={() => onChange(1)} className={styles.pageBtn} title="First">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
      </button>
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className={styles.pageBtn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      {pageNumbers.map((p, i) =>
        p === -1 ? (
          <span key={`ellipsis-${i}`} className={styles.ellipsis}>&hellip;</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
          >
            {p}
          </button>
        ),
      )}
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={styles.pageBtn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
      <button disabled={page >= totalPages} onClick={() => onChange(totalPages)} className={styles.pageBtn} title="Last">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
      </button>
    </div>
  );
}

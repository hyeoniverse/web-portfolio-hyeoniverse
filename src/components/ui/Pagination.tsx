"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "@/components/icons";
import styles from "./Pagination.module.css";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
  /** false 면 Jump-to input 숨김 (default true). totalPages 가 5 이하면 자동 숨김 */
  showJump?: boolean;
  /** 버튼 크기 — sm (28) / md (38, default) */
  size?: "sm" | "md";
}

export default function Pagination({ page, totalPages, onChange, className, showJump = true, size = "md" }: PaginationProps) {
  const pageNumbers = useMemo(() => {
    // single page 도 명시적 active "1" 버튼이 보이도록 [1] 반환
    if (totalPages <= 1) return [1];
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 2)
      return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, page - 1, page, page + 1, -1, totalPages];
  }, [page, totalPages]);

  // Jump-to input — 외부 page 변경 시 sync, 입력은 string 으로 (지우다가 빈 상태 가능)
  const [jumpInput, setJumpInput] = useState(String(page));
  useEffect(() => { setJumpInput(String(page)); }, [page]);

  const submitJump = () => {
    const n = parseInt(jumpInput, 10);
    if (!Number.isFinite(n)) { setJumpInput(String(page)); return; }
    const clamped = Math.min(totalPages, Math.max(1, n));
    if (clamped !== page) onChange(clamped);
    setJumpInput(String(clamped));
  };

  const renderJump = showJump && totalPages > 5;

  return (
    <div className={`${styles.paginationWrap} ${size === "sm" ? styles.paginationWrapSm : ""} ${className ?? ""}`}>
      <div className={styles.pagination}>
        <button type="button" disabled={page <= 1} onClick={() => onChange(1)} className={styles.pageBtn} title="First">
          <ChevronsLeft size={14} />
        </button>
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className={styles.pageBtn}>
          <ChevronLeft size={14} />
        </button>
        {pageNumbers.map((p, i) =>
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

      {renderJump && (
        <form
          className={styles.jumpRow}
          onSubmit={(e) => { e.preventDefault(); submitJump(); }}
        >
          <label className={styles.jumpLabel}>Go to</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={totalPages}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onBlur={submitJump}
            className={styles.jumpInput}
            aria-label="페이지로 이동"
          />
          <span className={styles.jumpTotal}>/ {totalPages}</span>
        </form>
      )}
    </div>
  );
}

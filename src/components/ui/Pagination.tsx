"use client";

import { useMemo } from "react";
import { useStateFromProp } from "@/hooks/useStateFromProp";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "@/components/icons";
import styles from "./Pagination.module.css";
import Pressable from "@/components/ui/Pressable";

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
  const [jumpInput, setJumpInput] = useStateFromProp(page, String);

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
        <Pressable disabled={page <= 1} onClick={() => onChange(1)} className={styles.pageBtn} aria-label="첫 페이지" title="First">
          <ChevronsLeft size={14} />
        </Pressable>
        <Pressable disabled={page <= 1} onClick={() => onChange(page - 1)} className={styles.pageBtn} aria-label="이전 페이지">
          <ChevronLeft size={14} />
        </Pressable>
        {pageNumbers.map((p, i) =>
          p === -1 ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>&hellip;</span>
          ) : (
            <Pressable
              type="button"
              key={p}
              onClick={() => onChange(p)}
              className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
            >
              {p}
            </Pressable>
          ),
        )}
        <Pressable disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={styles.pageBtn} aria-label="다음 페이지">
          <ChevronRight size={14} />
        </Pressable>
        <Pressable disabled={page >= totalPages} onClick={() => onChange(totalPages)} className={styles.pageBtn} aria-label="마지막 페이지" title="Last">
          <ChevronsRight size={14} />
        </Pressable>
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

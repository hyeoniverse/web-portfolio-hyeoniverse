"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import Pressable from "@/components/ui/Pressable";
import styles from "./PostsPagination.module.css";

/* 글 목록 페이지네이션 — 7페이지 이하면 전부, 넘으면 현재 주변 + 양끝 + 말줄임(-1).
   타임라인(무한 스크롤)에선 부모가 렌더하지 않는다. */
export default function PostsPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: Dispatch<SetStateAction<number>>;
}) {
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 2)
      return [
        1,
        -1,
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, -1, page - 1, page, page + 1, -1, totalPages];
  }, [page, totalPages]);

  return (
    <div className={styles.pagination}>
      <Pressable
        disabled={page <= 1}
        onClick={() => onPageChange((p) => p - 1)}
        className={styles.pageBtn}
        data-clickable="true"
      >
        &larr;
      </Pressable>
      {pageNumbers.map((p, i) =>
        p === -1 ? (
          <span key={`ellipsis-${i}`} className={styles.ellipsis}>
            &hellip;
          </span>
        ) : (
          <Pressable
            key={p}
            onClick={() => onPageChange(p)}
            className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
            data-clickable="true"
          >
            {p}
          </Pressable>
        ),
      )}
      <Pressable
        disabled={page >= totalPages}
        onClick={() => onPageChange((p) => p + 1)}
        className={styles.pageBtn}
        data-clickable="true"
      >
        &rarr;
      </Pressable>
    </div>
  );
}

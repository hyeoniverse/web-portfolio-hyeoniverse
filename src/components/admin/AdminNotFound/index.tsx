"use client";

import Link from "next/link";
import { SearchX, ChevronLeft } from "lucide-react";
import styles from "./AdminNotFound.module.css";

interface AdminNotFoundProps {
  /** 표시 메시지 */
  title: string;
  /** 목록 등으로 돌아가는 링크 */
  backHref: string;
  backLabel: string;
}

/** admin 편집/상세에서 항목을 찾지 못했을 때 — 전역 에러 페이지처럼 중앙 정렬 레이아웃 */
export default function AdminNotFound({ title, backHref, backLabel }: AdminNotFoundProps) {
  return (
    <div className={styles.container}>
      <SearchX size={40} strokeWidth={1.5} />
      <p className={styles.title}>{title}</p>
      <Link href={backHref} className={styles.backBtn}>
        <ChevronLeft size={16} />
        {backLabel}
      </Link>
    </div>
  );
}

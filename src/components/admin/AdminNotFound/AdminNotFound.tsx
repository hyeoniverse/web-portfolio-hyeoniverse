"use client";

import Link from "next/link";
import { SearchX, ShieldAlert, ChevronLeft } from "@/components/icons";
import styles from "./AdminNotFound.module.css";

interface AdminNotFoundProps {
  /** 표시 메시지 */
  title: string;
  /** 왜 그런지 — 서버가 돌려준 사유 등. 없으면 표시하지 않는다. */
  description?: string;
  /**
   * 어떤 상태인가.
   *   notFound  대상이 없다
   *   denied    대상은 있지만 다룰 권한이 없다
   * 두 경우를 같은 화면으로 보여주면, 멀쩡히 있는 글을 없다고 안내하게 된다.
   */
  variant?: "notFound" | "denied";
  /** 목록 등으로 돌아가는 링크 */
  backHref: string;
  backLabel: string;
}

/** admin 편집/상세에서 항목을 열지 못했을 때 — 전역 에러 페이지처럼 중앙 정렬 레이아웃 */
export default function AdminNotFound({
  title, description, variant = "notFound", backHref, backLabel,
}: AdminNotFoundProps) {
  const Icon = variant === "denied" ? ShieldAlert : SearchX;
  return (
    <div className={styles.container}>
      <Icon size={40} strokeWidth={1.5} />
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      <Link href={backHref} className={styles.backBtn}>
        <ChevronLeft size={16} />
        {backLabel}
      </Link>
    </div>
  );
}

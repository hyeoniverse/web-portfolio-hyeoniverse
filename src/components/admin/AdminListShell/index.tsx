"use client";

import { useEffect, type ReactNode } from "react";
import { useLenis } from "@/providers/LenisProvider";
import Button from "@/components/ui/Button";
import styles from "./AdminListShell.module.css";

export { default as adminShellStyles } from "./AdminListShell.module.css";

interface AdminListShellProps {
  title: ReactNode;
  /** 새 항목 버튼 — 목록형(posts/works)만. 모더레이션 목록(신고 등)은 headerExtra 로 대체하고 생략. */
  newHref?: string;
  newLabel?: string;
  saving?: boolean;
  hasChanges?: boolean;
  onSave?: () => void;
  saveCount?: number;
  saveLabel?: string;
  headerExtra?: ReactNode;
  beforeTable?: ReactNode;
  afterTable?: ReactNode;
  children: ReactNode;
}

export default function AdminListShell({
  title,
  newHref,
  newLabel,
  saving = false,
  hasChanges = false,
  onSave,
  saveCount = 0,
  saveLabel = "Save",
  headerExtra,
  beforeTable,
  afterTable,
  children,
}: AdminListShellProps) {
  const { setInfinite, lenis, stop, start } = useLenis();

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);
    return () => {
      clearTimeout(timer);
    };
  }, [setInfinite, lenis, stop, start]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.headerActions}>
          {onSave && (
            <button
              className={`${styles.saveBtn} ${hasChanges ? styles.saveBtnVisible : ""}`}
              onClick={onSave}
              disabled={saving || !hasChanges}
            >
              {saving ? "..." : `${saveLabel} (${saveCount})`}
            </button>
          )}
          {headerExtra}
          {!headerExtra && newHref && (
            <Button variant="primary" size="sm" href={newHref} soundDisabled>
              {newLabel}
            </Button>
          )}
        </div>
      </div>

      {beforeTable}

      {children}

      {afterTable}
    </div>
  );
}

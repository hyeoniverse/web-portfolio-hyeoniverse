"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./AdminListShell.module.css";

export { default as adminShellStyles } from "./AdminListShell.module.css";

interface AdminListShellProps {
  title: string;
  newHref: string;
  newLabel: string;
  saving?: boolean;
  hasChanges?: boolean;
  onSave?: () => void;
  saveCount?: number;
  saveLabel?: string;
  beforeTable?: ReactNode;
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
  beforeTable,
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
      setInfinite(true);
    };
  }, [setInfinite, lenis, stop, start]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.headerActions}>
          {hasChanges && onSave && (
            <button
              className={styles.saveBtn}
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "..." : `${saveLabel} (${saveCount})`}
            </button>
          )}
          <Link href={newHref} className={styles.newBtn}>
            {newLabel}
          </Link>
        </div>
      </div>

      {beforeTable}

      {children}
    </div>
  );
}

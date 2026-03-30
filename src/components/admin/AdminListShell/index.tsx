"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const [filterHidden, setFilterHidden] = useState(false);
  const lastScrollY = useRef(0);

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

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 120) {
        setFilterHidden(false);
        lastScrollY.current = y;
        return;
      }
      const delta = y - lastScrollY.current;
      if (delta > 10) setFilterHidden(true);
      else if (delta < -10) setFilterHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`${styles.container} ${filterHidden ? styles.filterHidden : ""}`}>
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
          <Link href={newHref} className={styles.newBtn}>
            {newLabel}
          </Link>
        </div>
      </div>

      {beforeTable}

      {children}

      {afterTable}
    </div>
  );
}

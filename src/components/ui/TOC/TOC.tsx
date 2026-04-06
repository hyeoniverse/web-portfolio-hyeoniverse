"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./TOC.module.css";

export interface TocItem {
  id: string;
  text: string;
  level?: number;
}

interface TOCProps {
  items: TocItem[];
  title?: string;
  position?: "left" | "right";
  scrollOffset?: number;
  className?: string;
}

export default function TOC({
  items,
  title,
  position = "right",
  scrollOffset = -100,
  className,
}: TOCProps) {
  const { lenis } = useLenis();
  const [activeId, setActiveId] = useState("");
  const lockRef = useRef(false);

  /* ── IntersectionObserver 기반 스크롤 감지 ── */
  useEffect(() => {
    if (items.length === 0) return;

    const entriesMap = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        if (lockRef.current) return;

        for (const entry of entries) {
          entriesMap.set(entry.target.id, entry.isIntersecting);
        }

        for (const { id } of items) {
          if (entriesMap.get(id)) {
            setActiveId(id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    const timer = setTimeout(() => {
      for (const { id } of items) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [items]);

  /* ── 클릭 시 스크롤 ── */
  const handleClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (!el) return;

      lockRef.current = true;
      setActiveId(id);

      if (lenis) {
        lenis.scrollTo(el, { offset: scrollOffset, duration: 0.8 });
      } else {
        el.scrollIntoView({ behavior: "smooth" });
      }

      setTimeout(() => { lockRef.current = false; }, 1000);
    },
    [lenis, scrollOffset],
  );

  if (items.length === 0) return null;

  return (
    <nav className={`${styles.toc} ${styles[position]} ${className ?? ""}`}>
      {title && <p className={styles.title}>{title}</p>}
      <ul className={styles.list}>
        {items.map(({ id, text, level = 1 }, idx) => (
          <li key={`${id}-${idx}`}>
            <a
              href={`#${id}`}
              className={`${styles.link} ${level >= 2 ? styles[`level${level}` as keyof typeof styles] ?? "" : ""} ${activeId === id ? styles.active : ""}`}
              onClick={(e) => handleClick(e, id)}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

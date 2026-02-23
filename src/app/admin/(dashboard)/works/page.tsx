"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLenis } from "@/providers/LenisProvider";
import type { Work } from "@/types/work";
import { SkeletonLine } from "@/components/ui/Skeleton";
import styles from "./AdminWorks.module.css";

export default function AdminWorksPage() {
  const { setInfinite, lenis, stop, start } = useLenis();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/works?all=true");
    const data = await res.json();
    setWorks(data.works ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 삭제하시겠습니까?`)) return;
    await fetch(`/api/works/${id}`, { method: "DELETE" });
    fetchWorks();
  };

  const handleTogglePublish = async (work: Work) => {
    await fetch(`/api/works/${work.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !work.published }),
    });
    fetchWorks();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Works</h1>
        <Link href="/admin/works/new" className={styles.newBtn}>
          New Work
        </Link>
      </div>

      {loading ? (
        <AdminWorksSkeleton />
      ) : works.length === 0 ? (
        <p className={styles.empty}>No works yet</p>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span />
            <span>Title</span>
            <span>Status</span>
            <span>Year</span>
            <span>Order</span>
            <span>Actions</span>
          </div>

          {works.map((work) => (
            <div key={work.id} className={styles.row}>
              <div className={styles.colThumb}>
                {work.image ? (
                  <Image
                    src={work.image}
                    alt=""
                    fill
                    sizes="48px"
                    className={styles.thumbImg}
                    unoptimized
                  />
                ) : (
                  <div className={styles.thumbPlaceholder}>—</div>
                )}
              </div>
              <span className={styles.colTitle}>
                <Link
                  href={`/admin/works/${work.id}/edit`}
                  className={styles.workLink}
                >
                  {work.title || "Untitled"}
                </Link>
              </span>
              <span className={styles.colStatus}>
                <button
                  className={`${styles.statusBadge} ${work.published ? styles.published : styles.draft}`}
                  onClick={() => handleTogglePublish(work)}
                >
                  {work.published ? "Published" : "Draft"}
                </button>
              </span>
              <span className={styles.colYear}>{work.year}</span>
              <span className={styles.colOrder}>{work.sort_order}</span>
              <span className={styles.colActions}>
                <Link
                  href={`/admin/works/${work.id}/edit`}
                  className={styles.actionBtn}
                >
                  Edit
                </Link>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(work.id, work.title)}
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Skeleton ── */
const SKELETON_ROWS = 4;

function AdminWorksSkeleton() {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        <span />
        <span>Title</span>
        <span>Status</span>
        <span>Year</span>
        <span>Order</span>
        <span>Actions</span>
      </div>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} className={styles.row} style={{ pointerEvents: "none" }}>
          <div className={styles.colThumb}>
            <div className={styles.thumbPlaceholder} />
          </div>
          <span className={styles.colTitle}>
            <SkeletonLine width={`${55 + (i % 3) * 15}%`} />
          </span>
          <span className={styles.colStatus}>
            <SkeletonLine width="60px" />
          </span>
          <span className={styles.colYear}>
            <SkeletonLine width="40px" />
          </span>
          <span className={styles.colOrder}>
            <SkeletonLine width="24px" />
          </span>
          <span className={styles.colActions}>
            <SkeletonLine width="90px" />
          </span>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import WorkEditor from "@/components/works/WorkEditor";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import { useLenis } from "@/providers/LenisProvider";
import type { Work } from "@/types/work";
import wStyles from "@/components/works/WorkEditor.module.css";

export default function EditWorkPage() {
  const params = useParams();
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { setInfinite } = useLenis();

  useEffect(() => {
    setInfinite(false);
    return () => { setInfinite(true); };
  }, [setInfinite]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/works/${params.id}`);
      if (!res.ok) {
        setError("Work not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setWork(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className={es.container}>
        {/* Top Bar skeleton */}
        <div className={es.topBar}>
          <SkeletonLine width={120} height={20} />
          <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
            <SkeletonLine width={80} height={34} />
            <SkeletonLine width={80} height={34} />
            <SkeletonLine width={80} height={34} />
          </div>
        </div>

        {/* Basic Info */}
        <div className={wStyles.section}>
          <SkeletonLine width={100} height={14} />
          <SkeletonLine width="100%" height={44} />
          <div className={wStyles.row3}>
            <SkeletonLine width="100%" height={34} />
            <SkeletonLine width="100%" height={34} />
            <SkeletonLine width="100%" height={34} />
          </div>
          <div className={es.row}>
            <SkeletonLine width="100%" height={34} />
            <SkeletonLine width="100%" height={34} />
          </div>
          <div className={es.row}>
            <SkeletonLine width="100%" height={34} />
            <SkeletonLine width="100%" height={34} />
          </div>
        </div>

        {/* Description */}
        <div className={wStyles.section}>
          <SkeletonLine width={100} height={14} />
          <SkeletonLine width="100%" height={80} />
        </div>

        {/* Content */}
        <div className={wStyles.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SkeletonLine width={120} height={14} />
            <SkeletonLine width={140} height={30} />
          </div>
          <SkeletonLine width="100%" height={240} />
        </div>

        {/* Tech Stack */}
        <div className={wStyles.section}>
          <SkeletonLine width={80} height={14} />
          <SkeletonLine width="100%" height={34} />
          <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
            <SkeletonLine width={60} height={24} />
            <SkeletonLine width={80} height={24} />
            <SkeletonLine width={50} height={24} />
          </div>
        </div>

        {/* Images */}
        <div className={wStyles.section}>
          <SkeletonLine width={60} height={14} />
          <SkeletonLine width={120} height={70} />
        </div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div style={{ padding: "var(--spacing-3xl)", textAlign: "center", color: "var(--color-accent)" }}>
        {error || "Work not found"}
      </div>
    );
  }

  return <WorkEditor work={work} />;
}
